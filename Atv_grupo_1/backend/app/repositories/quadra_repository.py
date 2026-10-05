from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflitoError
from app.models.quadra import Quadra


class QuadraRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def listar(
        self, apenas_ativas: bool, esporte: str | None = None
    ) -> list[Quadra]:
        consulta = select(Quadra).order_by(Quadra.nome)

        if apenas_ativas:
            consulta = consulta.where(Quadra.ativa.is_(True))

        if esporte is not None:
            consulta = consulta.where(Quadra.tipo_esporte == esporte)

        return list(self._db.scalars(consulta))

    def buscar_por_id(self, quadra_id: int) -> Quadra | None:
        return self._db.get(Quadra, quadra_id)

    def buscar_por_nome(self, nome: str) -> Quadra | None:
        return self._db.scalar(
            select(Quadra).where(func.lower(Quadra.nome) == nome.lower())
        )

    def adicionar(self, quadra: Quadra) -> Quadra:
        self._db.add(quadra)
        return self.salvar(quadra)

    def salvar(self, quadra: Quadra) -> Quadra:
        try:
            self._db.commit()
        except IntegrityError:
            self._db.rollback()
            raise ConflitoError("Já existe uma quadra com este nome.") from None

        self._db.refresh(quadra)
        return quadra
