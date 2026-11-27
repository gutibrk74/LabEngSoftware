from sqlalchemy.exc import IntegrityError


def constraint_violada(erro: IntegrityError) -> str | None:
    """Nome da constraint ou índice que o PostgreSQL recusou.

    Vem do próprio erro do driver (psycopg), e não do texto da mensagem,
    que pode mudar com o idioma ou a versão do servidor.
    """
    diagnostico = getattr(erro.orig, "diag", None)
    return getattr(diagnostico, "constraint_name", None)
