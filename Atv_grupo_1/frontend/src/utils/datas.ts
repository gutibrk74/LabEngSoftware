// Datas no formato da API (AAAA-MM-DD). "Hoje" e a hora atual seguem o
// horário do complexo (São Paulo), o mesmo usado pelo backend, e não o
// fuso do navegador.

export const FUSO_HORARIO = "America/Sao_Paulo";

const formatoPartesSaoPaulo = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_HORARIO,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});

function agoraSaoPaulo() {
  const partes = Object.fromEntries(
    formatoPartesSaoPaulo
      .formatToParts(new Date())
      .map(({ type, value }) => [type, Number(value)]),
  );

  return {
    ano: partes.year,
    mes: partes.month,
    dia: partes.day,
    hora: partes.hour,
  };
}

export function horaAtual(): number {
  return agoraSaoPaulo().hora;
}

export function paraDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// Os objetos Date abaixo representam só o dia do calendário (sem hora).
export function hojeIso(): string {
  return paraDataIso(proximosDias(1)[0]);
}

export function proximosDias(quantidade: number): Date[] {
  const { ano, mes, dia } = agoraSaoPaulo();

  return Array.from(
    { length: quantidade },
    (_, indice) => new Date(ano, mes - 1, dia + indice),
  );
}

const formatoDiaSemana = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
});

// "dom." -> "DOM"
export function diaDaSemanaCurto(data: Date): string {
  return formatoDiaSemana.format(data).replace(".", "").toUpperCase();
}

const formatoDataExtenso = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// "2026-10-05" -> "segunda-feira, 05 de outubro de 2026"
export function formatarDataExtenso(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return formatoDataExtenso.format(new Date(ano, mes - 1, dia));
}

export function formatarHora(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}
