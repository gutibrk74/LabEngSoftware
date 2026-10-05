from app.api.routes.auth import router as auth_router
from app.api.routes.quadras import admin_router as quadras_admin_router
from app.api.routes.quadras import router as quadras_router
from app.api.routes.reservas import router as reservas_router

__all__ = [
    "auth_router",
    "quadras_admin_router",
    "quadras_router",
    "reservas_router",
]
