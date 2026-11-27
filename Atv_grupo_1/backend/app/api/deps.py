from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import NaoAutenticadoError
from app.db.session import get_db
from app.models.usuario import Usuario
from app.repositories.quadra_repository import QuadraRepository
from app.repositories.reserva_repository import ReservaRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.services.auth_service import AuthService
from app.services.metricas_service import MetricasService
from app.services.quadra_service import QuadraService
from app.services.reserva_admin_service import ReservaAdminService
from app.services.reserva_service import ReservaService


bearer_scheme = HTTPBearer(auto_error=False)


def get_usuario_repository(
    db: Annotated[Session, Depends(get_db)],
) -> UsuarioRepository:
    return UsuarioRepository(db)


def get_auth_service(
    repositorio: Annotated[UsuarioRepository, Depends(get_usuario_repository)],
) -> AuthService:
    return AuthService(repositorio)


def get_token_atual(
    credenciais: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> str:
    if credenciais is None:
        raise NaoAutenticadoError("Autenticação necessária.")

    return credenciais.credentials


TokenAtual = Annotated[str, Depends(get_token_atual)]


def get_usuario_atual(
    token: TokenAtual,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> Usuario:
    return service.obter_usuario_do_token(token)


def get_administrador_atual(
    usuario: Annotated[Usuario, Depends(get_usuario_atual)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> Usuario:
    return service.garantir_administrador(usuario)


def get_quadra_service(
    db: Annotated[Session, Depends(get_db)],
) -> QuadraService:
    return QuadraService(QuadraRepository(db))


def get_reserva_service(
    db: Annotated[Session, Depends(get_db)],
) -> ReservaService:
    return ReservaService(
        ReservaRepository(db), QuadraService(QuadraRepository(db))
    )


def get_reserva_admin_service(
    db: Annotated[Session, Depends(get_db)],
) -> ReservaAdminService:
    return ReservaAdminService(
        ReservaRepository(db), QuadraService(QuadraRepository(db))
    )


def get_metricas_service(
    db: Annotated[Session, Depends(get_db)],
) -> MetricasService:
    return MetricasService(
        ReservaRepository(db), QuadraService(QuadraRepository(db))
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
QuadraServiceDep = Annotated[QuadraService, Depends(get_quadra_service)]
ReservaServiceDep = Annotated[ReservaService, Depends(get_reserva_service)]
ReservaAdminServiceDep = Annotated[
    ReservaAdminService, Depends(get_reserva_admin_service)
]
MetricasServiceDep = Annotated[MetricasService, Depends(get_metricas_service)]
UsuarioAtual = Annotated[Usuario, Depends(get_usuario_atual)]
AdministradorAtual = Annotated[Usuario, Depends(get_administrador_atual)]
