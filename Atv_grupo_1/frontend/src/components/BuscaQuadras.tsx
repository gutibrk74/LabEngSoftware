import type { TipoEsporte } from "../services/quadras";
import { hojeIso, paraDataIso, proximosDias } from "../utils/datas";
import { ESPORTES } from "../utils/quadras";

// Mesmo limite de antecedência do backend.
const DIAS_PERMITIDOS = 31;

type BuscaQuadrasProps = {
  esporte: TipoEsporte | "";
  data: string;
  onEsporte: (esporte: TipoEsporte | "") => void;
  onData: (data: string) => void;
};

export default function BuscaQuadras({
  esporte,
  data,
  onEsporte,
  onData,
}: BuscaQuadrasProps) {
  const dias = proximosDias(DIAS_PERMITIDOS);
  const ultimoDia = paraDataIso(dias[dias.length - 1]);
  const temFiltro = esporte !== "" || data !== "";

  return (
    <div className="busca-quadras" role="search">
      <div className="busca-campo">
        <label htmlFor="busca-esporte">Esporte</label>
        <select
          id="busca-esporte"
          value={esporte}
          onChange={(event) =>
            onEsporte(event.target.value as TipoEsporte | "")
          }
        >
          <option value="">Todos os esportes</option>
          {Object.entries(ESPORTES).map(([valor, info]) => (
            <option key={valor} value={valor}>
              {info.emoji} {info.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="busca-campo">
        <label htmlFor="busca-data">Data</label>
        <input
          id="busca-data"
          type="date"
          value={data}
          min={hojeIso()}
          max={ultimoDia}
          onChange={(event) => onData(event.target.value)}
        />
      </div>

      {temFiltro && (
        <button
          className="busca-limpar"
          type="button"
          onClick={() => {
            onEsporte("");
            onData("");
          }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
