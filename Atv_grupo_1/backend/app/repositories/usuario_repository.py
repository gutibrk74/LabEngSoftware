from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflitoError
from app.models.usuario import Usuario


class UsuarioRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def buscar_por_id(self, usuario_id: int) -> Usuario | None:
        return self._db.get(Usuario, usuario_id)

    def buscar_por_email(self, email: str) -> Usuario | None:
        return self._db.scalar(select(Usuario).where(Usuario.email == email))

    def buscar_por_cpf(self, cpf: str) -> Usuario | None:
        return self._db.scalar(select(Usuario).where(Usuario.cpf == cpf))

    def adicionar(self, usuario: Usuario) -> Usuario:
        try:
            self._db.add(usuario)
            self._db.commit()
        except IntegrityError:
            self._db.rollback()
            raise ConflitoError("E-mail ou CPF já cadastrado.") from None

        self._db.refresh(usuario)
        return usuario

    def salvar(self, usuario: Usuario) -> Usuario:
        self._db.commit()
        self._db.refresh(usuario)
        return usuario
