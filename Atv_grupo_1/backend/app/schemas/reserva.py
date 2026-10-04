from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.reserva import StatusReserva


class HorarioGrade(BaseModel):
    horario: int
    disponivel: bool
    valor: float


class GradeHorariosResponse(BaseModel):
    quadra_id: int
    data: date
    horarios: list[HorarioGrade]


class ReservaCreate(BaseModel):
    quadra_id: int
    data: date
    horario: int = Field(ge=0, le=23)
    # Valor que o usuário viu na revisão; se o preço mudou, a reserva é
    # recusada para ele revisar de novo.
    valor_esperado: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class ReservaResponse(BaseModel):
    id: int
    quadra_id: int
    data: date
    horario: int
    valor: float
    status: StatusReserva
    criado_em: datetime

    model_config = {"from_attributes": True}
