import { useState } from "react";
import "../styles/horarios.css";
import ConfirmarReservaModal from "../components/ConfirmarReservaModal";
import ListaHorarios from "../components/ListaHorarios";
import QuadraResumo from "../components/QuadraResumo";
import SeletorDias from "../components/SeletorDias";
import { useGradeHorarios } from "../hooks/useGradeHorarios";
import { useQuadras } from "../hooks/useQuadras";
import { useRelogio } from "../hooks/useRelogio";
import { hojeIso, proximosDias } from "../utils/datas";
import { ESPORTES } from "../utils/quadras";

const DIAS_EXIBIDOS = 14;

type Escolha = { horario: number; valor: number };

export default function HorariosPage() {
  const {
    quadras,
    carregando,
    erro,
    recarregar: recarregarQuadras,
  } = useQuadras(false);
  const [data, setData] = useState(hojeIso);
  const [quadraEscolhida, setQuadraEscolhida] = useState<number | null>(null);
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const relogio = useRelogio();

  // Se o dia virar com a tela aberta, um dia que ficou no passado passa a
  // ser o novo "hoje".
  const dia = data < relogio.hoje ? relogio.hoje : data;

  // Sem escolha do usuário, mostra a primeira quadra da lista.
  const quadra =
    quadras.find(({ id }) => id === quadraEscolhida) ?? quadras[0] ?? null;

  const grade = useGradeHorarios(
    quadra?.id ?? null,
    dia,
    `${relogio.hoje} ${relogio.hora}`,
  );

  function fecharReserva() {
    setEscolha(null);
    // Atualiza grade e quadras: o horário pode ter sido reservado e o preço
    // pode ter mudado enquanto a revisão estava aberta.
    grade.recarregar();
    recarregarQuadras();
  }

  // Só mostra "Carregando" na primeira vez; ao atualizar, mantém a tela.
  if (carregando && quadras.length === 0) {
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
        selecionado={dia}
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
          hoje={relogio.hoje}
          hora={relogio.hora}
          onReservar={(horario, valor) => setEscolha({ horario, valor })}
        />
      </div>

      {escolha && (
        <ConfirmarReservaModal
          quadra={quadra}
          data={dia}
          horario={escolha.horario}
          valor={escolha.valor}
          onFechar={fecharReserva}
        />
      )}
    </section>
  );
}
