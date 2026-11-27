from datetime import date

from fastapi import APIRouter

from app.api.deps import AdministradorAtual, MetricasServiceDep
from app.schemas.metricas import MetricasResponse

# Dashboard e relatórios, restritos a administradores (US09).
router = APIRouter(prefix="/admin/metricas", tags=["Métricas (Admin)"])


@router.get("", response_model=MetricasResponse)
def obter_metricas(
    _admin: AdministradorAtual,
    service: MetricasServiceDep,
    inicio: date | None = None,
    fim: date | None = None,
) -> MetricasResponse:
    """Indicadores do período (data do jogo). Sem datas: o mês atual."""
    return service.calcular(inicio, fim)
