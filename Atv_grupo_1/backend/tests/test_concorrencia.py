"""Concorrência: o mesmo horário nunca pode ter duas reservas.

Os pedidos são disparados ao mesmo tempo em threads (cada uma com seu
cliente e sua conexão com o banco), liberadas juntas por uma barreira.
Quem garante a regra é o índice único parcial do banco
"uq_reservas_quadra_data_horario" (quadra + data + horário, ignorando
reservas canceladas), tanto para reservas novas quanto para a reativação
de uma reserva cancelada pelo administrador (US07).
"""

import threading
from collections.abc import Callable
from functools import partial
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from apoio import Cabecalho, dados_cadastro, dados_quadra, login
from app.db.session import SessionLocal
from app.main import app
from app.models import Reserva

PEDIDOS_SIMULTANEOS = 10
DATA = "2026-10-12"


def disparar_juntos(tarefas: list[Callable[[], int]]) -> list[int]:
    """Executa as tarefas em paralelo, todas liberadas no mesmo instante."""
    barreira = threading.Barrier(len(tarefas))
    resultados: list[int] = []
    trava = threading.Lock()

    def executar(tarefa: Callable[[], int]) -> None:
        barreira.wait()
        resultado = tarefa()
        with trava:
            resultados.append(resultado)

    threads = [threading.Thread(target=executar, args=(t,)) for t in tarefas]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    return resultados


@pytest.fixture
def atletas(client: TestClient) -> list[Cabecalho]:
    cabecalhos = []
    for numero in range(PEDIDOS_SIMULTANEOS):
        email = f"atleta{numero}@teste.com"
        client.post(
            "/auth/register",
            json=dados_cadastro(email, f"{numero + 1:011d}"),
        )
        cabecalhos.append(login(client, email))
    return cabecalhos


@pytest.fixture
def quadra(
    criar_quadra: Callable[..., dict[str, Any]], relogio: Callable[..., None]
) -> dict[str, Any]:
    return criar_quadra()  # tênis, 8h às 22h, R$ 80


def reservar(quadra_id: int, horario: int, cabecalho: Cabecalho) -> int:
    # Um cliente por thread, como navegadores diferentes.
    resposta = TestClient(app).post(
        "/reservas",
        json={
            "quadra_id": quadra_id,
            "data": DATA,
            "horario": horario,
            "valor_esperado": 80,
        },
        headers=cabecalho,
    )
    return resposta.status_code


def reservas_ativas(quadra_id: int, horario: int) -> int:
    with SessionLocal() as db:
        return (
            db.query(Reserva)
            .filter(
                Reserva.quadra_id == quadra_id,
                Reserva.data == date(2026, 10, 12),
                Reserva.horario == horario,
                Reserva.status != "cancelada",
            )
            .count()
        )


@pytest.mark.parametrize("rodada", range(1, 6))
def test_dez_atletas_no_mesmo_horario_so_um_consegue(
    atletas: list[Cabecalho], quadra: dict[str, Any], rodada: int
) -> None:
    horario = 8 + rodada  # um horário diferente por rodada

    codigos = disparar_juntos(
        [partial(reservar, quadra["id"], horario, cabecalho) for cabecalho in atletas]
    )

    print(
        f"\n[rodada {rodada}] {len(codigos)} pedidos simultâneos para "
        f"{horario}h: {codigos.count(201)} aprovado(s) (201), "
        f"{codigos.count(409)} recusado(s) (409)"
    )
    assert sorted(codigos) == [201] + [409] * (PEDIDOS_SIMULTANEOS - 1)
    assert reservas_ativas(quadra["id"], horario) == 1


def test_controle_horarios_diferentes_ao_mesmo_tempo_todos_conseguem(
    atletas: list[Cabecalho], quadra: dict[str, Any]
) -> None:
    # Prova que a recusa acima vem do conflito, e não do paralelismo.
    codigos = disparar_juntos(
        [
            partial(reservar, quadra["id"], 8 + i, cabecalho)
            for i, cabecalho in enumerate(atletas)
        ]
    )

    assert codigos == [201] * PEDIDOS_SIMULTANEOS


