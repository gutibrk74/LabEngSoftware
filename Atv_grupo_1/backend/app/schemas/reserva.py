from datetime import date

from pydantic import BaseModel


class HorarioGrade(BaseModel):
    horario: int
    disponivel: bool
    valor: float


class GradeHorariosResponse(BaseModel):
    quadra_id: int
    data: date
    horarios: list[HorarioGrade]
