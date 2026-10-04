import { useCallback, useEffect, useState } from "react";
import { buscarUsuarioAtual } from "../services/api";
import type { LoginResponse, Usuario } from "../services/api";
import {
  EVENTO_SESSAO_EXPIRADA,
  limparSessao,
  obterToken,
  salvarToken,
} from "../services/sessao";

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