def test_horario_cancelado_volta_a_ser_disputado_corretamente(
    atletas: list[Cabecalho], quadra: dict[str, Any]
) -> None:
    assert reservar(quadra["id"], 19, atletas[0]) == 201
    with SessionLocal() as db:
        db.query(Reserva).update({"status": "cancelada"})
        db.commit()

    codigos = disparar_juntos(
        [partial(reservar, quadra["id"], 19, cabecalho) for cabecalho in atletas]
    )

    assert codigos.count(201) == 1
    assert reservas_ativas(quadra["id"], 19) == 1


@pytest.mark.parametrize("rodada", range(1, 6))
def test_reativacao_pelo_admin_disputa_o_horario_com_atletas(
    atletas: list[Cabecalho],
    admin: Cabecalho,
    quadra: dict[str, Any],
    rodada: int,
) -> None:
    # US07: reativar uma reserva cancelada também precisa respeitar o índice
    # único. O admin reativa enquanto 9 atletas tentam reservar o mesmo
    # horário: só um dos 10 pedidos pode ficar com ele.
    horario = 13 + rodada  # um horário diferente por rodada
    assert reservar(quadra["id"], horario, atletas[0]) == 201
    with SessionLocal() as db:
        reserva_id = (
            db.query(Reserva.id).filter(Reserva.horario == horario).scalar()
        )
    cancelada = TestClient(app).patch(
        f"/reservas/{reserva_id}/cancelar", headers=atletas[0]
    )
    assert cancelada.status_code == 200

    def reativar() -> int:
        return (
            TestClient(app)
            .patch(
                f"/admin/reservas/{reserva_id}/status",
                json={"status": "pendente"},
                headers=admin,
            )
            .status_code
        )

    # Reativação aceita = 200; reserva nova aceita = 201; recusa = 409.
    codigos = disparar_juntos(
        [reativar]
        + [
            partial(reservar, quadra["id"], horario, cabecalho)
            for cabecalho in atletas[1:]
        ]
    )

    vencedor = "admin (reativou)" if 200 in codigos else "um atleta (nova reserva)"
    print(
        f"\n[rodada {rodada}] admin reativando + 9 atletas reservando "
        f"{horario}h: {codigos.count(200) + codigos.count(201)} aceito(s), "
        f"{codigos.count(409)} recusado(s) (409); ficou com o horário: {vencedor}"
    )
    assert codigos.count(200) + codigos.count(201) == 1
    assert codigos.count(409) == PEDIDOS_SIMULTANEOS - 1
    assert reservas_ativas(quadra["id"], horario) == 1


def test_banco_barra_gravacoes_simultaneas_sem_passar_pela_api(
    atletas: list[Cabecalho], quadra: dict[str, Any]
) -> None:
    def gravar(usuario_id: int) -> int:
        with SessionLocal() as db:
            db.add(
                Reserva(
                    usuario_id=usuario_id,
                    quadra_id=quadra["id"],
                    data=date(2026, 10, 12),
                    horario=18,
                    valor=80,
                )
            )
            try:
                db.commit()
                return 1
            except IntegrityError:
                db.rollback()
                return 0

    # usuários 2..11 (o 1 é o administrador que cadastrou a quadra)
    gravadas = disparar_juntos(
        [partial(gravar, uid) for uid in range(2, 2 + PEDIDOS_SIMULTANEOS)]
    )

    assert sum(gravadas) == 1
    assert reservas_ativas(quadra["id"], 18) == 1


def test_cadastro_simultaneo_de_quadras_com_mesmo_nome(
    client: TestClient, admin: Cabecalho
) -> None:
    def cadastrar(nome: str) -> int:
        return (
            TestClient(app)
            .post("/admin/quadras", json=dados_quadra(nome=nome), headers=admin)
            .status_code
        )

    codigos = disparar_juntos(
        [partial(cadastrar, nome) for nome in ("Arena", "ARENA", "arena")]
    )

    assert sorted(codigos) == [201, 409, 409]
