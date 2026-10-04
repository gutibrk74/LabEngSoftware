import { useState } from "react";
import "../styles/horarios.css";
import ListaHorarios from "../components/ListaHorarios";
import QuadraResumo from "../components/QuadraResumo";
import SeletorDias from "../components/SeletorDias";
import { useGradeHorarios } from "../hooks/useGradeHorarios";
import { useQuadras } from "../hooks/useQuadras";
import { hojeIso, proximosDias } from "../utils/datas";
import { ESPORTES } from "../utils/quadras";

const DIAS_EXIBIDOS = 14;

export default function HorariosPage() {
  const { quadras, carregando, erro } = useQuadras(false);
  const [data, setData] = useState(hojeIso);
  const [quadraEscolhida, setQuadraEscolhida] = useState<number | null>(null);

  // Sem escolha do usuário, mostra a primeira quadra da lista.
  const quadra =
    quadras.find(({ id }) => id === quadraEscolhida) ?? quadras[0] ?? null;

  const grade = useGradeHorarios(quadra?.id ?? null, data);

  if (carregando) {
    return <p className="horarios-aviso">Carregando quadras...</p>;
  }

  if (erro) {
    return (
      <p className="horarios-aviso horarios-aviso--erro" role="alert">
        {erro}
      </p>
    );
  }

  if (!quadra) {
    return (
      <p className="horarios-aviso">Nenhuma quadra disponível no momento.</p>
    );
  }

  return (
    <section className="horarios-page">
      <SeletorDias
        dias={proximosDias(DIAS_EXIBIDOS)}
        selecionado={data}
        onSelecionar={setData}
      />

      <div
        className="seletor-quadras"
        role="group"
        aria-label="Escolha a quadra"
      >
        {quadras.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`seletor-quadra ${
              item.id === quadra.id ? "seletor-quadra--ativa" : ""
            }`}
            aria-pressed={item.id === quadra.id}
            onClick={() => setQuadraEscolhida(item.id)}
          >
            <span aria-hidden="true">{ESPORTES[item.tipo_esporte].emoji}</span>
            {item.nome}
          </button>
        ))}
      </div>

      <div className="horarios-conteudo">
        <QuadraResumo quadra={quadra} />

        <ListaHorarios
          grade={grade.grade}
          carregando={grade.carregando}
          erro={grade.erro}
        />
      </div>
    </section>
  );
}
