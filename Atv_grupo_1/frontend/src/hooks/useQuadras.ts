import { useCallback, useEffect, useState } from "react";
import { listarQuadras, listarQuadrasAdmin } from "../services/quadras";
import type { Quadra } from "../services/quadras";

// incluirInativas=true usa a rota de admin (exige perfil administrador).
export function useQuadras(incluirInativas: boolean) {
  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;

    const buscar = incluirInativas ? listarQuadrasAdmin : listarQuadras;

    buscar()
      .then((dados) => {
        if (ativo) {
          setQuadras(dados);
          setErro("");
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as quadras.",
          );
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
  }, [incluirInativas, versao]);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setVersao((atual) => atual + 1);
  }, []);

  return { quadras, carregando, erro, recarregar };
}
