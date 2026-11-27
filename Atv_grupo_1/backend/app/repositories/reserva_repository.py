from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflitoError
from app.models.quadra import Quadra
from app.models.reserva import Reserva
from app.models.usuario import Usuario
from app.repositories.integridade import constraint_violada

INDICE_HORARIO_UNICO = "uq_reservas_quadra_data_horario"


class ReservaRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def horarios_ocupados(self, quadra_id: int, data: date) -> set[int]:
        consulta = select(Reserva.horario).where(
            Reserva.quadra_id == quadra_id,
            Reserva.data == data,
            Reserva.status != "cancelada",
        )
        return set(self._db.scalars(consulta))

    def horarios_ocupados_por_quadra(self, data: date) -> dict[int, set[int]]:
        consulta = select(Reserva.quadra_id, Reserva.horario).where(
            Reserva.data == data,
            Reserva.status != "cancelada",
        )
        ocupados: dict[int, set[int]] = {}

        for quadra_id, horario in self._db.execute(consulta):
            ocupados.setdefault(quadra_id, set()).add(horario)

        return ocupados

    def buscar_por_id(self, reserva_id: int) -> Reserva | None:
        return self._db.get(Reserva, reserva_id)

    def listar_por_usuario(
        self, usuario_id: int
    ) -> list[tuple[Reserva, str, str]]:
        # Traz junto o nome e o esporte da quadra para evitar consultas extras
        consulta = (
            select(Reserva, Quadra.nome, Quadra.tipo_esporte)
            .join(Quadra, Reserva.quadra_id == Quadra.id)
            .where(Reserva.usuario_id == usuario_id)
            .order_by(Reserva.data.desc(), Reserva.horario.desc())
        )
        return list(self._db.execute(consulta).all())

    def listar_para_admin(
        self,
        inicio: date | None = None,
        fim: date | None = None,
        quadra_id: int | None = None,
        status: str | None = None,
    ) -> list[tuple[Reserva, str, str, str, str]]:
        # Traz junto quadra (nome, esporte) e atleta (nome, e-mail) numa
        # consulta só, em ordem de agenda.
        consulta = (
            select(
                Reserva,
                Quadra.nome,
                Quadra.tipo_esporte,
                Usuario.nome,
                Usuario.email,
            )
            .join(Quadra, Reserva.quadra_id == Quadra.id)
            .join(Usuario, Reserva.usuario_id == Usuario.id)
            .order_by(Reserva.data, Reserva.horario, Quadra.nome)
        )

        if inicio is not None:
            consulta = consulta.where(Reserva.data >= inicio)
        if fim is not None:
            consulta = consulta.where(Reserva.data <= fim)
        if quadra_id is not None:
            consulta = consulta.where(Reserva.quadra_id == quadra_id)
        if status is not None:
            consulta = consulta.where(Reserva.status == status)

        return list(self._db.execute(consulta).all())

    def agregar_por_quadra_e_status(
        self, inicio: date, fim: date
    ) -> list[tuple[int, str, int, Decimal]]:
        # Quantidade e soma dos valores (preço do momento da reserva) por
        # quadra e status, para as reservas com o jogo dentro do período.
        consulta = (
            select(
                Reserva.quadra_id,
                Reserva.status,
                func.count(Reserva.id),
                func.sum(Reserva.valor),
            )
            .where(Reserva.data >= inicio, Reserva.data <= fim)
            .group_by(Reserva.quadra_id, Reserva.status)
        )
        return list(self._db.execute(consulta).all())

    def adicionar(self, reserva: Reserva) -> Reserva:
        self._db.add(reserva)
        return self._confirmar(reserva)

    def cancelar(self, reserva: Reserva) -> Reserva:
        reserva.status = "cancelada"
        return self._confirmar(reserva)

    def salvar(self, reserva: Reserva) -> Reserva:
        # Usado nas mudanças de status feitas pelo administrador; reativar
        # uma reserva cancelada pode bater no índice de horário único.
        return self._confirmar(reserva)

    def _confirmar(self, reserva: Reserva) -> Reserva:
        # Toda gravação de reserva passa por aqui, para que qualquer caminho
        # que deixe uma reserva ativa (criar, reativar...) tenha o mesmo
        # tratamento do índice de horário único.
        try:
            self._db.commit()
        except Exception as erro:
            # Desfaz em qualquer falha, para a sessão continuar utilizável.
            self._db.rollback()

            # Só o índice de horário vira 409; outros erros seguem adiante.
            if (
                isinstance(erro, IntegrityError)
                and constraint_violada(erro) == INDICE_HORARIO_UNICO
            ):
                raise ConflitoError("Esse horário já foi reservado.") from None
            raise

        self._db.refresh(reserva)
        return reserva