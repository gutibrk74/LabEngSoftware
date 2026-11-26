from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from uuid import uuid4

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()


@dataclass(frozen=True)
class DadosToken:
    usuario_id: int
    perfil: str
    sessao_id: str | None = None


def gerar_hash_senha(senha: str) -> str:
    return password_hash.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return password_hash.verify(senha, senha_hash)


def criar_token_acesso(
    usuario_id: int, perfil: str, sessao_id: str | None = None
) -> str:
    expiracao = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(usuario_id),
        "perfil": perfil,
        "exp": expiracao,
        "sid": sessao_id or str(uuid4()),
        "jti": str(uuid4()),
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decodificar_token(token: str) -> DadosToken | None:
    """Valida assinatura e expiração. Retorna None se o token for inválido."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require_exp": True},
        )
        return DadosToken(
            usuario_id=int(payload["sub"]),
            perfil=str(payload["perfil"]),
            sessao_id=payload.get("sid"),
        )
    except (JWTError, KeyError, ValueError):
        return None
