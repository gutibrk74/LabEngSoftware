"""Promove um usuário já cadastrado ao perfil de administrador.

Uso (dentro de Atv_grupo_1/backend):
    python -m app.scripts.promover_admin email@exemplo.com
"""

import sys

from app.db.session import SessionLocal
from app.models.usuario import PERFIL_ADMINISTRADOR
from app.repositories.usuario_repository import UsuarioRepository


def promover(email: str) -> int:
    with SessionLocal() as db:
        repositorio = UsuarioRepository(db)
        usuario = repositorio.buscar_por_email(email.strip().lower())

        if usuario is None:
            print(f"Usuário com e-mail '{email}' não encontrado.")
            return 1

        usuario.perfil = PERFIL_ADMINISTRADOR
        repositorio.salvar(usuario)

    print(f"Usuário '{email}' agora é administrador.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)

    sys.exit(promover(sys.argv[1]))
