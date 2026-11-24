from datetime import date, datetime

from app.core.exceptions import (
    ConflitoError,
    DadosInvalidosError,
    NaoEncontradoError,
)
from app.core.tempo import agora
from app.models.reserva import Reserva, StatusReserva
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.reserva import ReservaAdminResponse
from app.services.quadra_service import QuadraService

# Mudanças de status que o administrador pode fazer (US07).
# - pendente -> paga: registra o pagamento (a qualquer momento).
# - paga -> pendente: desfaz um pagamento marcado por engano.
# - pendente/paga -> cancelada: sem a antecedência mínima do atleta.
# - cancelada -> pendente: reativa; para pagar, depois pendente -> paga.
TRANSICOES_PERMITIDAS: dict[str, set[str]] = {
    "pendente": {"paga", "cancelada"},
    "paga": {"pendente", "cancelada"},
    "cancelada": {"pendente"},
}


class ReservaAdminService:
    def __init__(
        self, repositorio: ReservaRepository, quadra_service: QuadraService
    ) -> None:
        self._repositorio = repositorio
        self._quadra_service = quadra_service

    def listar(
        self,
        inicio: date | None = None,
        fim: date | None = None,
        quadra_id: int | None = None,
        status: StatusReserva | None = None,
    ) -> list[ReservaAdminResponse]:
        if inicio is not None and fim is not None and inicio > fim:
            raise DadosInvalidosError(
                "A data inicial deve ser anterior ou igual à final."
            )

        registros = self._repositorio.listar_para_admin(
            inicio=inicio, fim=fim, quadra_id=quadra_id, status=status
        )

        return [
            ReservaAdminResponse(
                id=reserva.id,
                quadra_id=reserva.quadra_id,
                quadra_nome=quadra_nome,
                quadra_esporte=quadra_esporte,
                usuario_id=reserva.usuario_id,
                atleta_nome=atleta_nome,
                atleta_email=atleta_email,
                data=reserva.data,
                horario=reserva.horario,
                valor=float(reserva.valor),
                status=reserva.status,
                criado_em=reserva.criado_em,
            )
            for (
                reserva,
                quadra_nome,
                quadra_esporte,
                atleta_nome,
                atleta_email,
            ) in registros
        ]

    def alterar_status(
        self, reserva_id: int, novo_status: StatusReserva
    ) -> Reserva:
        reserva = self._repositorio.buscar_por_id(reserva_id)

        if reserva is None:
            raise NaoEncontradoError("Reserva não encontrada.")

        if reserva.status == novo_status:
            raise ConflitoError(f"Esta reserva já está {novo_status}.")

        if novo_status not in TRANSICOES_PERMITIDAS[reserva.status]:
            raise DadosInvalidosError(
                "Uma reserva cancelada só pode voltar para pendente."
            )

        if reserva.status == "cancelada":
            self._validar_reativacao(reserva)

        reserva.status = novo_status
        # Reativar pode disputar o horário com uma reserva nova: o
        # repositório converte o índice único do banco em 409.
        return self._repositorio.salvar(reserva)

    def _validar_reativacao(self, reserva: Reserva) -> None:
        momento = agora()
        inicio = datetime(
            reserva.data.year,
            reserva.data.month,
            reserva.data.day,
            reserva.horario,
            tzinfo=momento.tzinfo,
        )

        if inicio <= momento:
            raise DadosInvalidosError(
                "Não é possível reativar uma reserva cujo horário já começou."
            )

        quadra = self._quadra_service.obter(
            reserva.quadra_id, incluir_inativas=True
        )
        if not quadra.ativa:
            raise DadosInvalidosError(
                "Não é possível reativar: a quadra está inativa."
            )
