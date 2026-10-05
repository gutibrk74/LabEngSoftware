"""Funções e dados auxiliares usados pelos testes."""

from datetime import datetime
from typing import Any

from fastapi.testclient import TestClient

from app.core.tempo import FUSO_HORARIO
from app.db.session import SessionLocal
from app.models import Usuario
from app.models.usuario import PERFIL_ADMINISTRADOR

# Momento fixo usado nos testes de horário: sábado, 10/10/2026, 15h30 (SP).
AGORA_PADRAO = datetime(2026, 10, 10, 15, 30, tzinfo=FUSO_HORARIO)

Cabecalho = dict[str, str]


def dados_cadastro(email: str, cpf: str, **extras: str) -> dict[str, str]:
    return {
        "nome": "Usuário de Teste",
        "email": email,
        "telefone": "(21) 99999-0000",
        "cpf": cpf,
        "cidade": "Rio de Janeiro",
        "senha": "senha1234",
        "confirmar_senha": "senha1234",
        **extras,
    }


def login(client: TestClient, email: str, senha: str = "senha1234") -> Cabecalho:
    resposta = client.post("/auth/login", json={"email": email, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}


def tornar_admin(email: str) -> None:
    with SessionLocal() as db:
        usuario = db.query(Usuario).filter_by(email=email).one()
        usuario.perfil = PERFIL_ADMINISTRADOR
        db.commit()


def dados_quadra(**extras: Any) -> dict[str, Any]:
    return {
        "nome": "Quadra de Tênis A",
        "tipo_esporte": "tenis",
        "piso": "Saibro",
        "comprimento_m": 23.77,
        "largura_m": 10.97,
        "preco_hora": 80,
        **extras,
    }
