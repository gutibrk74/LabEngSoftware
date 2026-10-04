from datetime import datetime
from zoneinfo import ZoneInfo

# Horário oficial do complexo esportivo.
FUSO_HORARIO = ZoneInfo("America/Sao_Paulo")


def agora() -> datetime:
    return datetime.now(FUSO_HORARIO)
