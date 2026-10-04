from app.core.exceptions import (
    ConflitoError,
    DadosInvalidosError,
    NaoEncontradoError,
)
from app.models.quadra import Quadra
from app.repositories.quadra_repository import QuadraRepository
from app.schemas.quadra import QuadraBase, QuadraCreate, QuadraUpdate


class QuadraService:
    def __init__(self, repositorio: QuadraRepository) -> None:
        self._repositorio = repositorio

    def listar(self, incluir_inativas: bool = False) -> list[Quadra]:
        return self._repositorio.listar(apenas_ativas=not incluir_inativas)

    def obter(self, quadra_id: int, incluir_inativas: bool = False) -> Quadra:
        quadra = self._repositorio.buscar_por_id(quadra_id)

        if quadra is None or (not quadra.ativa and not incluir_inativas):
            raise NaoEncontradoError("Quadra não encontrada.")

        return quadra

    def criar(self, dados: QuadraCreate) -> Quadra:
        self._validar_horario(dados)
        self._garantir_nome_disponivel(dados.nome)

        quadra = Quadra()
        self._copiar_campos(quadra, dados)

        return self._repositorio.adicionar(quadra)

    def atualizar(self, quadra_id: int, dados: QuadraUpdate) -> Quadra:
        quadra = self.obter(quadra_id, incluir_inativas=True)
        self._validar_horario(dados)
        self._garantir_nome_disponivel(dados.nome, ignorar_id=quadra.id)

        self._copiar_campos(quadra, dados)
        quadra.ativa = dados.ativa

        return self._repositorio.salvar(quadra)

    def inativar(self, quadra_id: int) -> None:
        quadra = self.obter(quadra_id, incluir_inativas=True)
        quadra.ativa = False
        self._repositorio.salvar(quadra)

    def _garantir_nome_disponivel(
        self, nome: str, ignorar_id: int | None = None
    ) -> None:
        existente = self._repositorio.buscar_por_nome(nome)

        if existente is not None and existente.id != ignorar_id:
            raise ConflitoError("Já existe uma quadra com este nome.")

    def _validar_horario(self, dados: QuadraBase) -> None:
        if dados.hora_fechamento <= dados.hora_abertura:
            raise DadosInvalidosError(
                "O horário de fechamento deve ser depois da abertura."
            )

    def _copiar_campos(self, quadra: Quadra, dados: QuadraBase) -> None:
        quadra.nome = dados.nome
        quadra.tipo_esporte = dados.tipo_esporte
        quadra.piso = dados.piso
        quadra.comprimento_m = dados.comprimento_m
        quadra.largura_m = dados.largura_m
        quadra.preco_hora = dados.preco_hora
        quadra.hora_abertura = dados.hora_abertura
        quadra.hora_fechamento = dados.hora_fechamento
        quadra.coberta = dados.coberta
        quadra.iluminacao = dados.iluminacao
        quadra.replay = dados.replay
        quadra.vestiario = dados.vestiario
