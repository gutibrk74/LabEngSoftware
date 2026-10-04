from fastapi import APIRouter, status

from app.api.deps import AuthServiceDep, UsuarioAtual
from app.models.usuario import Usuario
from app.schemas.usuario import (
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioResponse,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post(
    "/register",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def cadastrar_usuario(dados: UsuarioCreate, service: AuthServiceDep) -> Usuario:
    return service.cadastrar(dados)


@router.post("/login", response_model=TokenResponse)
def fazer_login(dados: LoginRequest, service: AuthServiceDep) -> TokenResponse:
    return service.autenticar(dados)


@router.get("/me", response_model=UsuarioResponse)
def obter_usuario_logado(usuario: UsuarioAtual) -> Usuario:
    return usuario
