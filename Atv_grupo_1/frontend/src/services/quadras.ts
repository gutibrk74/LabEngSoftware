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

export async function listarQuadras(): Promise<Quadra[]> {
  const resposta = await fetch(`${API_URL}/quadras`);
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
