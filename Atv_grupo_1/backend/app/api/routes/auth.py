from fastapi import APIRouter, status

from app.api.deps import AuthServiceDep, TokenAtual, UsuarioAtual
from app.models.usuario import Usuario
from app.schemas.usuario import (
    AlterarSenhaRequest,
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
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


@router.post("/refresh", response_model=TokenResponse)
def renovar_token(token: TokenAtual, service: AuthServiceDep) -> TokenResponse:
    return service.renovar_token(token)


@router.get("/me", response_model=UsuarioResponse)
def obter_usuario_logado(usuario: UsuarioAtual) -> Usuario:
    return usuario


@router.patch("/me", response_model=UsuarioResponse)
def atualizar_perfil_usuario(
    dados: UsuarioUpdate, usuario: UsuarioAtual, service: AuthServiceDep
) -> Usuario:
    return service.atualizar_perfil(usuario, dados)


@router.patch("/me/senha", status_code=status.HTTP_204_NO_CONTENT)
def alterar_senha_usuario(
    dados: AlterarSenhaRequest, usuario: UsuarioAtual, service: AuthServiceDep
) -> None:
    service.alterar_senha(usuario, dados)
