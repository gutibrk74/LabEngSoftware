import { useCallback, useEffect, useState } from "react";
import { listarReservasAdmin } from "../services/reservasAdmin";
import type {
  FiltrosReservasAdmin,
  ReservaAdmin,
} from "../services/reservasAdmin";

type Resultado = {
  chave: string;
  reservas: ReservaAdmin[];
  erro: string;
};

function montarChave(filtros: FiltrosReservasAdmin, versao: number): string {
  return [
    filtros.inicio ?? "",
    filtros.fim ?? "",
    filtros.quadraId ?? "",
    filtros.status ?? "",
    versao,
  ].join("|");
}

// Mesmo padrão do useQuadras: enquanto o resultado guardado não for da
// busca atual (filtros + versão do recarregar), está carregando; a lista
// anterior continua na tela até a nova chegar.
export function useReservasAdmin(filtros: FiltrosReservasAdmin) {
  const { inicio, fim, quadraId, status } = filtros;
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [versao, setVersao] = useState(0);

  const chave = montarChave({ inicio, fim, quadraId, status }, versao);

  useEffect(() => {
    let ativo = true;
    const busca = { inicio, fim, quadraId, status };
    const chaveBusca = montarChave(busca, versao);

    listarReservasAdmin(busca)
      .then((reservas) => {
        if (ativo) {
          setResultado({ chave: chaveBusca, reservas, erro: "" });
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setResultado({
            chave: chaveBusca,
            reservas: [],
            erro:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar as reservas.",
          });
        }
      });

    return () => {
      ativo = false;
    };
  }, [inicio, fim, quadraId, status, versao]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  const atual = resultado?.chave === chave;

  return {
    reservas: resultado?.reservas ?? [],
    carregando: !atual,
    erro: atual ? resultado.erro : "",
    recarregar,
  };
}
