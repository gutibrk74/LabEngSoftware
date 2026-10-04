// Datas no formato da API (AAAA-MM-DD), sempre no fuso do navegador.

export function paraDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function hojeIso(): string {
  return paraDataIso(new Date());
}

export function proximosDias(quantidade: number): Date[] {
  const hoje = new Date();

  return Array.from(
    { length: quantidade },
    (_, indice) =>
      new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + indice),
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
