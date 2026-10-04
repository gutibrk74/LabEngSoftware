from app.core.exceptions import (
    AcessoNegadoError,
    ConflitoError,
    DadosInvalidosError,
    NaoAutenticadoError,
)
from app.core.security import (
    criar_token_acesso,
    decodificar_token,
    gerar_hash_senha,
    verificar_senha,
)
from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.usuario import (
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioResponse,
)


def normalizar_apenas_digitos(valor: str) -> str:
    return "".join(caractere for caractere in valor if caractere.isdigit())


class AuthService:
    def __init__(self, repositorio: UsuarioRepository) -> None:
        self._repositorio = repositorio

    def cadastrar(self, dados: UsuarioCreate) -> Usuario:
        email = str(dados.email).strip().lower()
        cpf = normalizar_apenas_digitos(dados.cpf)
        telefone = normalizar_apenas_digitos(dados.telefone)

        if len(cpf) != 11:
            raise DadosInvalidosError("CPF deve conter 11 dígitos.")

        if len(telefone) not in (10, 11):
            raise DadosInvalidosError("Telefone deve conter 10 ou 11 dígitos.")

        if self._repositorio.buscar_por_email(email):
            raise ConflitoError("Já existe um usuário com este e-mail.")

        if self._repositorio.buscar_por_cpf(cpf):
            raise ConflitoError("Já existe um usuário com este CPF.")

        usuario = Usuario(
            nome=dados.nome.strip(),
            email=email,
            telefone=telefone,
            cpf=cpf,
            cidade=dados.cidade.strip(),
            senha_hash=gerar_hash_senha(dados.senha),
        )

        return self._repositorio.adicionar(usuario)

    def autenticar(self, dados: LoginRequest) -> TokenResponse:
        email = str(dados.email).strip().lower()
        usuario = self._repositorio.buscar_por_email(email)

        if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
            raise NaoAutenticadoError("E-mail ou senha inválidos.")

        if not usuario.ativo:
            raise AcessoNegadoError("Usuário inativo.")

        return TokenResponse(
            access_token=criar_token_acesso(usuario.id, usuario.perfil),
            token_type="bearer",
            usuario=UsuarioResponse.model_validate(usuario),
        )

    def obter_usuario_do_token(self, token: str) -> Usuario:
        dados_token = decodificar_token(token)

        if dados_token is None:
            raise NaoAutenticadoError("Sessão inválida ou expirada.")

        usuario = self._repositorio.buscar_por_id(dados_token.usuario_id)

        if usuario is None or not usuario.ativo:
            raise NaoAutenticadoError("Sessão inválida ou expirada.")

        return usuario
