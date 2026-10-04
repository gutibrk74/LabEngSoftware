from fastapi import APIRouter, status

from app.api.deps import ReservaServiceDep, UsuarioAtual
from app.models.reserva import Reserva
from app.schemas.reserva import ReservaCreate, ReservaResponse

router = APIRouter(prefix="/reservas", tags=["Reservas"])


@router.post(
    "",
    response_model=ReservaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_reserva(
    dados: ReservaCreate, usuario: UsuarioAtual, service: ReservaServiceDep
) -> Reserva:
    return service.reservar(usuario, dados)
