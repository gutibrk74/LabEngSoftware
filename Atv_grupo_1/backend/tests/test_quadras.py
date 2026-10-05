"""US08 — CRUD de quadras (administrador) e horário de funcionamento."""

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from apoio import Cabecalho, dados_quadra
from app.core.exceptions import ConflitoError
from app.db.session import SessionLocal
from app.models import Quadra
from app.repositories import QuadraRepository

CriarQuadra = Callable[..., dict[str, Any]]


def test_cadastra_quadra_com_valores_padrao(
    client: TestClient, admin: Cabecalho
) -> None:
    resposta = client.post(
        "/admin/quadras",
        json=dados_quadra(nome="  Quadra Central  ", piso=" Saibro "),
        headers=admin,
    )

    assert resposta.status_code == 201
    quadra = resposta.json()
    assert quadra["nome"] == "Quadra Central"
    assert quadra["piso"] == "Saibro"
    assert quadra["ativa"] is True
    assert (quadra["hora_abertura"], quadra["hora_fechamento"]) == (8, 22)
    assert quadra["coberta"] is False and quadra["replay"] is False


@pytest.mark.parametrize(
    ("campos", "motivo"),
    [
        ({"tipo_esporte": "golfe"}, "esporte inválido"),
        ({"preco_hora": 0}, "preço zero"),
        ({"preco_hora": 10.123}, "mais de 2 casas decimais"),
        ({"comprimento_m": -1}, "dimensão negativa"),
        ({"nome": "  ab  "}, "nome curto depois de tirar espaços"),
        ({"hora_fechamento": 25}, "hora fora de 0-24"),
        ({"hora_abertura": -1}, "hora negativa"),
    ],
)
def test_cadastro_recusa_dados_invalidos(
    client: TestClient, admin: Cabecalho, campos: dict[str, Any], motivo: str
) -> None:
    resposta = client.post(
        "/admin/quadras", json=dados_quadra(**campos), headers=admin
    )

    assert resposta.status_code == 422, motivo


@pytest.mark.parametrize(("abertura", "fechamento"), [(22, 8), (10, 10)])
def test_cadastro_recusa_horario_invertido(
    client: TestClient, admin: Cabecalho, abertura: int, fechamento: int
) -> None:
    resposta = client.post(
        "/admin/quadras",
        json=dados_quadra(hora_abertura=abertura, hora_fechamento=fechamento),
        headers=admin,
    )

    assert resposta.status_code == 422
    assert "fechamento" in resposta.json()["detail"]


