import { useCallback, useEffect, useRef, useState } from "react";
import { buscarUsuarioAtual, renovarToken } from "../services/api";
import type { LoginResponse, Usuario } from "../services/api";
import { comBloqueioRenovacao, deveRenovar } from "../services/renovacaoSessao";
import {
  CHAVE_TOKEN,
  encerrarSessaoExpirada,
  EVENTO_SESSAO_EXPIRADA,
  limparSessao,
  mesmaSessao,
  obterExpiracaoToken,
  obterToken,
  salvarToken,
} from "../services/sessao";

const INTERVALO_VERIFICACAO_MS = 15_000;
const TIMEOUT_RENOVACAO_MS = 10_000;
const EVENTOS_ATIVIDADE = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

export function useSessao() {
  const tokenConhecido = useRef<string | null>(null);
  const versaoConsulta = useRef(0);
  const ultimaAtividade = useRef(0);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => obterToken() !== null);

  useEffect(() => {
    let ativo = true;
    let renovando = false;
    let controlador: AbortController | null = null;

    function sincronizarToken(inicial = false) {
      const token = obterToken();
      const anterior = tokenConhecido.current;
      if (!inicial && token === anterior) return;

      const renovacao = !inicial && mesmaSessao(anterior, token);
      tokenConhecido.current = token;
      const versao = ++versaoConsulta.current;
      controlador?.abort();

      if (!token) {
        ultimaAtividade.current = 0;
        setUsuario(null);
        setCarregando(false);
        if (!inicial) window.location.hash = "#/login";
        return;
      }

      // A troca de conta deve esconder o estado antigo. Uma simples renovação
      // preserva a tela, os modais e os formulários que já estão abertos.
      if (!renovacao) {
        ultimaAtividade.current = inicial ? Date.now() : 0;
        setUsuario(null);
        setCarregando(true);
      }

      const consultaAtual = () => ativo && versaoConsulta.current === versao && obterToken() === token;
      buscarUsuarioAtual()
        .then((dados) => {
          if (consultaAtual()) setUsuario(dados);
        })
        .catch(() => {
          // Em uma renovação, falhas transitórias não desmontam a tela.
          // Um 401 do token atual continua encerrando a sessão pela API.
          if (consultaAtual() && !renovacao) setUsuario(null);
        })
        .finally(() => {
          if (consultaAtual()) setCarregando(false);
        });
    }

    function aoMudarStorage(event: StorageEvent) {
      if (event.key === CHAVE_TOKEN || event.key === null) sincronizarToken();
    }

    function aoExpirarSessao() {
      sincronizarToken();
    }

    async function verificarSessao() {
      if (!ativo) return;
      // Também sincroniza caso um evento storage esteja atrasado.
      sincronizarToken();
      const token = obterToken();
      if (!token) return;

      const expiraEm = obterExpiracaoToken(token);
      const agora = Date.now();
      if (expiraEm === null || agora >= expiraEm) {
        encerrarSessaoExpirada(token);
        return;
      }

      const elegivel = () => deveRenovar(
        token, ultimaAtividade.current, Date.now(), document.visibilityState === "visible",
      );
      if (renovando || !elegivel()) return;

      renovando = true;
      try {
        await comBloqueioRenovacao(token, async () => {
          // Revalida depois de obter o bloqueio: outra aba pode ter renovado
          // ou o usuário pode ter saído enquanto aguardávamos.
          if (!ativo || obterToken() !== token || !elegivel()) return;

          const requisicao = new AbortController();
          controlador = requisicao;
          const timeout = window.setTimeout(() => requisicao.abort(), TIMEOUT_RENOVACAO_MS);
          try {
            const resposta = await renovarToken(token, requisicao.signal);
            if (!ativo || requisicao.signal.aborted || obterToken() !== token) return;

            ++versaoConsulta.current;
            salvarToken(resposta.access_token);
            tokenConhecido.current = resposta.access_token;
            setUsuario(resposta.usuario);
            setCarregando(false);
          } finally {
            window.clearTimeout(timeout);
            controlador = null;
          }
        });
      } catch {
        // Falhas transitórias não derrubam a sessão. O próximo ciclo tenta
        // novamente se ainda houver atividade e o token não tiver expirado.
      } finally {
        renovando = false;
      }
    }

    function registrarAtividade() {
      // Não atribui uma interação da sessão anterior a uma nova conta.
      sincronizarToken();
      if (obterToken()) ultimaAtividade.current = Date.now();
      void verificarSessao();
    }

    window.addEventListener("storage", aoMudarStorage);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
    for (const evento of EVENTOS_ATIVIDADE) {
      window.addEventListener(evento, registrarAtividade, { passive: true });
    }
    const timer = window.setInterval(verificarSessao, INTERVALO_VERIFICACAO_MS);
    document.addEventListener("visibilitychange", verificarSessao);
    sincronizarToken(true);
    void verificarSessao();

    return () => {
      ativo = false;
      controlador?.abort();
      window.clearInterval(timer);
      window.removeEventListener("storage", aoMudarStorage);
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
      document.removeEventListener("visibilitychange", verificarSessao);
      for (const evento of EVENTOS_ATIVIDADE) {
        window.removeEventListener(evento, registrarAtividade);
      }
    };
  }, []);

  const entrar = useCallback((resposta: LoginResponse) => {
    ++versaoConsulta.current;
    salvarToken(resposta.access_token);
    tokenConhecido.current = resposta.access_token;
    ultimaAtividade.current = Date.now();
    setUsuario(resposta.usuario);
    setCarregando(false);
    window.location.hash = "#/inicio";
  }, []);

  const sair = useCallback(() => {
    ++versaoConsulta.current;
    limparSessao();
    tokenConhecido.current = null;
    ultimaAtividade.current = 0;
    setUsuario(null);
    setCarregando(false);
    window.location.hash = "#/login";
  }, []);

  const atualizarUsuario = useCallback((dadosAtualizados: Usuario) => {
    if (tokenConhecido.current && obterToken() === tokenConhecido.current) {
      ++versaoConsulta.current;
      setUsuario((anterior) => anterior?.id === dadosAtualizados.id ? dadosAtualizados : anterior);
    }
  }, []);

  return { usuario, carregando, entrar, sair, atualizarUsuario };
}
