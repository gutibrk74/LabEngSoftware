from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    auth_router,
    quadras_admin_router,
    quadras_router,
    reservas_router,
)
from app.core.exceptions import ErroDominio

app = FastAPI(
    title="Reserva de Quadras e Campos",
    description="API do sistema de reservas de quadras e campos esportivos.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def tratar_erro_dominio(_request: Request, erro: Exception) -> JSONResponse:
    if not isinstance(erro, ErroDominio):
        raise erro

    headers = (
        {"WWW-Authenticate": "Bearer"}
        if erro.status_code == status.HTTP_401_UNAUTHORIZED
        else None
    )
    return JSONResponse(
        status_code=erro.status_code,
        content={"detail": erro.mensagem},
        headers=headers,
    )


app.add_exception_handler(ErroDominio, tratar_erro_dominio)

app.include_router(auth_router)
app.include_router(quadras_router)
app.include_router(quadras_admin_router)
app.include_router(reservas_router)


@app.get("/")
def root():
    return {"message": "API de reservas de quadras funcionando"}


@app.get("/health")
def health_check():
    return {"status": "ok"}