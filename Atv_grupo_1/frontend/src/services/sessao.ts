export const CHAVE_TOKEN = "access_token";
export const EVENTO_SESSAO_EXPIRADA = "sessao-expirada";

export function obterToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function salvarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

// Só decodifica o conteúdo; quem valida a assinatura é a API.
function lerClaims(token: string): { exp?: unknown; sid?: unknown; sub?: unknown } | null {
  try {
    const conteudo = token.split(".")[1];
    const json = atob(conteudo.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function obterExpiracaoToken(token: string): number | null {
  const exp = lerClaims(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
}

// O sid permanece na renovação, mas muda a cada login, inclusive da mesma conta.
export function mesmaSessao(anterior: string | null, atual: string | null): boolean {
  if (!anterior || !atual) return false;
  if (anterior === atual) return true;
  const a = lerClaims(anterior);
  const b = lerClaims(atual);
  return typeof a?.sid === "string" && a.sid.length > 0 &&
    a.sid === b?.sid && a.sub === b?.sub;
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  // Chave usada por versões anteriores do login.
  localStorage.removeItem("usuario");
}

export function encerrarSessaoExpirada(tokenEsperado?: string): void {
  if (tokenEsperado !== undefined && obterToken() !== tokenEsperado) return;
  limparSessao();
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
}
