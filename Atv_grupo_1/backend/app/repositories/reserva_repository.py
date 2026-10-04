from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reserva import Reserva


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
