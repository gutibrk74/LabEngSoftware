from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.usuario_repository import UsuarioRepository
from app.services.auth_service import AuthService


def get_usuario_repository(
    db: Annotated[Session, Depends(get_db)],
) -> UsuarioRepository:
    return UsuarioRepository(db)


def get_auth_service(
    repositorio: Annotated[UsuarioRepository, Depends(get_usuario_repository)],
) -> AuthService:
    return AuthService(repositorio)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
