"""US07: gestão de reservas pelo administrador.

Relógio fixo em sábado, 10/10/2026, 15h30 (horário de São Paulo), salvo
quando o teste define outro.
"""

from collections.abc import Callable
from datetime import datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from apoio import Cabecalho
from app.core.tempo import FUSO_HORARIO

CriarQuadra = Callable[..., dict[str, Any]]
Relogio = Callable[..., None]

HOJE = "2026-10-10"
AMANHA = "2026-10-11"
DEPOIS = "2026-10-12"


@pytest.fixture
def quadra(criar_quadra: CriarQuadra, relogio: Relogio) -> dict[str, Any]:
    return criar_quadra()  # "Quadra de Tênis A", tênis, 8h às 22h, R$ 80


def reservar(
    client: TestClient,
    cabecalho: Cabecalho,
    quadra_id: int,
    data: str = DEPOIS,
    horario: int = 19,
) -> dict[str, Any]:
    resposta = client.post(
        "/reservas",
        json={
            "quadra_id": quadra_id,
            "data": data,
            "horario": horario,
            "valor_esperado": 80,
        },
        headers=cabecalho,
    )
    assert resposta.status_code == 201, resposta.text
    return dict(resposta.json())


def alterar_status(
    client: TestClient, admin: Cabecalho, reserva_id: int, status: str
) -> Any:
    return client.patch(
        f"/admin/reservas/{reserva_id}/status",
        json={"status": status},
        headers=admin,
    )


def livres(client: TestClient, quadra_id: int, data: str) -> list[int]:
    grade = client.get(f"/quadras/{quadra_id}/horarios", params={"data": data})
    assert grade.status_code == 200, grade.text
    return [h["horario"] for h in grade.json()["horarios"] if h["disponivel"]]


# ----------------------------------------------------------------- acesso


def test_rotas_de_admin_recusam_visitante_e_atleta(
    client: TestClient, atleta: Cabecalho, quadra: dict[str, Any]
) -> None:
    reserva = reservar(client, atleta, quadra["id"])

    assert client.get("/admin/reservas").status_code == 401
    assert client.get("/admin/reservas", headers=atleta).status_code == 403

    caminho = f"/admin/reservas/{reserva['id']}/status"
    corpo = {"status": "paga"}
    assert client.patch(caminho, json=corpo).status_code == 401
    assert client.patch(caminho, json=corpo, headers=atleta).status_code == 403


# --------------------------------------------------------------- listagem


