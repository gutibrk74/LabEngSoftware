"""US04 (grade de horários) e US05 (confirmação de reserva).

Relógio fixo em sábado, 10/10/2026, 15h30 (horário de São Paulo), salvo
quando o teste define outro.
"""

from collections.abc import Callable
from datetime import date, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from apoio import Cabecalho, dados_quadra
from app.core.tempo import FUSO_HORARIO
from app.db.session import SessionLocal
from app.models import Reserva

CriarQuadra = Callable[..., dict[str, Any]]
Relogio = Callable[..., None]

AMANHA_DEPOIS = "2026-10-12"


@pytest.fixture
def quadra(criar_quadra: CriarQuadra, relogio: Relogio) -> dict[str, Any]:
    return criar_quadra()  # tênis, 8h às 22h, R$ 80


def pedido(quadra_id: int, **extras: Any) -> dict[str, Any]:
    return {
        "quadra_id": quadra_id,
        "data": AMANHA_DEPOIS,
        "horario": 19,
        "valor_esperado": 80,
        **extras,
    }


def livres(client: TestClient, quadra_id: int, data: str) -> list[int]:
    grade = client.get(f"/quadras/{quadra_id}/horarios", params={"data": data})
    assert grade.status_code == 200, grade.text
    return [h["horario"] for h in grade.json()["horarios"] if h["disponivel"]]


# ---------------------------------------------------------------- US04 grade


def test_grade_lista_os_horarios_de_funcionamento(
    client: TestClient, quadra: dict[str, Any]
) -> None:
    grade = client.get(
        f"/quadras/{quadra['id']}/horarios", params={"data": AMANHA_DEPOIS}
    ).json()

    assert [h["horario"] for h in grade["horarios"]] == list(range(8, 22))
    assert all(h["valor"] == 80 for h in grade["horarios"])
    # Não expõe quem reservou.
    assert set(grade["horarios"][0]) == {"horario", "disponivel", "valor"}


def test_grade_marca_pendentes_e_pagas_como_ocupadas(
    client: TestClient, atleta: Cabecalho, quadra: dict[str, Any]
) -> None:
    client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)
    with SessionLocal() as db:
        db.query(Reserva).update({"status": "paga"})
        db.add(
            Reserva(
                usuario_id=1,
                quadra_id=quadra["id"],
                data=date(2026, 10, 12),
                horario=10,
                valor=80,
            )
        )
        db.commit()

    disponiveis = livres(client, quadra["id"], AMANHA_DEPOIS)

    assert 19 not in disponiveis
    assert 10 not in disponiveis
    assert 11 in disponiveis


def test_grade_libera_horario_de_reserva_cancelada(
    client: TestClient, atleta: Cabecalho, quadra: dict[str, Any]
) -> None:
    client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)
    with SessionLocal() as db:
        db.query(Reserva).update({"status": "cancelada"})
        db.commit()

    assert 19 in livres(client, quadra["id"], AMANHA_DEPOIS)


def test_grade_de_hoje_bloqueia_horarios_que_ja_comecaram(
    client: TestClient, quadra: dict[str, Any]
) -> None:
    # 15h30: das 15h para trás já começou.
    assert livres(client, quadra["id"], "2026-10-10") == list(range(16, 22))


def test_grade_respeita_o_horario_de_cada_quadra(
    client: TestClient, criar_quadra: CriarQuadra, relogio: Relogio
) -> None:
    quadra = criar_quadra(
        nome="Futsal 24h",
        tipo_esporte="futsal",
        hora_abertura=6,
        hora_fechamento=24,
        preco_hora=120.5,
    )

    grade = client.get(
        f"/quadras/{quadra['id']}/horarios", params={"data": "2026-10-11"}
    ).json()

    assert [h["horario"] for h in grade["horarios"]] == list(range(6, 24))
    assert grade["horarios"][0]["valor"] == 120.5


