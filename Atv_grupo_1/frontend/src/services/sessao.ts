const CHAVE_TOKEN = "access_token";

export function obterToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function salvarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  // Chave usada por versões anteriores do login.
  localStorage.removeItem("usuario");
}
