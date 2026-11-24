from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflitoError
from app.models.quadra import Quadra
from app.models.reserva import Reserva
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

    def adicionar(self, reserva: Reserva) -> Reserva:
        self._db.add(reserva)
        return self._confirmar(reserva)

    def cancelar(self, reserva: Reserva) -> Reserva:
        reserva.status = "cancelada"
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