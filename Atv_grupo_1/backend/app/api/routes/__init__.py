from app.api.routes.admin_reservas import router as reservas_admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.metricas import router as metricas_router
from app.api.routes.quadras import admin_router as quadras_admin_router
from app.api.routes.quadras import router as quadras_router
from app.api.routes.reservas import router as reservas_router

__all__ = [
    "auth_router",
    "metricas_router",
    "quadras_admin_router",
    "quadras_router",
    "reservas_admin_router",
    "reservas_router",
]
