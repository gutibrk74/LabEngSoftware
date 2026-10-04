import { useCallback, useEffect, useState } from "react";
import { buscarUsuarioAtual, ErroApi } from "../services/api";
import type { LoginResponse, Usuario } from "../services/api";
import { limparSessao, obterToken, salvarToken } from "../services/sessao";

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
      .catch((erro: unknown) => {
        if (erro instanceof ErroApi && erro.status === 401) {
          limparSessao();
        }
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
