"""nome de quadra unico sem diferenciar maiusculas

Revision ID: 17455edafc3c
Revises: 5b023e5b277f
Create Date: 2026-10-04 23:04:11.512445

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17455edafc3c'
down_revision: Union[str, Sequence[str], None] = '5b023e5b277f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Troca o nome único (sensível a maiúsculas) por índice em lower(nome)."""
    op.drop_constraint("uq_quadras_nome", "quadras", type_="unique")
    op.create_index(
        "uq_quadras_nome_lower",
        "quadras",
        [sa.text("lower(nome)")],
        unique=True,
    )


def downgrade() -> None:
    """Volta para o nome único sensível a maiúsculas."""
    op.drop_index("uq_quadras_nome_lower", table_name="quadras")
    op.create_unique_constraint("uq_quadras_nome", "quadras", ["nome"])
