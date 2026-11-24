"""Tratamento de erros de integridade nos repositórios.

Só o índice de horário (reservas) e o índice de nome (quadras) viram 409;
qualquer outro erro do banco sobe como está, e a sessão sempre é desfeita
(rollback) para continuar utilizável.
"""

from collections.abc import Callable
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from apoio import Cabecalho
from app.core.exceptions import ConflitoError
from app.db.session import SessionLocal
from app.models import Quadra, Reserva, Usuario
from app.repositories.quadra_repository import QuadraRepository
from app.repositories.reserva_repository import ReservaRepository

CriarQuadra = Callable[..., dict[str, Any]]

DIA = date(2026, 10, 12)


def id_do_usuario(email: str) -> int:
    with SessionLocal() as db:
        return db.scalars(select(Usuario.id).where(Usuario.email == email)).one()


def nova_reserva(usuario_id: int, quadra_id: int, **extras: Any) -> Reserva:
    campos: dict[str, Any] = {
        "usuario_id": usuario_id,
        "quadra_id": quadra_id,
        "data": DIA,
        "horario": 19,
        "valor": Decimal("80"),
        **extras,
    }
    return Reserva(**campos)


@pytest.fixture
def ids(atleta: Cabecalho, criar_quadra: CriarQuadra) -> tuple[int, int]:
    quadra = criar_quadra()
    return id_do_usuario("atleta@teste.com"), quadra["id"]


# ------------------------------------------------------------------ reservas


def test_horario_repetido_vira_conflito_e_sessao_continua_valida(
    ids: tuple[int, int],
) -> None:
    usuario_id, quadra_id = ids

    with SessionLocal() as db:
        repositorio = ReservaRepository(db)
        repositorio.adicionar(nova_reserva(usuario_id, quadra_id))

        with pytest.raises(ConflitoError, match="já foi reservado"):
            repositorio.adicionar(nova_reserva(usuario_id, quadra_id))

        # Rollback feito: a mesma sessão segue funcionando.
        assert repositorio.horarios_ocupados(quadra_id, DIA) == {19}


def test_outro_erro_de_integridade_nao_vira_conflito_de_horario(
    ids: tuple[int, int],
) -> None:
    usuario_id, quadra_id = ids

    with SessionLocal() as db:
        repositorio = ReservaRepository(db)

        # valor = 0 viola ck_reservas_valor, não o índice de horário.
        with pytest.raises(IntegrityError, match="ck_reservas_valor"):
            repositorio.adicionar(
                nova_reserva(usuario_id, quadra_id, valor=Decimal("0"))
            )

        assert repositorio.horarios_ocupados(quadra_id, DIA) == set()


def test_cancelar_nao_esconde_erro_que_nao_e_de_horario(
    ids: tuple[int, int],
) -> None:
    usuario_id, quadra_id = ids

    with SessionLocal() as db:
        repositorio = ReservaRepository(db)
        reserva = repositorio.adicionar(nova_reserva(usuario_id, quadra_id))

        # Simula um dado inválido junto do cancelamento: antes virava um
        # 409 genérico; agora o erro real sobe e nada é gravado.
        reserva.horario = 24
        with pytest.raises(IntegrityError, match="ck_reservas_horario"):
            repositorio.cancelar(reserva)

        recarregada = repositorio.buscar_por_id(reserva.id)
        assert recarregada is not None
        assert (recarregada.status, recarregada.horario) == ("pendente", 19)


# ------------------------------------------------------------------- quadras


def nova_quadra(nome: str, **extras: Any) -> Quadra:
    campos: dict[str, Any] = {
        "nome": nome,
        "tipo_esporte": "tenis",
        "piso": "Saibro",
        "comprimento_m": Decimal("23.77"),
        "largura_m": Decimal("10.97"),
        "preco_hora": Decimal("80"),
        **extras,
    }
    return Quadra(**campos)


def test_nome_repetido_vira_conflito_de_nome() -> None:
    with SessionLocal() as db:
        repositorio = QuadraRepository(db)
        repositorio.adicionar(nova_quadra("Arena"))

        with pytest.raises(ConflitoError, match="Já existe uma quadra"):
            repositorio.adicionar(nova_quadra("ARENA"))

        assert [q.nome for q in repositorio.listar(apenas_ativas=False)] == [
            "Arena"
        ]


def test_erro_que_nao_e_de_nome_nao_vira_conflito_de_nome() -> None:
    with SessionLocal() as db:
        repositorio = QuadraRepository(db)

        # Horário invertido viola ck_quadras_horario: antes a resposta era
        # "Já existe uma quadra com este nome."; agora o erro real sobe.
        with pytest.raises(IntegrityError, match="ck_quadras_horario"):
            repositorio.adicionar(
                nova_quadra("Arena", hora_abertura=20, hora_fechamento=10)
            )

        # Rollback feito: a sessão segue funcionando e nada foi gravado.
        assert repositorio.listar(apenas_ativas=False) == []
