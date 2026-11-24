from datetime import date

from fastapi import APIRouter

from app.api.deps import AdministradorAtual, ReservaAdminServiceDep
from app.models.reserva import Reserva, StatusReserva
from app.schemas.reserva import (
    AlterarStatusReserva,
    ReservaAdminResponse,
    ReservaResponse,
)

# Gestão de reservas restrita a administradores (US07).
router = APIRouter(prefix="/admin/reservas", tags=["Reservas (Admin)"])


@router.get("", response_model=list[ReservaAdminResponse])
def listar_reservas(
    _admin: AdministradorAtual,
    service: ReservaAdminServiceDep,
    inicio: date | None = None,
    fim: date | None = None,
    quadra_id: int | None = None,
    status: StatusReserva | None = None,
) -> list[ReservaAdminResponse]:
    """Todas as reservas, com filtros opcionais de período, quadra e status."""
    return service.listar(
        inicio=inicio, fim=fim, quadra_id=quadra_id, status=status
    )


@router.patch("/{reserva_id}/status", response_model=ReservaResponse)
def alterar_status_reserva(
    reserva_id: int,
    dados: AlterarStatusReserva,
    _admin: AdministradorAtual,
    service: ReservaAdminServiceDep,
) -> Reserva:
    """Marca como paga, desfaz o pagamento, cancela ou reativa (pendente)."""
    return service.alterar_status(reserva_id, dados.status)
