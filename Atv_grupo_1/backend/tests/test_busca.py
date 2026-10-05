"""US03 — Busca de quadras por esporte e data.

Relógio fixo em sábado, 10/10/2026, 15h30 (horário de São Paulo).
"""

from collections.abc import Callable
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient

from apoio import Cabecalho
from app.db.session import SessionLocal
from app.models import Reserva, Usuario

CriarQuadra = Callable[..., dict[str, Any]]


def nomes(resposta: Any) -> list[str]:
    return [quadra["nome"] for quadra in resposta.json()]


def reservar_direto(quadra_id: int, dia: date, horas: range, status: str) -> None:
    with SessionLocal() as db:
        usuario = db.query(Usuario).first()
        assert usuario is not None
        db.add_all(
            Reserva(
                usuario_id=usuario.id,
                quadra_id=quadra_id,
                data=dia,
                horario=hora,
                valor=80,
                status=status,
            )
            for hora in horas
        )
        db.commit()


@pytest.fixture
def quadras(
    criar_quadra: CriarQuadra, relogio: Callable[..., None]
) -> dict[str, dict[str, Any]]:
    return {
        "lotada": criar_quadra(
            nome="Tênis Lotada", hora_abertura=18, hora_fechamento=20
        ),
        "livre": criar_quadra(nome="Tênis Livre"),
        "society": criar_quadra(
            nome="Society", tipo_esporte="futebol", piso="Grama", preco_hora=150
        ),
        "manha": criar_quadra(
            nome="Vôlei Manhã",
            tipo_esporte="volei",
            piso="Areia",
            hora_abertura=8,
            hora_fechamento=14,
        ),
    }


def test_sem_filtros_lista_todas_as_ativas(
    client: TestClient, quadras: dict[str, Any]
) -> None:
    assert nomes(client.get("/quadras")) == [
        "Society",
        "Tênis Livre",
        "Tênis Lotada",
        "Vôlei Manhã",
    ]


def test_filtra_por_esporte(client: TestClient, quadras: dict[str, Any]) -> None:
    resposta = client.get("/quadras", params={"esporte": "tenis"})

    assert nomes(resposta) == ["Tênis Livre", "Tênis Lotada"]


def test_esporte_sem_quadras_devolve_lista_vazia(
    client: TestClient, quadras: dict[str, Any]
) -> None:
    resposta = client.get("/quadras", params={"esporte": "basquete"})

    assert resposta.status_code == 200
    assert resposta.json() == []


def test_esporte_invalido(client: TestClient, quadras: dict[str, Any]) -> None:
    assert client.get("/quadras", params={"esporte": "golfe"}).status_code == 422


def test_com_data_esconde_quadra_sem_horario_livre(
    client: TestClient, quadras: dict[str, Any]
) -> None:
    lotada = quadras["lotada"]["id"]
    reservar_direto(lotada, date(2026, 10, 12), range(18, 19), "pendente")
    reservar_direto(lotada, date(2026, 10, 12), range(19, 20), "paga")

    resposta = client.get("/quadras", params={"data": "2026-10-12"})

    assert "Tênis Lotada" not in nomes(resposta)
    assert len(nomes(resposta)) == 3


def test_reserva_cancelada_libera_a_quadra_na_busca(
    client: TestClient, quadras: dict[str, Any]
) -> None:
    lotada = quadras["lotada"]["id"]
    reservar_direto(lotada, date(2026, 10, 12), range(18, 19), "pendente")
    reservar_direto(lotada, date(2026, 10, 12), range(19, 20), "cancelada")

    resposta = client.get("/quadras", params={"data": "2026-10-12"})

    assert "Tênis Lotada" in nomes(resposta)


def test_combina_esporte_e_data(client: TestClient, quadras: dict[str, Any]) -> None:
    reservar_direto(
        quadras["lotada"]["id"], date(2026, 10, 12), range(18, 20), "pendente"
    )

    resposta = client.get(
        "/quadras", params={"esporte": "tenis", "data": "2026-10-12"}
    )

    assert nomes(resposta) == ["Tênis Livre"]


def test_hoje_esconde_quadra_que_ja_fechou(
    client: TestClient, quadras: dict[str, Any]
) -> None:
    # 15h30: a quadra da manhã (8h-14h) não tem mais horário hoje.
    hoje = nomes(client.get("/quadras", params={"data": "2026-10-10"}))
    amanha = nomes(client.get("/quadras", params={"data": "2026-10-11"}))

    assert "Vôlei Manhã" not in hoje
    assert "Tênis Lotada" in hoje
    assert "Vôlei Manhã" in amanha


def test_quadra_inativa_nunca_aparece(
    client: TestClient, admin: Cabecalho, quadras: dict[str, Any]
) -> None:
    client.delete(f"/admin/quadras/{quadras['livre']['id']}", headers=admin)

    resposta = client.get(
        "/quadras", params={"esporte": "tenis", "data": "2026-10-11"}
    )

    assert "Tênis Livre" not in nomes(resposta)


@pytest.mark.parametrize(
    "data", ["2026-10-09", "2026-11-10", "10/12/2026"], ids=str
)
def test_data_invalida(
    client: TestClient, quadras: dict[str, Any], data: str
) -> None:
    # ontem, mais de 30 dias à frente e formato errado
    assert client.get("/quadras", params={"data": data}).status_code == 422


def test_limite_de_30_dias_e_aceito(
    client: TestClient, quadras: dict[str, Any]
) -> None:
    assert client.get("/quadras", params={"data": "2026-11-09"}).status_code == 200