@pytest.mark.parametrize(
    ("data", "status"),
    [("2026-10-09", 422), ("2026-11-10", 422), ("2026-11-09", 200)],
    ids=["ontem", "hoje+31", "hoje+30"],
)
def test_grade_valida_a_data(
    client: TestClient, quadra: dict[str, Any], data: str, status: int
) -> None:
    resposta = client.get(f"/quadras/{quadra['id']}/horarios", params={"data": data})

    assert resposta.status_code == status


def test_grade_de_quadra_inativa_ou_inexistente(
    client: TestClient, admin: Cabecalho, quadra: dict[str, Any]
) -> None:
    client.delete(f"/admin/quadras/{quadra['id']}", headers=admin)

    for quadra_id in (quadra["id"], 9999):
        resposta = client.get(
            f"/quadras/{quadra_id}/horarios", params={"data": AMANHA_DEPOIS}
        )
        assert resposta.status_code == 404


# ------------------------------------------------------------ US05 reservar


def test_reserva_exige_login(client: TestClient, quadra: dict[str, Any]) -> None:
    assert client.post("/reservas", json=pedido(quadra["id"])).status_code == 401


def test_reserva_criada_como_pendente_com_o_preco(
    client: TestClient, atleta: Cabecalho, quadra: dict[str, Any]
) -> None:
    resposta = client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)

    assert resposta.status_code == 201
    reserva = resposta.json()
    assert reserva["status"] == "pendente"
    assert reserva["valor"] == 80
    assert reserva["horario"] == 19
    assert 19 not in livres(client, quadra["id"], AMANHA_DEPOIS)


def test_horario_ocupado_responde_409(
    client: TestClient,
    atleta: Cabecalho,
    outro_atleta: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)

    for quem in (outro_atleta, atleta):
        resposta = client.post(
            "/reservas", json=pedido(quadra["id"]), headers=quem
        )
        assert resposta.status_code == 409
        assert resposta.json()["detail"] == "Esse horário já foi reservado."


@pytest.mark.parametrize(
    ("campos", "status", "mensagem"),
    [
        ({"horario": 7}, 422, "A quadra não funciona nesse horário."),
        ({"horario": 22}, 422, "A quadra não funciona nesse horário."),
        ({"horario": 24}, 422, None),
        ({"data": "2026-10-10", "horario": 15}, 422, "Esse horário já começou."),
        ({"data": "2026-10-09"}, 422, "Não é possível usar uma data passada."),
        ({"data": "2026-11-10"}, 422, None),
    ],
    ids=["antes-de-abrir", "na-hora-de-fechar", "hora-24", "ja-comecou",
         "ontem", "hoje+31"],
)
def test_reserva_recusa_horarios_invalidos(
    client: TestClient,
    atleta: Cabecalho,
    quadra: dict[str, Any],
    campos: dict[str, Any],
    status: int,
    mensagem: str | None,
) -> None:
    resposta = client.post(
        "/reservas", json=pedido(quadra["id"], **campos), headers=atleta
    )

    assert resposta.status_code == status
    if mensagem:
        assert resposta.json()["detail"] == mensagem


@pytest.mark.parametrize(
    "campos",
    [{"horario": 21}, {"data": "2026-10-10", "horario": 16}],
    ids=["ultima-hora", "hoje-proxima-hora"],
)
def test_reserva_aceita_horarios_validos(
    client: TestClient,
    atleta: Cabecalho,
    quadra: dict[str, Any],
    campos: dict[str, Any],
) -> None:
    resposta = client.post(
        "/reservas", json=pedido(quadra["id"], **campos), headers=atleta
    )

    assert resposta.status_code == 201


