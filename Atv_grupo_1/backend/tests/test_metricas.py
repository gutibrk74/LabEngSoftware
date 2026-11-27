"""US09: dashboard e relatórios (GET /admin/metricas).

Relógio fixo em sábado, 10/10/2026, 15h30 (horário de São Paulo). As
reservas são gravadas direto no banco porque os períodos incluem datas
passadas, que a API não aceita reservar.
"""

from collections.abc import Callable
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from apoio import Cabecalho
from app.db.session import SessionLocal
from app.models import Reserva, Usuario

CriarQuadra = Callable[..., dict[str, Any]]
Relogio = Callable[..., None]


@pytest.fixture
def atleta_id(atleta: Cabecalho) -> int:
    with SessionLocal() as db:
        return db.scalars(
            select(Usuario.id).where(Usuario.email == "atleta@teste.com")
        ).one()


def gravar(
    usuario_id: int,
    quadra_id: int,
    dia: date,
    horario: int,
    valor: str | int = 80,
    status: str = "pendente",
) -> None:
    with SessionLocal() as db:
        db.add(
            Reserva(
                usuario_id=usuario_id,
                quadra_id=quadra_id,
                data=dia,
                horario=horario,
                valor=Decimal(str(valor)),
                status=status,
            )
        )
        db.commit()


def metricas(
    client: TestClient, admin: Cabecalho, **parametros: str
) -> dict[str, Any]:
    resposta = client.get("/admin/metricas", params=parametros, headers=admin)
    assert resposta.status_code == 200, resposta.text
    return dict(resposta.json())


# ----------------------------------------------------------------- acesso


def test_metricas_recusam_visitante_e_atleta(
    client: TestClient, atleta: Cabecalho
) -> None:
    assert client.get("/admin/metricas").status_code == 401
    assert client.get("/admin/metricas", headers=atleta).status_code == 403


# ---------------------------------------------------------------- período


def test_periodo_padrao_e_o_mes_atual_e_vazio_nao_divide_por_zero(
    client: TestClient, admin: Cabecalho, relogio: Relogio
) -> None:
    dados = metricas(client, admin)

    assert dados["periodo"] == {
        "inicio": "2026-10-01",
        "fim": "2026-10-31",
        "dias": 31,
    }
    # Sem quadras e sem reservas: tudo zerado, sem erro de divisão.
    assert dados["reservas_por_status"] == {
        "pendente": 0,
        "paga": 0,
        "cancelada": 0,
        "total": 0,
    }
    assert dados["faturamento"] == {
        "realizado": 0,
        "a_receber": 0,
        "previsto": 0,
    }
    assert dados["ocupacao_geral"] == {
        "horas_reservadas": 0,
        "horas_disponiveis": 0,
        "taxa": 0,
    }
    assert dados["ocupacao_por_quadra"] == []
    assert dados["por_esporte"] == []


