from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.quadra import TipoEsporte


class QuadraBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str = Field(min_length=3, max_length=100)
    tipo_esporte: TipoEsporte
    piso: str = Field(min_length=2, max_length=60)
    comprimento_m: Decimal = Field(gt=0, max_digits=5, decimal_places=2)
    largura_m: Decimal = Field(gt=0, max_digits=5, decimal_places=2)
    preco_hora: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    hora_abertura: int = Field(default=8, ge=0, le=23)
    hora_fechamento: int = Field(default=22, ge=1, le=24)
    coberta: bool = False
    iluminacao: bool = False
    replay: bool = False
    vestiario: bool = False


class QuadraCreate(QuadraBase):
    pass


class QuadraUpdate(QuadraBase):
    ativa: bool


class QuadraResponse(BaseModel):
    id: int
    nome: str
    tipo_esporte: TipoEsporte
    piso: str
    comprimento_m: float
    largura_m: float
    preco_hora: float
    hora_abertura: int
    hora_fechamento: int
    coberta: bool
    iluminacao: bool
    replay: bool
    vestiario: bool
    ativa: bool

    model_config = {"from_attributes": True}
