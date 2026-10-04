import { useCallback, useEffect, useState } from "react";
import { buscarUsuarioAtual } from "../services/api";
import type { LoginResponse, Usuario } from "../services/api";
import {
  encerrarSessaoExpirada,
  EVENTO_SESSAO_EXPIRADA,
  limparSessao,
  obterExpiracaoToken,
  obterToken,
  salvarToken,
} from "../services/sessao";

// Limite do setTimeout do navegador (~24,8 dias).
const ESPERA_MAXIMA_MS = 2_147_483_647;

export function useSessao() {
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

  // Encerra a sessão quando o token vence, mesmo sem nenhuma chamada à API.
  // Refeito a cada login e cancelado no logout (quando usuario muda).
  useEffect(() => {
    const token = obterToken();
    const expiraEm = usuario && token ? obterExpiracaoToken(token) : null;

    if (expiraEm === null) {
      return;
    }

    const verificarExpiracao = () => {
      if (Date.now() >= expiraEm) {
        encerrarSessaoExpirada();
      }
    };

    const espera = Math.min(
      Math.max(expiraEm - Date.now(), 0),
      ESPERA_MAXIMA_MS,
    );
    const timer = window.setTimeout(verificarExpiracao, espera);

    // Com o computador suspenso o timer pode atrasar; confere ao voltar.
    document.addEventListener("visibilitychange", verificarExpiracao);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", verificarExpiracao);
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

  return { usuario, carregando, entrar, sair };
}