def test_lista_traz_atleta_e_quadra_em_ordem_de_agenda(
    client: TestClient,
    atleta: Cabecalho,
    outro_atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    reservar(client, outro_atleta, quadra["id"], data=DEPOIS, horario=10)
    reservar(client, atleta, quadra["id"], data=AMANHA, horario=20)
    reservar(client, atleta, quadra["id"], data=AMANHA, horario=9)

    resposta = client.get("/admin/reservas", headers=admin)

    assert resposta.status_code == 200
    lista = resposta.json()
    assert [(r["data"], r["horario"]) for r in lista] == [
        (AMANHA, 9),
        (AMANHA, 20),
        (DEPOIS, 10),
    ]
    assert [r["atleta_email"] for r in lista] == [
        "atleta@teste.com",
        "atleta@teste.com",
        "outro@teste.com",
    ]
    primeira = lista[0]
    assert primeira["atleta_nome"] == "Usuário de Teste"
    assert primeira["quadra_nome"] == quadra["nome"]
    assert primeira["quadra_esporte"] == "tenis"
    assert primeira["status"] == "pendente"
    assert primeira["valor"] == 80


def test_filtros_por_periodo_quadra_e_status(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    criar_quadra: CriarQuadra,
    quadra: dict[str, Any],
) -> None:
    outra = criar_quadra(nome="Quadra de Vôlei", tipo_esporte="volei")
    r1 = reservar(client, atleta, quadra["id"], data=AMANHA, horario=9)
    reservar(client, atleta, quadra["id"], data=DEPOIS, horario=9)
    reservar(client, atleta, outra["id"], data=DEPOIS, horario=10)
    alterar_status(client, admin, r1["id"], "paga")

    def filtrar(**parametros: Any) -> list[tuple[str, int, int]]:
        resposta = client.get(
            "/admin/reservas", params=parametros, headers=admin
        )
        assert resposta.status_code == 200, resposta.text
        return [
            (r["data"], r["horario"], r["quadra_id"]) for r in resposta.json()
        ]

    # Um dia só: início = fim.
    assert filtrar(inicio=DEPOIS, fim=DEPOIS) == [
        (DEPOIS, 9, quadra["id"]),
        (DEPOIS, 10, outra["id"]),
    ]
    assert filtrar(inicio=DEPOIS) == filtrar(inicio=DEPOIS, fim=DEPOIS)
    assert filtrar(fim=AMANHA) == [(AMANHA, 9, quadra["id"])]
    assert filtrar(quadra_id=outra["id"]) == [(DEPOIS, 10, outra["id"])]
    assert filtrar(status="paga") == [(AMANHA, 9, quadra["id"])]
    assert filtrar(status="pendente", quadra_id=quadra["id"]) == [
        (DEPOIS, 9, quadra["id"])
    ]
    assert filtrar(status="cancelada") == []


def test_filtros_invalidos(client: TestClient, admin: Cabecalho) -> None:
    invertido = client.get(
        "/admin/reservas",
        params={"inicio": DEPOIS, "fim": AMANHA},
        headers=admin,
    )
    assert invertido.status_code == 422
    assert "data inicial" in invertido.json()["detail"]

    for parametros in ({"status": "confirmada"}, {"inicio": "10/10/2026"}):
        resposta = client.get(
            "/admin/reservas", params=parametros, headers=admin
        )
        assert resposta.status_code == 422


# ------------------------------------------------------------ pagamento


def test_marcar_como_paga_e_desfazer(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    reserva = reservar(client, atleta, quadra["id"])

    paga = alterar_status(client, admin, reserva["id"], "paga")
    assert paga.status_code == 200
    assert paga.json()["status"] == "paga"

    desfeita = alterar_status(client, admin, reserva["id"], "pendente")
    assert desfeita.status_code == 200
    assert desfeita.json()["status"] == "pendente"

    # O atleta vê o status atualizado em "Minhas Reservas".
    minhas = client.get("/reservas/minhas", headers=atleta).json()
    assert minhas[0]["status"] == "pendente"


def test_pagamento_pode_ser_registrado_depois_do_jogo(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
    relogio: Relogio,
) -> None:
    reserva = reservar(client, atleta, quadra["id"], data=HOJE, horario=16)
    relogio(datetime(2026, 10, 11, 9, 0, tzinfo=FUSO_HORARIO))

    resposta = alterar_status(client, admin, reserva["id"], "paga")

    assert resposta.status_code == 200


# ------------------------------------------------------------ cancelamento


def test_admin_cancela_sem_a_antecedencia_de_2h(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
    relogio: Relogio,
) -> None:
    reserva = reservar(client, atleta, quadra["id"], data=HOJE, horario=19)
    relogio(datetime(2026, 10, 10, 17, 30, tzinfo=FUSO_HORARIO))

    # O atleta não pode mais cancelar (menos de 2h)...
    do_atleta = client.patch(
        f"/reservas/{reserva['id']}/cancelar", headers=atleta
    )
    assert do_atleta.status_code == 422

    # ...mas o administrador pode, e o horário volta a ficar livre.
    resposta = alterar_status(client, admin, reserva["id"], "cancelada")
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "cancelada"
    assert 19 in livres(client, quadra["id"], HOJE)


def test_admin_cancela_reserva_paga_e_reserva_passada(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
    relogio: Relogio,
) -> None:
    paga = reservar(client, atleta, quadra["id"], horario=10)
    alterar_status(client, admin, paga["id"], "paga")
    assert alterar_status(client, admin, paga["id"], "cancelada").status_code == 200

    # Atleta que não apareceu: o admin cancela depois do horário.
    passada = reservar(client, atleta, quadra["id"], data=HOJE, horario=16)
    relogio(datetime(2026, 10, 11, 9, 0, tzinfo=FUSO_HORARIO))
    assert (
        alterar_status(client, admin, passada["id"], "cancelada").status_code
        == 200
    )


# -------------------------------------------------------------- reativação


def test_reativar_volta_para_pendente_e_ocupa_o_horario(
    client: TestClient,
    atleta: Cabecalho,
    outro_atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    reserva = reservar(client, atleta, quadra["id"])
    alterar_status(client, admin, reserva["id"], "cancelada")
    assert 19 in livres(client, quadra["id"], DEPOIS)

    resposta = alterar_status(client, admin, reserva["id"], "pendente")

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "pendente"
    assert 19 not in livres(client, quadra["id"], DEPOIS)

    # Com a reserva reativada, ninguém mais consegue o horário.
    tentativa = client.post(
        "/reservas",
        json={
            "quadra_id": quadra["id"],
            "data": DEPOIS,
            "horario": 19,
            "valor_esperado": 80,
        },
        headers=outro_atleta,
    )
    assert tentativa.status_code == 409


def test_cancelada_nao_vai_direto_para_paga(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    reserva = reservar(client, atleta, quadra["id"])
    alterar_status(client, admin, reserva["id"], "cancelada")

    resposta = alterar_status(client, admin, reserva["id"], "paga")

    assert resposta.status_code == 422
    assert "só pode voltar para pendente" in resposta.json()["detail"]


def test_reativar_recusa_horario_ja_iniciado(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
    relogio: Relogio,
) -> None:
    reserva = reservar(client, atleta, quadra["id"], data=HOJE, horario=19)
    alterar_status(client, admin, reserva["id"], "cancelada")
    relogio(datetime(2026, 10, 10, 19, 0, tzinfo=FUSO_HORARIO))

    resposta = alterar_status(client, admin, reserva["id"], "pendente")

    assert resposta.status_code == 422
    assert "já começou" in resposta.json()["detail"]


def test_reativar_recusa_quadra_inativa(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    reserva = reservar(client, atleta, quadra["id"])
    alterar_status(client, admin, reserva["id"], "cancelada")
    client.delete(f"/admin/quadras/{quadra['id']}", headers=admin)

    resposta = alterar_status(client, admin, reserva["id"], "pendente")

    assert resposta.status_code == 422
    assert "quadra está inativa" in resposta.json()["detail"]


def test_reativar_horario_ja_ocupado_responde_409(
    client: TestClient,
    atleta: Cabecalho,
    outro_atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    antiga = reservar(client, atleta, quadra["id"])
    client.patch(f"/reservas/{antiga['id']}/cancelar", headers=atleta)
    nova = reservar(client, outro_atleta, quadra["id"])

    resposta = alterar_status(client, admin, antiga["id"], "pendente")

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Esse horário já foi reservado."

    # Nada mudou: a antiga continua cancelada e a nova, ativa.
    lista = client.get("/admin/reservas", headers=admin).json()
    status = {r["id"]: r["status"] for r in lista}
    assert status == {antiga["id"]: "cancelada", nova["id"]: "pendente"}


# ------------------------------------------------------------------ erros


def test_mesmo_status_responde_409(
    client: TestClient,
    atleta: Cabecalho,
    admin: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    reserva = reservar(client, atleta, quadra["id"])

    resposta = alterar_status(client, admin, reserva["id"], "pendente")

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Esta reserva já está pendente."


def test_reserva_inexistente_e_status_invalido(
    client: TestClient, admin: Cabecalho
) -> None:
    assert alterar_status(client, admin, 999, "paga").status_code == 404
    assert alterar_status(client, admin, 999, "confirmada").status_code == 422
