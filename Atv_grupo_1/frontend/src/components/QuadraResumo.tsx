import type { Quadra } from "../services/quadras";
import {
  COMODIDADES,
  ESPORTES,
  formatarDimensoes,
  formatarHorario,
  formatarPreco,
} from "../utils/quadras";

type QuadraResumoProps = {
  quadra: Quadra;
};

export default function QuadraResumo({ quadra }: QuadraResumoProps) {
  const esporte = ESPORTES[quadra.tipo_esporte];

  return (
    <aside className="quadra-resumo">
      <div
        className="quadra-resumo-capa"
        style={{ background: esporte.fundo }}
        aria-hidden="true"
      >
        {esporte.emoji}
      </div>

      <h3>{quadra.nome}</h3>
      <p className="quadra-resumo-detalhe">
        {esporte.nome} · {quadra.piso}
      </p>
      <p className="quadra-resumo-detalhe">
        {formatarDimensoes(quadra.comprimento_m, quadra.largura_m)}
      </p>
      <p className="quadra-resumo-detalhe">
        Aberta das{" "}
        {formatarHorario(quadra.hora_abertura, quadra.hora_fechamento)}
      </p>

      <p className="quadra-resumo-preco">
        {formatarPreco(quadra.preco_hora)}
        <span>/h</span>
      </p>

      <ul className="quadra-resumo-itens">
        {COMODIDADES.map(({ campo, rotulo }) => (
          <li
            key={campo}
            className={quadra[campo] ? "" : "quadra-resumo-item--ausente"}
          >
            {rotulo}
            <span aria-label={quadra[campo] ? "possui" : "não possui"}>
              {quadra[campo] ? "✓" : "✗"}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
