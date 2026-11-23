from fastapi import APIRouter, status

from app.api.deps import ReservaServiceDep, UsuarioAtual
from app.models.reserva import Reserva
from app.schemas.reserva import (
    ReservaAtletaResponse,
    ReservaCreate,
    ReservaResponse,
)

router = APIRouter(prefix="/reservas", tags=["Reservas"])


@router.get("/minhas", response_model=list[ReservaAtletaResponse])
def listar_minhas_reservas(
    usuario: UsuarioAtual, service: ReservaServiceDep
) -> list[ReservaAtletaResponse]:
    return service.listar_minhas_reservas(usuario)


@router.post(
    "",
    response_model=ReservaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_reserva(
    dados: ReservaCreate, usuario: UsuarioAtual, service: ReservaServiceDep
) -> Reserva:
    return service.reservar(usuario, dados)


@router.patch("/{reserva_id}/cancelar", response_model=ReservaResponse)
def cancelar_reserva(
    reserva_id: int, usuario: UsuarioAtual, service: ReservaServiceDep
) -> Reserva:
    return service.cancelar_reserva(usuario, reserva_id)
