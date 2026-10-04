from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioResponse
from app.core.security import gerar_hash_senha


router = APIRouter(prefix="/auth", tags=["Autenticação"])


def normalizar_apenas_digitos(valor: str) -> str:
    return "".join(caractere for caractere in valor if caractere.isdigit())


@router.post(
    "/register",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def cadastrar_usuario(
    dados: UsuarioCreate,
    db: Session = Depends(get_db),
):
    email = str(dados.email).strip().lower()
    cpf = normalizar_apenas_digitos(dados.cpf)
    telefone = normalizar_apenas_digitos(dados.telefone)

    if len(cpf) != 11:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CPF deve conter 11 dígitos.",
        )

    if len(telefone) not in (10, 11):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Telefone deve conter 10 ou 11 dígitos.",
        )

    usuario_existente = db.scalar(
        select(Usuario).where(Usuario.email == email)
    )

    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário com este e-mail.",
        )

    cpf_existente = db.scalar(
        select(Usuario).where(Usuario.cpf == cpf)
    )

    if cpf_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário com este CPF.",
        )

    usuario = Usuario(
        nome=dados.nome.strip(),
        email=email,
        telefone=telefone,
        cpf=cpf,
        cidade=dados.cidade.strip(),
        senha_hash=gerar_hash_senha(dados.senha),
    )

    try:
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail ou CPF já cadastrado.",
        ) from None

    return usuario