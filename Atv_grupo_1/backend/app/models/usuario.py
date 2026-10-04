from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


PERFIL_USUARIO = "usuario"
PERFIL_ADMINISTRADOR = "administrador"


class Usuario(Base):
    __tablename__ = "usuarios"

    __table_args__ = (
        UniqueConstraint("email", name="uq_usuarios_email"),
        UniqueConstraint("cpf", name="uq_usuarios_cpf"),
        CheckConstraint(
            "perfil IN ('usuario', 'administrador')",
            name="ck_usuarios_perfil",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    telefone: Mapped[str] = mapped_column(String(11), nullable=False)
    cpf: Mapped[str] = mapped_column(String(11), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)

    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    perfil: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="usuario",
    )

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )