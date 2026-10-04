from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import NaoAutenticadoError
from app.db.session import get_db
from app.models.usuario import Usuario
from app.repositories.quadra_repository import QuadraRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.services.auth_service import AuthService
from app.services.quadra_service import QuadraService


bearer_scheme = HTTPBearer(auto_error=False)


def get_usuario_repository(
    db: Annotated[Session, Depends(get_db)],
) -> UsuarioRepository:
    return UsuarioRepository(db)


def get_auth_service(
    repositorio: Annotated[UsuarioRepository, Depends(get_usuario_repository)],
) -> AuthService:
    return AuthService(repositorio)


def get_usuario_atual(
    credenciais: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> Usuario:
    if credenciais is None:
        raise NaoAutenticadoError("Autenticação necessária.")

    return service.obter_usuario_do_token(credenciais.credentials)


def get_administrador_atual(
    usuario: Annotated[Usuario, Depends(get_usuario_atual)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> Usuario:
    return service.garantir_administrador(usuario)


def get_quadra_service(
    db: Annotated[Session, Depends(get_db)],
) -> QuadraService:
    return QuadraService(QuadraRepository(db))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
QuadraServiceDep = Annotated[QuadraService, Depends(get_quadra_service)]
UsuarioAtual = Annotated[Usuario, Depends(get_usuario_atual)]
AdministradorAtual = Annotated[Usuario, Depends(get_administrador_atual)]
