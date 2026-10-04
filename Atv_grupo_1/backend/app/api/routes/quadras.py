from fastapi import APIRouter, status

from app.api.deps import AdministradorAtual, QuadraServiceDep
from app.models.quadra import Quadra
from app.schemas.quadra import QuadraCreate, QuadraResponse, QuadraUpdate

# Consulta aberta: só quadras ativas.
router = APIRouter(prefix="/quadras", tags=["Quadras"])

# Gestão (CRUD) restrita a administradores.
admin_router = APIRouter(prefix="/admin/quadras", tags=["Quadras (Admin)"])


@router.get("", response_model=list[QuadraResponse])
def listar_quadras(service: QuadraServiceDep) -> list[Quadra]:
    return service.listar()


@router.get("/{quadra_id}", response_model=QuadraResponse)
def obter_quadra(quadra_id: int, service: QuadraServiceDep) -> Quadra:
    return service.obter(quadra_id)


@admin_router.get("", response_model=list[QuadraResponse])
def listar_todas_quadras(
    _admin: AdministradorAtual, service: QuadraServiceDep
) -> list[Quadra]:
    return service.listar(incluir_inativas=True)


@admin_router.post(
    "",
    response_model=QuadraResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_quadra(
    dados: QuadraCreate, _admin: AdministradorAtual, service: QuadraServiceDep
) -> Quadra:
    return service.criar(dados)


@admin_router.put("/{quadra_id}", response_model=QuadraResponse)
def atualizar_quadra(
    quadra_id: int,
    dados: QuadraUpdate,
    _admin: AdministradorAtual,
    service: QuadraServiceDep,
) -> Quadra:
    return service.atualizar(quadra_id, dados)


@admin_router.delete("/{quadra_id}", status_code=status.HTTP_204_NO_CONTENT)
def inativar_quadra(
    quadra_id: int, _admin: AdministradorAtual, service: QuadraServiceDep
) -> None:
    service.inativar(quadra_id)
