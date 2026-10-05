const CHAVE_TOKEN = "access_token";

export const EVENTO_SESSAO_EXPIRADA = "sessao-expirada";

export function obterToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function salvarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

// Lê o "exp" do JWT (em segundos) e devolve o momento da expiração em ms.
// Só decodifica o conteúdo; quem valida a assinatura é a API.
export function obterExpiracaoToken(token: string): number | null {
  try {
    const conteudo = token.split(".")[1];
    const json = atob(conteudo.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: unknown };

    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  // Chave usada por versões anteriores do login.
  localStorage.removeItem("usuario");
}

export function encerrarSessaoExpirada(): void {
  limparSessao();
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
}
