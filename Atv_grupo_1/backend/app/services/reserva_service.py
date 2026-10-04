from datetime import date, timedelta

from app.core.exceptions import DadosInvalidosError
from app.core.tempo import agora
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.reserva import GradeHorariosResponse, HorarioGrade
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
                # Horário de hoje que já começou não pode mais ser reservado.
                disponivel=hora not in ocupados
                and not (data == momento.date() and hora <= momento.hour),
                valor=float(quadra.preco_hora),
            )
            for hora in range(quadra.hora_abertura, quadra.hora_fechamento)
        ]

        return GradeHorariosResponse(
            quadra_id=quadra.id, data=data, horarios=horarios
        )

    def _validar_data(self, data: date) -> None:
        hoje = agora().date()

        if data < hoje:
            raise DadosInvalidosError("Não é possível usar uma data passada.")

        if data > hoje + timedelta(days=DIAS_ANTECEDENCIA_MAXIMA):
            raise DadosInvalidosError(
                "Só é possível reservar com até "
                f"{DIAS_ANTECEDENCIA_MAXIMA} dias de antecedência."
            )
