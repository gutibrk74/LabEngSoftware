import type { ReactNode } from "react";
import "../styles/quadras.css";
import type { Quadra } from "../services/quadras";
import {
  ESPORTES,
  formatarDimensoes,
  formatarHorario,
  formatarPreco,
} from "../utils/quadras";

type QuadraCardProps = {
  quadra: Quadra;
  acoes?: ReactNode;
};

export default function QuadraCard({ quadra, acoes }: QuadraCardProps) {
  const esporte = ESPORTES[quadra.tipo_esporte];

  const comodidades = [
    quadra.coberta && "Coberta",
    quadra.iluminacao && "Iluminação",
    quadra.replay && "Replay",
    quadra.vestiario && "Vestiário",
  ].filter(Boolean) as string[];

  return (
    <article
      className={`quadra-card ${quadra.ativa ? "" : "quadra-card--inativa"}`}
    >
      <div className="quadra-capa" style={{ background: esporte.fundo }}>
        <span className="quadra-emoji" aria-hidden="true">
          {esporte.emoji}
        </span>

        <span className="quadra-preco">
          {formatarPreco(quadra.preco_hora)}/h
        </span>

        {!quadra.ativa && <span className="quadra-status">Inativa</span>}

        <div className="quadra-capa-info">
          <h3>{quadra.nome}</h3>

          {comodidades.length > 0 && (
            <ul className="quadra-tags">
              {comodidades.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="quadra-rodape">
        <span>
          {esporte.nome} · {quadra.piso} ·{" "}
          <span className="sem-quebra">
            {formatarDimensoes(quadra.comprimento_m, quadra.largura_m)}
          </span>{" "}
          ·{" "}
          <span className="sem-quebra">
            {formatarHorario(quadra.hora_abertura, quadra.hora_fechamento)}
          </span>
        </span>

        {acoes && <div className="quadra-acoes">{acoes}</div>}
      </footer>
    </article>
  );
}
