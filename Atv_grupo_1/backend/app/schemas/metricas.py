from datetime import date

from pydantic import BaseModel

from app.models.quadra import TipoEsporte


class PeriodoMetricas(BaseModel):
    inicio: date
    fim: date
    dias: int


class ReservasPorStatus(BaseModel):
    pendente: int
    paga: int
    cancelada: int
    total: int


class Faturamento(BaseModel):
    # realizado = pagas; a_receber = pendentes; previsto = pagas + pendentes.
    # Reservas canceladas nunca contam.
    realizado: float
    a_receber: float
    previsto: float


class Ocupacao(BaseModel):
    horas_reservadas: int
    horas_disponiveis: int
    # Fração de 0 a 1 (ex.: 0.25 = 25%).
    taxa: float


class OcupacaoQuadra(Ocupacao):
    quadra_id: int
    nome: str
    tipo_esporte: TipoEsporte
    ativa: bool


class MetricasEsporte(BaseModel):
    esporte: TipoEsporte
    reservas: int
    faturamento_previsto: float


class MetricasResponse(BaseModel):
    periodo: PeriodoMetricas
    reservas_por_status: ReservasPorStatus
    faturamento: Faturamento
    ocupacao_geral: Ocupacao
    ocupacao_por_quadra: list[OcupacaoQuadra]
    por_esporte: list[MetricasEsporte]
