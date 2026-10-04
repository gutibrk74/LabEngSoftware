const API_URL =
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

async function tratarResposta<T>(resposta: Response): Promise<T> {
  const corpo = await resposta.json();

  if (!resposta.ok) {
    const detalhe =
      typeof corpo.detail === "string"
        ? corpo.detail
        : "Não foi possível concluir a operação.";

    throw new Error(detalhe);
  }

  return corpo as T;
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