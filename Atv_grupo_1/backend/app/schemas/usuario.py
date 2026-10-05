from pydantic import BaseModel, EmailStr, Field, model_validator


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=3, max_length=120)
    email: EmailStr
    telefone: str = Field(min_length=10, max_length=15)
    cpf: str = Field(min_length=11, max_length=14)
    cidade: str = Field(min_length=2, max_length=100)
    senha: str = Field(min_length=8, max_length=128)
    confirmar_senha: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def validar_senhas(self) -> "UsuarioCreate":
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas não coincidem")
        return self


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: str
    cpf: str
    cidade: str
    perfil: str
    ativo: bool

    model_config = {"from_attributes": True}            
    
    
class LoginRequest(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse