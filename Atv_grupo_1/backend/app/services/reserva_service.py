from datetime import date, datetime, timedelta

from app.core.exceptions import DadosInvalidosError
from app.core.tempo import agora
from app.models.reserva import Reserva
from app.models.usuario import Usuario
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.reserva import (
    GradeHorariosResponse,
    HorarioGrade,
    ReservaCreate,
)
from app.services.quadra_service import QuadraService

# Até quantos dias à frente é possível consultar e reservar.
DIAS_ANTECEDENCIA_MAXIMA = 30


class ReservaService:
    def __init__(
        self, repositorio: ReservaRepository, quadra_service: QuadraService
    ) -> None:
        self._repositorio = repositorio
        self._quadra_service = quadra_service

    def montar_grade(self, quadra_id: int, data: date) -> GradeHorariosResponse:
        quadra = self._quadra_service.obter(quadra_id)
        self._validar_data(data)

        momento = agora()
        ocupados = self._repositorio.horarios_ocupados(quadra_id, data)

        horarios = [
            HorarioGrade(
                horario=hora,
                disponivel=hora not in ocupados
                and not self._ja_comecou(data, hora, momento),
                valor=float(quadra.preco_hora),
            )
            for hora in range(quadra.hora_abertura, quadra.hora_fechamento)
        ]

        return GradeHorariosResponse(
            quadra_id=quadra.id, data=data, horarios=horarios
        )

    def reservar(self, usuario: Usuario, dados: ReservaCreate) -> Reserva:
        quadra = self._quadra_service.obter(dados.quadra_id)
        self._validar_data(dados.data)

        if not quadra.hora_abertura <= dados.horario < quadra.hora_fechamento:
            raise DadosInvalidosError("A quadra não funciona nesse horário.")

        if self._ja_comecou(dados.data, dados.horario, agora()):
            raise DadosInvalidosError("Esse horário já começou.")

        reserva = Reserva(
            usuario_id=usuario.id,
            quadra_id=quadra.id,
            data=dados.data,
            horario=dados.horario,
            valor=quadra.preco_hora,
        )

        # O índice único do banco garante que só um pedido fica com o
        # horário, mesmo que dois cheguem ao mesmo tempo.
        return self._repositorio.adicionar(reserva)

    def _ja_comecou(self, data: date, hora: int, momento: datetime) -> bool:
        return data == momento.date() and hora <= momento.hour

    def _validar_data(self, data: date) -> None:
        hoje = agora().date()

        if data < hoje:
            raise DadosInvalidosError("Não é possível usar uma data passada.")

        if data > hoje + timedelta(days=DIAS_ANTECEDENCIA_MAXIMA):
            raise DadosInvalidosError(
                "Só é possível reservar com até "
                f"{DIAS_ANTECEDENCIA_MAXIMA} dias de antecedência."
            )
