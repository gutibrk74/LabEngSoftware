import { encerrarSessaoExpirada, obterToken } from "./sessao";

// Por padrão usa o proxy do Vite ("/api" -> backend). VITE_API_URL permite
// apontar direto para outro endereço.
export const API_URL = import.meta.env.VITE_API_URL ?? "/api";

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

export type AtualizarPerfilPayload = {
  nome: string;
  telefone: string;
  cidade: string;
};

export type AlterarSenhaPayload = {
  senha_atual: string;
  nova_senha: string;
  confirmar_nova_senha: string;
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

export type ErrosValidacao = Record<string, string>;

type ItemErroFastAPI = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

// Traduz as mensagens padrão do Pydantic quando a API devolve erro 422
function traduzirMensagemValidacao(item: ItemErroFastAPI): string {
  const mensagem = item.msg ?? "Valor inválido.";

  if (item.type === "string_too_short") {
    const min = mensagem.match(/at least (\d+)/)?.[1];
    return min ? `Deve conter pelo menos ${min} caracteres.` : mensagem;
  }

  if (item.type === "string_too_long") {
    const max = mensagem.match(/at most (\d+)/)?.[1];
    return max ? `Deve conter no máximo ${max} caracteres.` : mensagem;
  }

  return mensagem.replace(/^Value error,\s*/i, "");
}

// Mapeia o array "detail" do FastAPI para um dicionário { campo: mensagem }
function extrairErrosCampos(detail: unknown): ErrosValidacao {
  if (!Array.isArray(detail)) {
    return {};
  }

  const erros: ErrosValidacao = {};
  for (const item of detail as ItemErroFastAPI[]) {
    if (!Array.isArray(item.loc) || item.loc.length === 0) {
      continue;
    }

    const campo = String(item.loc[item.loc.length - 1]);
    if (!erros[campo]) {
      erros[campo] = traduzirMensagemValidacao(item);
    }
  }

  return erros;
}

export class ErroApi extends Error {
  readonly status: number;
  readonly errosCampos: ErrosValidacao;

  constructor(
    mensagem: string,
    status: number,
    errosCampos: ErrosValidacao = {},
  ) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.errosCampos = errosCampos;
  }
}

export async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (resposta.status === 204) {
    return undefined as T;
  }

  const corpo = await resposta.json();

  if (!resposta.ok) {
    const errosCampos =
      resposta.status === 422 ? extrairErrosCampos(corpo.detail) : {};
    const primeiroErroCampo = Object.values(errosCampos)[0];

    const detalhe =
      typeof corpo.detail === "string"
        ? corpo.detail
        : primeiroErroCampo ?? "Não foi possível concluir a operação.";

    throw new ErroApi(detalhe, resposta.status, errosCampos);
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
  const autenticacao = cabecalhoAutenticacao();
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: { ...opcoes.headers, ...autenticacao },
  });

  if (
    resposta.status === 401 &&
    autenticacao.Authorization === cabecalhoAutenticacao().Authorization
  ) {
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

export async function fazerLogin(dados: LoginPayload): Promise<LoginResponse> {
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

export async function atualizarPerfil(
  dados: AtualizarPerfilPayload,
): Promise<Usuario> {
  const resposta = await fetchAutenticado("/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  return tratarResposta<Usuario>(resposta);
}

export async function alterarSenha(
  dados: AlterarSenhaPayload,
): Promise<void> {
  const resposta = await fetchAutenticado("/auth/me/senha", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  return tratarResposta<void>(resposta);
}

// Usa exatamente o token que motivou a renovação, não um login posterior.
export async function renovarToken(
  token: string,
  signal: AbortSignal,
): Promise<LoginResponse> {
  const resposta = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (resposta.status === 401 && obterToken() === token) {
    encerrarSessaoExpirada();
  }

  return tratarResposta<LoginResponse>(resposta);
}
