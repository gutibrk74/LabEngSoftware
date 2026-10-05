import { API_URL, fetchAutenticado, tratarResposta } from "./api";

export type TipoEsporte = "futebol" | "futsal" | "tenis" | "volei" | "basquete";

export type Quadra = {
  id: number;
  nome: string;
  tipo_esporte: TipoEsporte;
  piso: string;
  comprimento_m: number;
  largura_m: number;
  preco_hora: number;
  hora_abertura: number;
  hora_fechamento: number;
  coberta: boolean;
  iluminacao: boolean;
  replay: boolean;
  vestiario: boolean;
  ativa: boolean;
};

export type QuadraPayload = Omit<Quadra, "id" | "ativa">;

export type QuadraUpdatePayload = QuadraPayload & { ativa: boolean };

const CABECALHO_JSON = { "Content-Type": "application/json" };

export type FiltrosQuadras = {
  esporte?: TipoEsporte | "";
  data?: string;
};

// Com data, a API devolve só as quadras com algum horário livre no dia.
export async function listarQuadras(
  filtros: FiltrosQuadras = {},
): Promise<Quadra[]> {
  const parametros = new URLSearchParams();

  if (filtros.esporte) {
    parametros.set("esporte", filtros.esporte);
  }

  if (filtros.data) {
    parametros.set("data", filtros.data);
  }

  const busca = parametros.size > 0 ? `?${parametros}` : "";
  const resposta = await fetch(`${API_URL}/quadras${busca}`);
  return tratarResposta<Quadra[]>(resposta);
}

export async function listarQuadrasAdmin(): Promise<Quadra[]> {
  const resposta = await fetchAutenticado("/admin/quadras");
  return tratarResposta<Quadra[]>(resposta);
}

export async function criarQuadra(dados: QuadraPayload): Promise<Quadra> {
  const resposta = await fetchAutenticado("/admin/quadras", {
    method: "POST",
    headers: CABECALHO_JSON,
    body: JSON.stringify(dados),
  });
  return tratarResposta<Quadra>(resposta);
}

export async function atualizarQuadra(
  id: number,
  dados: QuadraUpdatePayload,
): Promise<Quadra> {
  const resposta = await fetchAutenticado(`/admin/quadras/${id}`, {
    method: "PUT",
    headers: CABECALHO_JSON,
    body: JSON.stringify(dados),
  });
  return tratarResposta<Quadra>(resposta);
}

export async function inativarQuadra(id: number): Promise<void> {
  const resposta = await fetchAutenticado(`/admin/quadras/${id}`, {
    method: "DELETE",
  });
  return tratarResposta<void>(resposta);
}