def test_quadra_sem_reservas_tem_ocupacao_zero(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    criar_quadra()  # tênis, 8h às 22h: 14 horas por dia

    dados = metricas(client, admin, inicio="2026-10-10", fim="2026-10-11")

    assert dados["ocupacao_geral"] == {
        "horas_reservadas": 0,
        "horas_disponiveis": 28,
        "taxa": 0,
    }
    assert dados["ocupacao_por_quadra"][0]["taxa"] == 0
    assert dados["por_esporte"] == [
        {"esporte": "tenis", "reservas": 0, "faturamento_previsto": 0}
    ]


def test_periodo_invalido(client: TestClient, admin: Cabecalho) -> None:
    def status(**parametros: str) -> int:
        return client.get(
            "/admin/metricas", params=parametros, headers=admin
        ).status_code

    invertido = client.get(
        "/admin/metricas",
        params={"inicio": "2026-10-12", "fim": "2026-10-11"},
        headers=admin,
    )
    assert invertido.status_code == 422
    assert "data inicial" in invertido.json()["detail"]

    # 2026-01-01 a 2027-01-02 = 367 dias; até 2027-01-01 = 366 (aceito).
    assert status(inicio="2026-01-01", fim="2027-01-02") == 422
    assert status(inicio="2026-01-01", fim="2027-01-01") == 200
    # Só uma das datas, ou data mal formatada.
    assert status(inicio="2026-10-01") == 422
    assert status(fim="2026-10-31") == 422
    assert status(inicio="01/10/2026", fim="2026-10-31") == 422


# ----------------------------------------------- status e faturamento


def test_contagem_por_status_e_faturamento(
    client: TestClient,
    admin: Cabecalho,
    atleta_id: int,
    criar_quadra: CriarQuadra,
) -> None:
    quadra = criar_quadra()  # R$ 80 a hora
    q = quadra["id"]

    gravar(atleta_id, q, date(2026, 10, 5), 9, 80, "paga")
    # Reserva feita quando a hora custava R$ 70: conta o valor do momento.
    gravar(atleta_id, q, date(2026, 10, 6), 9, "70.50", "paga")
    gravar(atleta_id, q, date(2026, 10, 12), 19, 80, "pendente")
    gravar(atleta_id, q, date(2026, 10, 12), 20, 80, "cancelada")
    gravar(atleta_id, q, date(2026, 10, 13), 10, 80, "cancelada")
    # Fora do período (data do jogo antes e depois): não contam.
    gravar(atleta_id, q, date(2026, 9, 30), 9, 80, "paga")
    gravar(atleta_id, q, date(2026, 11, 1), 9, 80, "pendente")

    # Mudar o preço da quadra depois não altera o que já foi reservado.
    novo_preco = client.put(
        f"/admin/quadras/{q}",
        json={**quadra, "preco_hora": 200},
        headers=admin,
    )
    assert novo_preco.status_code == 200, novo_preco.text

    dados = metricas(client, admin, inicio="2026-10-01", fim="2026-10-31")

    assert dados["reservas_por_status"] == {
        "pendente": 1,
        "paga": 2,
        "cancelada": 2,
        "total": 5,
    }
    # Canceladas (R$ 160) nunca entram no faturamento.
    assert dados["faturamento"] == {
        "realizado": 150.5,
        "a_receber": 80,
        "previsto": 230.5,
    }


# --------------------------------------------------------------- ocupação


def test_ocupacao_por_quadra_geral_e_por_esporte(
    client: TestClient,
    admin: Cabecalho,
    atleta_id: int,
    criar_quadra: CriarQuadra,
) -> None:
    # Período de 3 dias: 10, 11 e 12/10.
    tenis = criar_quadra(nome="Arena Tênis")["id"]  # 8h-22h: 14 h/dia
    society = criar_quadra(
        nome="Society",
        tipo_esporte="futebol",
        preco_hora=150,
        hora_abertura=18,
        hora_fechamento=22,
    )["id"]  # 4 h/dia
    volei = criar_quadra(
        nome="Quadra de Vôlei",
        tipo_esporte="volei",
        preco_hora=60,
        hora_abertura=8,
        hora_fechamento=20,
    )["id"]  # 12 h/dia, será inativada com uma reserva ativa
    basquete = criar_quadra(
        nome="Basquete Fechada", tipo_esporte="basquete"
    )["id"]  # inativa e só com reserva cancelada: fica de fora

    dia10 = date(2026, 10, 10)
    dia11 = date(2026, 10, 11)
    dia12 = date(2026, 10, 12)

    gravar(atleta_id, tenis, dia10, 9, 80, "pendente")
    gravar(atleta_id, tenis, dia11, 9, 80, "paga")
    gravar(atleta_id, tenis, dia12, 9, 80, "pendente")
    gravar(atleta_id, tenis, dia12, 10, 80, "cancelada")  # não ocupa
    gravar(atleta_id, tenis, date(2026, 10, 13), 9, 80)  # fora do período

    for dia, hora in [
        (dia10, 18),
        (dia10, 19),
        (dia11, 18),
        (dia11, 19),
        (dia11, 20),
        (dia12, 21),
    ]:
        gravar(atleta_id, society, dia, hora, 150, "paga")

    gravar(atleta_id, volei, dia10, 10, 60, "pendente")
    gravar(atleta_id, basquete, dia10, 10, 80, "cancelada")
    client.delete(f"/admin/quadras/{volei}", headers=admin)
    client.delete(f"/admin/quadras/{basquete}", headers=admin)

    dados = metricas(client, admin, inicio="2026-10-10", fim="2026-10-12")

    por_quadra = {
        item["nome"]: (
            item["horas_reservadas"],
            item["horas_disponiveis"],
            item["taxa"],
            item["ativa"],
        )
        for item in dados["ocupacao_por_quadra"]
    }
    assert por_quadra == {
        "Arena Tênis": (3, 42, round(3 / 42, 4), True),
        "Society": (6, 12, 0.5, True),
        "Quadra de Vôlei": (1, 36, round(1 / 36, 4), False),
    }
    # Em ordem de nome, como a lista de quadras.
    assert [item["nome"] for item in dados["ocupacao_por_quadra"]] == [
        "Arena Tênis",
        "Quadra de Vôlei",
        "Society",
    ]
    assert dados["ocupacao_geral"] == {
        "horas_reservadas": 10,
        "horas_disponiveis": 90,
        "taxa": round(10 / 90, 4),
    }
    assert dados["por_esporte"] == [
        {"esporte": "futebol", "reservas": 6, "faturamento_previsto": 900},
        {"esporte": "tenis", "reservas": 3, "faturamento_previsto": 240},
        {"esporte": "volei", "reservas": 1, "faturamento_previsto": 60},
    ]
