import type { GradeHorarios } from "../services/reservas";
import { formatarHora, hojeIso } from "../utils/datas";

type ListaHorariosProps = {
  grade: GradeHorarios | null;
  carregando: boolean;
  erro: string;
  onReservar: (horario: number, valor: number) => void;
};

export default function ListaHorarios({
  grade,
  carregando,
  erro,
  onReservar,
}: ListaHorariosProps) {
  if (carregando) {
    return <p className="horarios-aviso">Carregando horários...</p>;
  }

  if (erro) {
    return (
      <p className="horarios-aviso horarios-aviso--erro" role="alert">
        {erro}
      </p>
    );
  }

  if (!grade || grade.horarios.length === 0) {
    return <p className="horarios-aviso">Nenhum horário neste dia.</p>;
  }

  const ehHoje = grade.data === hojeIso();
  const horaAtual = new Date().getHours();

  return (
    <ul className="lista-horarios">
      {grade.horarios.map(({ horario, disponivel, valor }) => {
        // A API só diz se está livre; aqui separamos o que já passou.
        const encerrado = !disponivel && ehHoje && horario <= horaAtual;
        const situacao = disponivel
          ? "livre"
          : encerrado
            ? "encerrado"
            : "reservado";

        return (
          <li key={horario} className="horario-linha">
            <span className="horario-hora">{formatarHora(horario)}</span>

            {situacao === "livre" ? (
              <button
                type="button"
                className="horario-slot horario-slot--livre"
                onClick={() => onReservar(horario, valor)}
              >
                + Disponível — clique para reservar
              </button>
            ) : (
              <div className={`horario-slot horario-slot--${situacao}`}>
                {situacao === "reservado" ? "Reservado" : "Encerrado"}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
