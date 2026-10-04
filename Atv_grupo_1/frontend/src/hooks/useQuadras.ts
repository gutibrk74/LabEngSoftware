import { useCallback, useEffect, useState } from "react";
import { listarQuadras, listarQuadrasAdmin } from "../services/quadras";
import type { FiltrosQuadras, Quadra } from "../services/quadras";

type Resultado = {
  chave: string;
  quadras: Quadra[];
  erro: string;
};

// incluirInativas=true usa a rota de admin (exige perfil administrador).
// Os filtros (esporte e data) valem para a lista pública.
// Enquanto o resultado guardado não for dos filtros atuais, está carregando;
// a lista anterior continua na tela até a nova chegar.
export function useQuadras(
  incluirInativas: boolean,
  filtros: FiltrosQuadras = {},
) {
  const esporte = filtros.esporte || undefined;
  const data = filtros.data || undefined;

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [versao, setVersao] = useState(0);

  const chave = `${incluirInativas}|${esporte ?? ""}|${data ?? ""}`;

  useEffect(() => {
    let ativo = true;
    const chaveBusca = `${incluirInativas}|${esporte ?? ""}|${data ?? ""}`;
    const busca = incluirInativas
      ? listarQuadrasAdmin()
      : listarQuadras({ esporte, data });

    busca
      .then((quadras) => {
        if (ativo) {
          setResultado({ chave: chaveBusca, quadras, erro: "" });
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setResultado({
            chave: chaveBusca,
            quadras: [],
            erro:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar as quadras.",
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [incluirInativas, esporte, data, versao]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  const atual = resultado?.chave === chave;

  return {
    quadras: resultado?.quadras ?? [],
    carregando: !atual,
    erro: atual ? resultado.erro : "",
    recarregar,
  };
}
