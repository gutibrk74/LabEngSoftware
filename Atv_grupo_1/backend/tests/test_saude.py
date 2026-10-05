from fastapi.testclient import TestClient

from app.core.config import settings


def test_api_responde(client: TestClient) -> None:
    resposta = client.get("/health")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}


def test_usa_banco_separado_de_testes() -> None:
    assert settings.DB_NAME.endswith("_test")
