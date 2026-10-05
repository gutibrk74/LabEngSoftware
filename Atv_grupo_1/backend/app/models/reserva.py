from datetime import date, datetime
from decimal import Decimal
from typing import Literal, get_args

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


StatusReserva = Literal["pendente", "paga", "cancelada"]
STATUS_RESERVA: tuple[str, ...] = get_args(StatusReserva)


class Reserva(Base):
    __tablename__ = "reservas"

    __table_args__ = (
        # Garante no banco que um horário só tem uma reserva ativa, mesmo com
        # dois pedidos simultâneos. Reservas canceladas liberam o horário.
        Index(
            "uq_reservas_quadra_data_horario",
            "quadra_id",
            "data",
            "horario",
            unique=True,
            postgresql_where=text("status <> 'cancelada'"),
        ),
        CheckConstraint(
            f"status IN ({', '.join(repr(s) for s in STATUS_RESERVA)})",
            name="ck_reservas_status",
        ),
        CheckConstraint(
            "horario >= 0 AND horario <= 23",
            name="ck_reservas_horario",
        ),
        CheckConstraint("valor > 0", name="ck_reservas_valor"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"), nullable=False, index=True
    )
    quadra_id: Mapped[int] = mapped_column(
        ForeignKey("quadras.id"), nullable=False
    )

    data: Mapped[date] = mapped_column(Date, nullable=False)
    # Hora de início; cada reserva dura 1 hora (ex.: 19 = 19h às 20h).
    horario: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # Preço da hora no momento da reserva (não muda se a quadra mudar).
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pendente"
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
