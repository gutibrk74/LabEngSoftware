import { obterExpiracaoToken, obterToken } from "./sessao";

const JANELA_RENOVACAO_MS = 5 * 60_000;
const LIMITE_INATIVIDADE_MS = 5 * 60_000;
const NOME_BLOQUEIO = "reserva-gavea:renovacao-jwt";

export function deveRenovar(
  token: string,
  ultimaAtividade: number,
  agora: number,
  visivel: boolean,
): boolean {
  const expiraEm = obterExpiracaoToken(token);
  return visivel && ultimaAtividade > 0 &&
    agora - ultimaAtividade < LIMITE_INATIVIDADE_MS &&
    expiraEm !== null && agora < expiraEm &&
    expiraEm - agora <= JANELA_RENOVACAO_MS;
}

// Web Locks oferece exclusão mútua entre abas da mesma origem. Se não houver
// suporte (por exemplo, HTTP remoto), não arrisca renovação concorrente.
// A sessão continua funcionando e expira normalmente nesse caso.
export async function comBloqueioRenovacao(
  tokenEsperado: string,
  renovar: () => Promise<void>,
): Promise<void> {
  if (!navigator.locks) return;

  await navigator.locks.request(NOME_BLOQUEIO, { ifAvailable: true }, async (lock) => {
    if (!lock || obterToken() !== tokenEsperado) return;
    await renovar();
  });
}
