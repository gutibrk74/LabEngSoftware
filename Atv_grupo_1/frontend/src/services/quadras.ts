import { API_URL, cabecalhoAutenticacao, tratarResposta } from "./api";

export type TipoEsporte = "futebol" | "futsal" | "tenis" | "volei" | "basquete";

export type Quadra = {
  id: number;
  nome: string;
  tipo_esporte: TipoEsporte;
  piso: string;
  comprimento_m: number;
  largura_m: number;
  preco_hora: number;
  coberta: boolean;
  iluminacao: boolean;
  replay: boolean;
  vestiario: boolean;
  ativa: boolean;
};

export type QuadraPayload = Omit<Quadra, "id" | "ativa">;

export type QuadraUpdatePayload = QuadraPayload & { ativa: boolean };

function cabecalhosJson(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...cabecalhoAutenticacao(),
  };
}

export async function listarQuadras(): Promise<Quadra[]> {
  const resposta = await fetch(`${API_URL}/quadras`);
  return tratarResposta<Quadra[]>(resposta);
}

export async function listarQuadrasAdmin(): Promise<Quadra[]> {
  const resposta = await fetch(`${API_URL}/admin/quadras`, {
    headers: cabecalhoAutenticacao(),
  });
  return tratarResposta<Quadra[]>(resposta);
}

export async function criarQuadra(dados: QuadraPayload): Promise<Quadra> {
  const resposta = await fetch(`${API_URL}/admin/quadras`, {
    method: "POST",
    headers: cabecalhosJson(),
    body: JSON.stringify(dados),
  });
  return tratarResposta<Quadra>(resposta);
}

export async function atualizarQuadra(
  id: number,
  dados: QuadraUpdatePayload,
): Promise<Quadra> {
  const resposta = await fetch(`${API_URL}/admin/quadras/${id}`, {
    method: "PUT",
    headers: cabecalhosJson(),
    body: JSON.stringify(dados),
  });
  return tratarResposta<Quadra>(resposta);
}

export async function inativarQuadra(id: number): Promise<void> {
  const resposta = await fetch(`${API_URL}/admin/quadras/${id}`, {
    method: "DELETE",
    headers: cabecalhoAutenticacao(),
  });
  return tratarResposta<void>(resposta);
}
