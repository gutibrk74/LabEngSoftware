from datetime import datetime
from decimal import Decimal
from typing import Literal, get_args

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


TipoEsporte = Literal["futebol", "futsal", "tenis", "volei", "basquete"]
ESPORTES: tuple[str, ...] = get_args(TipoEsporte)


class Quadra(Base):
    __tablename__ = "quadras"

    __table_args__ = (
        # Nome único sem diferenciar maiúsculas ("Arena" = "arena").
        Index("uq_quadras_nome_lower", text("lower(nome)"), unique=True),
        CheckConstraint(
            f"tipo_esporte IN ({', '.join(repr(e) for e in ESPORTES)})",
            name="ck_quadras_tipo_esporte",
        ),
        CheckConstraint("preco_hora > 0", name="ck_quadras_preco_hora"),
        CheckConstraint(
            "comprimento_m > 0 AND largura_m > 0",
            name="ck_quadras_dimensoes",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_esporte: Mapped[str] = mapped_column(String(20), nullable=False)
    piso: Mapped[str] = mapped_column(String(60), nullable=False)

    comprimento_m: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    largura_m: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    # Valor base; as regras por dia/horário ficam na US09.
    preco_hora: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    coberta: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    iluminacao: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    replay: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    vestiario: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    ativa: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
