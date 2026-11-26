import { useCallback, useEffect, useRef, useState } from "react";
import { buscarUsuarioAtual, renovarToken } from "../services/api";
import type { LoginResponse, Usuario } from "../services/api";
import {
  encerrarSessaoExpirada,
  EVENTO_SESSAO_EXPIRADA,
  limparSessao,
  obterExpiracaoToken,
  obterToken,
  salvarToken,
} from "../services/sessao";

// Política de renovação e atividade da sessão.
const JANELA_RENOVACAO_MS = 5 * 60_000;
const LIMITE_INATIVIDADE_MS = 5 * 60_000;
const INTERVALO_VERIFICACAO_MS = 15_000;
const TIMEOUT_RENOVACAO_MS = 10_000;
const EVENTOS_ATIVIDADE = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

export function useSessao() {
  const ultimaAtividade = useRef(0);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => obterToken() !== null);

  useEffect(() => {
    if (!obterToken()) {
      return;
    }

    let ativo = true;

    buscarUsuarioAtual()
      .then((dados) => {
        if (ativo) {
          setUsuario(dados);
        }
      })
      .catch(() => {
        // Token inválido já é tratado pelo fetchAutenticado (401).
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    function aoExpirarSessao() {
      setUsuario(null);
      window.location.hash = "#/login";
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);

    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    function aoMudarStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== "access_token") {
        return;
      }

      const token = obterToken();

      if (!token) {
        setUsuario(null);
        setCarregando(false);
        window.location.hash = "#/login";
        return;
      }

      setCarregando(true);

      buscarUsuarioAtual()
        .then((dados) => {
          if (ativo) {
            setUsuario(dados);
          }
        })
        .catch(() => {
          if (ativo) {
            setUsuario(null);
          }
        })
        .finally(() => {
          if (ativo) {
            setCarregando(false);
          }
        });
    }

    window.addEventListener("storage", aoMudarStorage);

    return () => {
      ativo = false;
      window.removeEventListener("storage", aoMudarStorage);
    };
  }, []);

  // Renova somente enquanto há interação recente e a aba está visível.
  // O intervalo também verifica a expiração sem depender de chamadas à API.
  useEffect(() => {
    if (!usuario) return;

    let ativo = true;
    let renovando = false;
    let controlador: AbortController | null = null;
    ultimaAtividade.current = Date.now();

    async function verificarSessao() {
      const token = obterToken();
      if (!token || !ativo) return;

      const expiraEm = obterExpiracaoToken(token);
      const agora = Date.now();
      if (expiraEm === null || agora >= expiraEm) {
        if (obterToken() === token) encerrarSessaoExpirada();
        return;
      }

      if (
        renovando || document.visibilityState !== "visible" ||
        agora - ultimaAtividade.current >= LIMITE_INATIVIDADE_MS ||
        expiraEm - agora > JANELA_RENOVACAO_MS
      ) return;

      renovando = true;
      const requisicao = new AbortController();
      controlador = requisicao;
      const timeout = window.setTimeout(() => requisicao.abort(), TIMEOUT_RENOVACAO_MS);
      try {
        const resposta = await renovarToken(token, requisicao.signal);
        // Logout, novo login ou outra renovação podem ter ocorrido no intervalo.
        if (ativo && obterToken() === token) {
          salvarToken(resposta.access_token);
          setUsuario(resposta.usuario);
        }
      } catch {
        // Falha transitória: tenta novamente enquanto o token for válido.
      } finally {
        window.clearTimeout(timeout);
        controlador = null;
        renovando = false;
      }
    }

    function registrarAtividade() {
      ultimaAtividade.current = Date.now();
      void verificarSessao();
    }

    for (const evento of EVENTOS_ATIVIDADE) {
      window.addEventListener(evento, registrarAtividade, { passive: true });
    }
    const timer = window.setInterval(verificarSessao, INTERVALO_VERIFICACAO_MS);
    document.addEventListener("visibilitychange", verificarSessao);
    void verificarSessao();

    return () => {
      ativo = false;
      controlador?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", verificarSessao);
      for (const evento of EVENTOS_ATIVIDADE) {
        window.removeEventListener(evento, registrarAtividade);
      }
    };
  }, [usuario]);

  const entrar = useCallback((resposta: LoginResponse) => {
    salvarToken(resposta.access_token);
    setUsuario(resposta.usuario);
    window.location.hash = "#/inicio";
  }, []);

  const sair = useCallback(() => {
    limparSessao();
    setUsuario(null);
    window.location.hash = "#/login";
  }, []);

  const atualizarUsuario = useCallback((dadosAtualizados: Usuario) => {
    setUsuario(dadosAtualizados);
  }, []);

  return { usuario, carregando, entrar, sair, atualizarUsuario };
}