def test_nome_repetido_sem_diferenciar_maiusculas(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    criar_quadra(nome="Arena Central")

    resposta = client.post(
        "/admin/quadras", json=dados_quadra(nome="arena central"), headers=admin
    )

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Já existe uma quadra com este nome."


def test_banco_garante_nome_unico_mesmo_sem_a_checagem_do_service() -> None:
    # Simula dois cadastros simultâneos que passaram juntos pela checagem.
    def nova(nome: str) -> Quadra:
        return Quadra(
            nome=nome,
            tipo_esporte="volei",
            piso="Areia",
            comprimento_m=16,
            largura_m=8,
            preco_hora=90,
        )

    with SessionLocal() as db:
        repositorio = QuadraRepository(db)
        repositorio.adicionar(nova("Arena"))

        with pytest.raises(ConflitoError):
            repositorio.adicionar(nova("ARENA"))


def test_banco_recusa_horario_invertido() -> None:
    with SessionLocal() as db:
        db.add(
            Quadra(
                nome="Direto no banco",
                tipo_esporte="tenis",
                piso="Saibro",
                comprimento_m=1,
                largura_m=1,
                preco_hora=1,
                hora_abertura=20,
                hora_fechamento=10,
            )
        )

        with pytest.raises(IntegrityError):
            db.commit()


def test_lista_publica_mostra_so_ativas_em_ordem_de_nome(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    criar_quadra(nome="Quadra B")
    inativa = criar_quadra(nome="Quadra A")
    criar_quadra(nome="Quadra C")
    client.delete(f"/admin/quadras/{inativa['id']}", headers=admin)

    publica = [q["nome"] for q in client.get("/quadras").json()]
    completa = [
        (q["nome"], q["ativa"])
        for q in client.get("/admin/quadras", headers=admin).json()
    ]

    assert publica == ["Quadra B", "Quadra C"]
    assert completa == [
        ("Quadra A", False),
        ("Quadra B", True),
        ("Quadra C", True),
    ]


def test_detalhe_publico_esconde_quadra_inativa(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    quadra = criar_quadra()
    assert client.get(f"/quadras/{quadra['id']}").status_code == 200

    client.delete(f"/admin/quadras/{quadra['id']}", headers=admin)

    assert client.get(f"/quadras/{quadra['id']}").status_code == 404
    assert client.get("/quadras/9999").status_code == 404


def test_edita_quadra(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    quadra = criar_quadra()

    resposta = client.put(
        f"/admin/quadras/{quadra['id']}",
        json=dados_quadra(
            preco_hora=95.5,
            coberta=True,
            hora_abertura=6,
            hora_fechamento=24,
            ativa=True,
        ),
        headers=admin,
    )

    assert resposta.status_code == 200
    editada = resposta.json()
    assert editada["preco_hora"] == 95.5
    assert editada["coberta"] is True
    assert (editada["hora_abertura"], editada["hora_fechamento"]) == (6, 24)


def test_edicao_exige_o_campo_ativa(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    quadra = criar_quadra()

    resposta = client.put(
        f"/admin/quadras/{quadra['id']}", json=dados_quadra(), headers=admin
    )

    assert resposta.status_code == 422


def test_edicao_recusa_renomear_para_nome_existente(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    criar_quadra(nome="Quadra A")
    quadra_b = criar_quadra(nome="Quadra B")

    resposta = client.put(
        f"/admin/quadras/{quadra_b['id']}",
        json=dados_quadra(nome="QUADRA A", ativa=True),
        headers=admin,
    )

    assert resposta.status_code == 409


def test_edicao_de_quadra_inexistente(
    client: TestClient, admin: Cabecalho
) -> None:
    resposta = client.put(
        "/admin/quadras/9999", json=dados_quadra(ativa=True), headers=admin
    )

    assert resposta.status_code == 404


def test_inativar_e_reativar(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    quadra = criar_quadra()

    assert client.delete(
        f"/admin/quadras/{quadra['id']}", headers=admin
    ).status_code == 204
    assert client.get("/quadras").json() == []

    reativada = client.put(
        f"/admin/quadras/{quadra['id']}",
        json=dados_quadra(ativa=True),
        headers=admin,
    )

    assert reativada.json()["ativa"] is True
    assert len(client.get("/quadras").json()) == 1


def test_inativar_nao_apaga_do_banco(
    client: TestClient, admin: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    quadra = criar_quadra()
    client.delete(f"/admin/quadras/{quadra['id']}", headers=admin)

    with SessionLocal() as db:
        guardada = db.get(Quadra, quadra["id"])

    assert guardada is not None
    assert guardada.ativa is False


def test_atleta_nao_pode_alterar_quadras(
    client: TestClient, atleta: Cabecalho, criar_quadra: CriarQuadra
) -> None:
    quadra = criar_quadra()
    url = f"/admin/quadras/{quadra['id']}"

    assert client.post(
        "/admin/quadras", json=dados_quadra(nome="Outra"), headers=atleta
    ).status_code == 403
    assert client.put(
        url, json=dados_quadra(ativa=True), headers=atleta
    ).status_code == 403
    assert client.delete(url, headers=atleta).status_code == 403
    assert client.post(
        "/admin/quadras", json=dados_quadra(nome="Outra")
    ).status_code == 401
