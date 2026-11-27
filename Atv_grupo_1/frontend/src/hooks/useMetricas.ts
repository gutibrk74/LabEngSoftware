import { useEffect, useState } from "react";
import { buscarMetricas } from "../services/metricas";
import type { Metricas } from "../services/metricas";

type Resultado = {
  chave: string;
  metricas: Metricas | null;
  erro: string;
};

// Mesmo padrão do useQuadras: enquanto o resultado guardado não for do
// período atual, está carregando; os números anteriores continuam na tela.
export function useMetricas(inicio: string, fim: string) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const chave = `${inicio}|${fim}`;

  useEffect(() => {
    let ativo = true;
    const chaveBusca = `${inicio}|${fim}`;

    buscarMetricas(inicio, fim)
      .then((metricas) => {
        if (ativo) {
          setResultado({ chave: chaveBusca, metricas, erro: "" });
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          // Não mantém os números do período anterior: pareceriam do novo.
          setResultado({
            chave: chaveBusca,
            metricas: null,
            erro:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar as métricas.",
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [inicio, fim]);

  const atual = resultado?.chave === chave;

  return {
    metricas: resultado?.metricas ?? null,
    carregando: !atual,
    erro: atual ? resultado.erro : "",
  };
}
