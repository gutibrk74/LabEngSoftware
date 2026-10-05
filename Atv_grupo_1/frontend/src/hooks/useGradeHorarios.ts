import { useCallback, useEffect, useState } from "react";
import { buscarGradeHorarios } from "../services/reservas";
import type { GradeHorarios } from "../services/reservas";

type Resultado = {
  chave: string;
  grade: GradeHorarios | null;
  erro: string;
};

// Busca a grade da quadra no dia escolhido. Enquanto o resultado guardado
// não for da combinação atual (quadra + data), a grade está carregando.
// Ao recarregar a mesma combinação, a grade antiga fica na tela até a nova
// chegar (sem piscar "Carregando..."). Quando "atualizacao" muda (ex.: a
// virada da hora), a grade é buscada de novo.
export function useGradeHorarios(
  quadraId: number | null,
  data: string,
  atualizacao = "",
) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [versao, setVersao] = useState(0);

  const chave = quadraId === null ? null : `${quadraId}|${data}`;

  useEffect(() => {
    if (quadraId === null) {
      return;
    }

    let ativo = true;
    const chaveBusca = `${quadraId}|${data}`;

    buscarGradeHorarios(quadraId, data)
      .then((grade) => {
        if (ativo) {
          setResultado({ chave: chaveBusca, grade, erro: "" });
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setResultado({
            chave: chaveBusca,
            grade: null,
            erro:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os horários.",
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [quadraId, data, versao, atualizacao]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  const atual = resultado?.chave === chave ? resultado : null;

  return {
    grade: atual?.grade ?? null,
    erro: atual?.erro ?? "",
    carregando: chave !== null && atual === null,
    recarregar,
  };
}
