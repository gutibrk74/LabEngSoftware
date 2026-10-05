"""Configuração comum dos testes.

Os testes usam um banco PostgreSQL separado (por padrão
"reserva_quadras_test", ou o definido em TEST_DB_NAME), criado e migrado
automaticamente. As tabelas são esvaziadas antes de cada teste, então o
banco de desenvolvimento nunca é tocado.
"""

import os

# Precisa vir antes de importar a aplicação: a configuração é lida no import.
os.environ["DB_NAME"] = os.environ.get("TEST_DB_NAME", "reserva_quadras_test")

from collections.abc import Callable, Iterator
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy import text

import app.services.reserva_service as reserva_service
from app.core.config import settings
from app.db.session import engine
from app.main import app
from apoio import (
    AGORA_PADRAO,
    Cabecalho,
    dados_cadastro,
    dados_quadra,
    login,
    tornar_admin,
)

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _criar_banco_de_teste() -> None:
    with psycopg.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD.get_secret_value(),
        dbname="postgres",
        autocommit=True,
    ) as conexao:
        existe = conexao.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (settings.DB_NAME,),
        ).fetchone()

        if not existe:
            conexao.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(settings.DB_NAME)
                )
            )


@pytest.fixture(scope="session", autouse=True)
def banco_de_teste() -> Iterator[None]:
    # Proteção: nunca rodar contra o banco de desenvolvimento.
    assert settings.DB_NAME.endswith("_test"), settings.DB_NAME

    _criar_banco_de_teste()
    command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")
    yield


@pytest.fixture(autouse=True)
def limpar_tabelas(banco_de_teste: None) -> None:
    with engine.begin() as conexao:
        conexao.execute(
            text("TRUNCATE reservas, quadras, usuarios RESTART IDENTITY CASCADE")
        )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def relogio(monkeypatch: pytest.MonkeyPatch) -> Callable[..., None]:
    """Fixa o "agora" das regras de reserva.

    relogio(momento) fixa um instante; relogio(m1, m2, ...) devolve um
    instante por leitura (o último se repete).
    """

    def fixar(*momentos: datetime) -> None:
        fila = list(momentos or [AGORA_PADRAO])

        def agora() -> datetime:
            return fila.pop(0) if len(fila) > 1 else fila[0]

        monkeypatch.setattr(reserva_service, "agora", agora)

    fixar(AGORA_PADRAO)
    return fixar


@pytest.fixture
def atleta(client: TestClient) -> Cabecalho:
    resposta = client.post(
        "/auth/register", json=dados_cadastro("atleta@teste.com", "11111111111")
    )
    assert resposta.status_code == 201, resposta.text
    return login(client, "atleta@teste.com")


@pytest.fixture
def outro_atleta(client: TestClient) -> Cabecalho:
    resposta = client.post(
        "/auth/register", json=dados_cadastro("outro@teste.com", "22222222222")
    )
    assert resposta.status_code == 201, resposta.text
    return login(client, "outro@teste.com")


@pytest.fixture
def admin(client: TestClient) -> Cabecalho:
    resposta = client.post(
        "/auth/register", json=dados_cadastro("admin@teste.com", "33333333333")
    )
    assert resposta.status_code == 201, resposta.text
    tornar_admin("admin@teste.com")
    return login(client, "admin@teste.com")


@pytest.fixture
def criar_quadra(
    client: TestClient, admin: Cabecalho
) -> Callable[..., dict[str, Any]]:
    """Cadastra uma quadra pela API de admin e devolve a resposta."""

    def criar(**extras: Any) -> dict[str, Any]:
        resposta = client.post(
            "/admin/quadras", json=dados_quadra(**extras), headers=admin
        )
        assert resposta.status_code == 201, resposta.text
        return dict(resposta.json())

    return criar
