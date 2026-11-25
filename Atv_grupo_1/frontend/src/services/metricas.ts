import { fetchAutenticado, tratarResposta } from "./api";
import type { TipoEsporte } from "./quadras";

export type Ocupacao = {
  horas_reservadas: number;
  horas_disponiveis: number;
  // Fração de 0 a 1.
  taxa: number;
};

export type OcupacaoQuadra = Ocupacao & {
  quadra_id: number;
  nome: string;
  tipo_esporte: TipoEsporte;
  ativa: boolean;
};

export type MetricasEsporte = {
  esporte: TipoEsporte;
  reservas: number;
  faturamento_previsto: number;
};

export type Metricas = {
  periodo: { inicio: string; fim: string; dias: number };
  reservas_por_status: {
    pendente: number;
    paga: number;
    cancelada: number;
    total: number;
  };
  // realizado = pagas; a_receber = pendentes; previsto = pagas + pendentes.
  faturamento: { realizado: number; a_receber: number; previsto: number };
  ocupacao_geral: Ocupacao;
  ocupacao_por_quadra: OcupacaoQuadra[];
  por_esporte: MetricasEsporte[];
};

// Sem datas, a API usa o mês atual.
export async function buscarMetricas(
  inicio?: string,
  fim?: string,
): Promise<Metricas> {
  const parametros = new URLSearchParams();

  if (inicio && fim) {
    parametros.set("inicio", inicio);
    parametros.set("fim", fim);
  }

  const busca = parametros.size > 0 ? `?${parametros}` : "";
  const resposta = await fetchAutenticado(`/admin/metricas${busca}`);
  return tratarResposta<Metricas>(resposta);
}
