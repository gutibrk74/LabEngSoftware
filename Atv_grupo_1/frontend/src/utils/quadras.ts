import type { TipoEsporte } from "../services/quadras";

type InfoEsporte = {
  nome: string;
  emoji: string;
  fundo: string;
};

export const ESPORTES: Record<TipoEsporte, InfoEsporte> = {
  futebol: {
    nome: "Futebol",
    emoji: "⚽",
    fundo: "linear-gradient(135deg, #14532d, #052e16)",
  },
  futsal: {
    nome: "Futsal",
    emoji: "🥅",
    fundo: "linear-gradient(135deg, #1e3a8a, #0b1736)",
  },
  tenis: {
    nome: "Tênis",
    emoji: "🎾",
    fundo: "linear-gradient(135deg, #9a3412, #3b1306)",
  },
  volei: {
    nome: "Vôlei",
    emoji: "🏐",
    fundo: "linear-gradient(135deg, #a16207, #3d2604)",
  },
  basquete: {
    nome: "Basquete",
    emoji: "🏀",
    fundo: "linear-gradient(135deg, #7c2d12, #2a0f06)",
  },
};

const formatoPreco = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatoMedida = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export function formatarPreco(valor: number): string {
  return formatoPreco.format(valor);
}

export function formatarDimensoes(
  comprimento: number,
  largura: number,
): string {
  const textoComprimento = formatoMedida.format(comprimento);
  const textoLargura = formatoMedida.format(largura);

  return `${textoComprimento} m × ${textoLargura} m`;
}
