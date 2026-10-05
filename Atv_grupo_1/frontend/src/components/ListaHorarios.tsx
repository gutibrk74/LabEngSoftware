import type { GradeHorarios } from "../services/reservas";
import { formatarHora } from "../utils/datas";

type ListaHorariosProps = {
  grade: GradeHorarios | null;
  carregando: boolean;
  erro: string;
  // Dia e hora atuais (São Paulo), vindos do useRelogio.
  hoje: string;
  hora: number;
  onReservar: (horario: number, valor: number) => void;
};

export default function ListaHorarios({
  grade,
  carregando,
  erro,
  hoje,
  hora,
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

  const ehHoje = grade.data === hoje;

  return (
    <ul className="lista-horarios">
      {grade.horarios.map(({ horario, disponivel, valor }) => {
        // Horário de hoje que já começou fica encerrado na hora, mesmo que a
        // grade ainda não tenha sido buscada de novo.
        const encerrado = ehHoje && horario <= hora;
        const situacao = encerrado
          ? "encerrado"
          : disponivel
            ? "livre"
            : "reservado";
        const inicio = formatarHora(horario);
        const fim = formatarHora(horario + 1);

        return (
          <li key={horario} className="horario-linha">
            <span className="horario-hora">{inicio}</span>

            {situacao === "livre" ? (
              <button
                type="button"
                className="horario-slot horario-slot--livre"
                aria-label={`Reservar das ${inicio} às ${fim}`}
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
