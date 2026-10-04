import { encerrarSessaoExpirada, obterToken } from "./sessao";

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

type CadastroPayload = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  cidade: string;
  senha: string;
  confirmar_senha: string;
};

type LoginPayload = {
  email: string;
  senha: string;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  cidade: string;
  perfil: string;
  ativo: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  usuario: Usuario;
};

export class ErroApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

export async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (resposta.status === 204) {
    return undefined as T;
  }

  const corpo = await resposta.json();

  if (!resposta.ok) {
    const detalhe =
      typeof corpo.detail === "string"
        ? corpo.detail
        : "Não foi possível concluir a operação.";

    throw new ErroApi(detalhe, resposta.status);
  }

  return corpo as T;
}

function cabecalhoAutenticacao(): Record<string, string> {
  const token = obterToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type OpcoesRequisicao = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

// Usado em toda chamada que exige login: envia o token e, se a API
// responder 401 (token expirado ou inválido), encerra a sessão.
export async function fetchAutenticado(
  caminho: string,
  opcoes: OpcoesRequisicao = {},
): Promise<Response> {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: { ...opcoes.headers, ...cabecalhoAutenticacao() },
  });

  if (resposta.status === 401) {
    encerrarSessaoExpirada();
  }

  return resposta;
}

export async function cadastrarUsuario(
  dados: CadastroPayload,
): Promise<Usuario> {
  const resposta = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  return tratarResposta<Usuario>(resposta);
}

export async function fazerLogin(
  dados: LoginPayload,
): Promise<LoginResponse> {
  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  return tratarResposta<LoginResponse>(resposta);
}

export async function buscarUsuarioAtual(): Promise<Usuario> {
  const resposta = await fetchAutenticado("/auth/me");

  return tratarResposta<Usuario>(resposta);
}
