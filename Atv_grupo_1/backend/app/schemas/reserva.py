from datetime import date, datetime

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


class ReservaResponse(BaseModel):
    id: int
    quadra_id: int
    data: date
    horario: int
    valor: float
    status: StatusReserva
    criado_em: datetime

    model_config = {"from_attributes": True}