def test_reserva_de_quadra_inativa_ou_inexistente(
    client: TestClient,
    admin: Cabecalho,
    atleta: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    client.delete(f"/admin/quadras/{quadra['id']}", headers=admin)

    for quadra_id in (quadra["id"], 9999):
        resposta = client.post(
            "/reservas", json=pedido(quadra_id), headers=atleta
        )
        assert resposta.status_code == 404


def test_reserva_exige_o_valor_esperado(
    client: TestClient, atleta: Cabecalho, quadra: dict[str, Any]
) -> None:
    dados = pedido(quadra["id"])
    del dados["valor_esperado"]

    assert client.post("/reservas", json=dados, headers=atleta).status_code == 422


def test_reserva_recusa_preco_desatualizado(
    client: TestClient,
    admin: Cabecalho,
    atleta: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    client.put(
        f"/admin/quadras/{quadra['id']}",
        json=dados_quadra(preco_hora=100, ativa=True),
        headers=admin,
    )

    antigo = client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)
    centavo = client.post(
        "/reservas",
        json=pedido(quadra["id"], valor_esperado=100.01),
        headers=atleta,
    )

    assert antigo.status_code == 409
    assert antigo.json()["detail"] == (
        "O preço deste horário mudou para R$ 100,00. "
        "Feche e revise a reserva novamente."
    )
    assert centavo.status_code == 409
    assert 19 in livres(client, quadra["id"], AMANHA_DEPOIS)

    novo = client.post(
        "/reservas",
        json=pedido(quadra["id"], valor_esperado="100.00"),
        headers=atleta,
    )
    assert novo.status_code == 201
    assert novo.json()["valor"] == 100


def test_reserva_guarda_o_preco_do_momento(
    client: TestClient,
    admin: Cabecalho,
    atleta: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)
    client.put(
        f"/admin/quadras/{quadra['id']}",
        json=dados_quadra(preco_hora=100, ativa=True),
        headers=admin,
    )

    with SessionLocal() as db:
        reserva = db.query(Reserva).one()

    assert reserva.valor == 80


def test_reserva_cancelada_libera_o_horario(
    client: TestClient,
    atleta: Cabecalho,
    outro_atleta: Cabecalho,
    quadra: dict[str, Any],
) -> None:
    client.post("/reservas", json=pedido(quadra["id"]), headers=atleta)
    with SessionLocal() as db:
        db.query(Reserva).update({"status": "cancelada"})
        db.commit()

    resposta = client.post(
        "/reservas", json=pedido(quadra["id"]), headers=outro_atleta
    )

    assert resposta.status_code == 201


def test_meia_noite_entre_as_validacoes_nao_aceita_data_passada(
    client: TestClient,
    atleta: Cabecalho,
    criar_quadra: CriarQuadra,
    relogio: Relogio,
) -> None:
    quadra = criar_quadra(nome="Quadra 24h", hora_abertura=0, hora_fechamento=24)
    antes = datetime(2026, 10, 10, 23, 59, 59, tzinfo=FUSO_HORARIO)
    depois = datetime(2026, 10, 11, 0, 0, 1, tzinfo=FUSO_HORARIO)

    # Cada leitura do relógio devolve um instante: a meia-noite cai no meio.
    relogio(antes, depois)
    resposta = client.post(
        "/reservas",
        json=pedido(quadra["id"], data="2026-10-10", horario=23),
        headers=atleta,
    )

    assert resposta.status_code == 422
    with SessionLocal() as db:
        assert db.query(Reserva).count() == 0


# ------------------------------------------------------- regras do banco


def nova_reserva(**campos: Any) -> Reserva:
    dados: dict[str, Any] = {
        "usuario_id": 1,
        "data": date(2026, 10, 12),
        "horario": 8,
        "valor": 80,
        **campos,
    }
    return Reserva(**dados)


@pytest.mark.parametrize(
    "campos",
    [{"horario": 24}, {"status": "aprovada"}, {"valor": 0}, {"quadra_id": 9999}],
    ids=["horario-24", "status-invalido", "valor-zero", "quadra-inexistente"],
)
def test_banco_recusa_reserva_invalida(
    quadra: dict[str, Any], campos: dict[str, Any]
) -> None:
    with SessionLocal() as db:
        db.add(nova_reserva(**{"quadra_id": quadra["id"], **campos}))

        with pytest.raises(IntegrityError):
            db.commit()
