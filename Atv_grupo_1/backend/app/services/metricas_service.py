from calendar import monthrange
from collections import defaultdict
from datetime import date
from decimal import Decimal

from app.core.exceptions import DadosInvalidosError
from app.core.tempo import agora
from app.models.reserva import STATUS_RESERVA
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.metricas import (
    Faturamento,
    MetricasEsporte,
    MetricasResponse,
    Ocupacao,
    OcupacaoQuadra,
    PeriodoMetricas,
    ReservasPorStatus,
)
from app.services.quadra_service import QuadraService

# Maior período aceito (um ano bissexto inteiro).
DIAS_MAXIMOS_PERIODO = 366

# Reservas que ocupam o horário e entram no faturamento previsto.
STATUS_ATIVOS = ("pendente", "paga")


class MetricasService:
    """Indicadores do dashboard (US09).

    - O período se refere à data do jogo (reserva.data), não à da criação.
    - Valores vêm de reserva.valor (preço do momento da reserva).
    - Faturamento: realizado = pagas; a receber = pendentes;
      previsto = pagas + pendentes. Canceladas nunca contam.
    - Ocupação = horas reservadas (pendentes + pagas; cada reserva dura
      1 hora) / (horas de funcionamento por dia x dias do período), com o
      horário de funcionamento ATUAL da quadra: não há histórico de
      mudanças de horário.
    """

    def __init__(
        self, repositorio: ReservaRepository, quadra_service: QuadraService
    ) -> None:
        self._repositorio = repositorio
        self._quadra_service = quadra_service

    def calcular(
        self, inicio: date | None = None, fim: date | None = None
    ) -> MetricasResponse:
        inicio, fim = self._resolver_periodo(inicio, fim)
        dias = (fim - inicio).days + 1

        quantidade = {status: 0 for status in STATUS_RESERVA}
        valor = {status: Decimal("0") for status in STATUS_RESERVA}
        horas_por_quadra: dict[int, int] = defaultdict(int)
        valor_ativo_por_quadra: dict[int, Decimal] = defaultdict(Decimal)

        linhas = self._repositorio.agregar_por_quadra_e_status(inicio, fim)
        for quadra_id, status, total_reservas, total_valor in linhas:
            quantidade[status] += total_reservas
            valor[status] += total_valor

            if status in STATUS_ATIVOS:
                horas_por_quadra[quadra_id] += total_reservas
                valor_ativo_por_quadra[quadra_id] += total_valor

        # Quadras ativas e as inativas que ainda têm reservas no período.
        quadras = [
            quadra
            for quadra in self._quadra_service.listar(incluir_inativas=True)
            if quadra.ativa or horas_por_quadra.get(quadra.id)
        ]

        ocupacao_por_quadra = [
            OcupacaoQuadra(
                quadra_id=quadra.id,
                nome=quadra.nome,
                tipo_esporte=quadra.tipo_esporte,
                ativa=quadra.ativa,
                **self._ocupacao(
                    horas_por_quadra.get(quadra.id, 0),
                    (quadra.hora_fechamento - quadra.hora_abertura) * dias,
                ).model_dump(),
            )
            for quadra in quadras
        ]

        ocupacao_geral = self._ocupacao(
            sum(item.horas_reservadas for item in ocupacao_por_quadra),
            sum(item.horas_disponiveis for item in ocupacao_por_quadra),
        )

        reservas_esporte: dict[str, int] = defaultdict(int)
        valor_esporte: dict[str, Decimal] = defaultdict(Decimal)
        for quadra in quadras:
            reservas_esporte[quadra.tipo_esporte] += horas_por_quadra.get(
                quadra.id, 0
            )
            valor_esporte[quadra.tipo_esporte] += valor_ativo_por_quadra.get(
                quadra.id, Decimal("0")
            )

        por_esporte = sorted(
            (
                MetricasEsporte(
                    esporte=esporte,
                    reservas=reservas_esporte[esporte],
                    faturamento_previsto=float(valor_esporte[esporte]),
                )
                for esporte in reservas_esporte
            ),
            key=lambda item: (-item.reservas, item.esporte),
        )

        return MetricasResponse(
            periodo=PeriodoMetricas(inicio=inicio, fim=fim, dias=dias),
            reservas_por_status=ReservasPorStatus(
                pendente=quantidade["pendente"],
                paga=quantidade["paga"],
                cancelada=quantidade["cancelada"],
                total=sum(quantidade.values()),
            ),
            faturamento=Faturamento(
                realizado=float(valor["paga"]),
                a_receber=float(valor["pendente"]),
                previsto=float(valor["paga"] + valor["pendente"]),
            ),
            ocupacao_geral=ocupacao_geral,
            ocupacao_por_quadra=ocupacao_por_quadra,
            por_esporte=por_esporte,
        )

    def _resolver_periodo(
        self, inicio: date | None, fim: date | None
    ) -> tuple[date, date]:
        if inicio is None and fim is None:
            # Padrão: o mês atual inteiro (horário do complexo).
            hoje = agora().date()
            ultimo_dia = monthrange(hoje.year, hoje.month)[1]
            return hoje.replace(day=1), hoje.replace(day=ultimo_dia)

        if inicio is None or fim is None:
            raise DadosInvalidosError(
                "Informe o início e o fim do período, ou nenhum dos dois "
                "para usar o mês atual."
            )

        if inicio > fim:
            raise DadosInvalidosError(
                "A data inicial deve ser anterior ou igual à final."
            )

        if (fim - inicio).days + 1 > DIAS_MAXIMOS_PERIODO:
            raise DadosInvalidosError(
                f"O período pode ter no máximo {DIAS_MAXIMOS_PERIODO} dias."
            )

        return inicio, fim

    def _ocupacao(
        self, horas_reservadas: int, horas_disponiveis: int
    ) -> Ocupacao:
        # Sem horas disponíveis (nenhuma quadra), a taxa é zero.
        taxa = (
            round(horas_reservadas / horas_disponiveis, 4)
            if horas_disponiveis > 0
            else 0.0
        )
        return Ocupacao(
            horas_reservadas=horas_reservadas,
            horas_disponiveis=horas_disponiveis,
            taxa=taxa,
        )
