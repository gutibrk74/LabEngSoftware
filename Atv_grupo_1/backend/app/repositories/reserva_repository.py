from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflitoError
from app.models.reserva import Reserva

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

    def adicionar(self, reserva: Reserva) -> Reserva:
        try:
            self._db.add(reserva)
            self._db.commit()
        except IntegrityError as erro:
            self._db.rollback()

            # Só o índice de horário vira 409; outros erros seguem adiante.
            if INDICE_HORARIO_UNICO in str(erro.orig):
                raise ConflitoError("Esse horário já foi reservado.") from None
            raise

        self._db.refresh(reserva)
        return reserva
