from fastapi import status


class ErroDominio(Exception):
    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem


class DadosInvalidosError(ErroDominio):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT


class ConflitoError(ErroDominio):
    status_code = status.HTTP_409_CONFLICT


class NaoAutenticadoError(ErroDominio):
    status_code = status.HTTP_401_UNAUTHORIZED


class AcessoNegadoError(ErroDominio):
    status_code = status.HTTP_403_FORBIDDEN


class NaoEncontradoError(ErroDominio):
    status_code = status.HTTP_404_NOT_FOUND
