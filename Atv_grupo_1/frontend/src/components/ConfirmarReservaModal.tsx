import { useEffect, useRef, useState } from "react";
import "../styles/modal.css";
import type { Quadra } from "../services/quadras";
import { criarReserva } from "../services/reservas";
import type { Reserva } from "../services/reservas";
import { formatarDataExtenso, formatarHora } from "../utils/datas";
import { ESPORTES, formatarPreco } from "../utils/quadras";

type ConfirmarReservaModalProps = {
  quadra: Quadra;
  data: string;
  horario: number;
  valor: number;
  onFechar: () => void;
};

export default function ConfirmarReservaModal({
  quadra,
  data,
  horario,
  valor,
  onFechar,
}: ConfirmarReservaModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const confirmada = reserva !== null;
  const [erro, setErro] = useState("");

  // Enquanto a reserva está sendo gravada a janela não pode fechar: a grade
  // seria recarregada antes da gravação e mostraria o horário como livre.
  // Se o navegador fechar mesmo assim, o fechamento espera a resposta.
  const enviandoRef = useRef(false);
  const fecharAoTerminarRef = useRef(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function fechar() {
    if (enviandoRef.current) {
      fecharAoTerminarRef.current = true;
      return;
    }

    onFechar();
  }

  async function confirmar() {
    setErro("");
    setEnviando(true);
    enviandoRef.current = true;

    try {
      setReserva(
        await criarReserva({
          quadra_id: quadra.id,
          data,
          horario,
          valor_esperado: valor,
        }),
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a reserva.",
      );
    } finally {
      enviandoRef.current = false;
      setEnviando(false);

      if (fecharAoTerminarRef.current) {
        onFechar();
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal modal--pequeno"
      aria-labelledby="reserva-titulo"
      onCancel={(event) => {
        // Bloqueia o Esc durante o envio.
        if (enviandoRef.current) {
          event.preventDefault();
        }
      }}
      onClose={fechar}
    >
      <div className="modal-form">
        <header className="modal-cabecalho">
          <h2 id="reserva-titulo" className="modal-titulo">
            {confirmada ? "Reserva confirmada!" : "Revise sua reserva"}
          </h2>

          <button
            className="modal-fechar"
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            disabled={enviando}
          >
            ×
          </button>
        </header>

        <dl className="reserva-resumo">
          <div>
            <dt>Quadra</dt>
            <dd>
              {ESPORTES[quadra.tipo_esporte].emoji} {quadra.nome}
            </dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{formatarDataExtenso(data)}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>
              {formatarHora(horario)} – {formatarHora(horario + 1)}
            </dd>
          </div>
          <div>
            <dt>Valor</dt>
            <dd className="reserva-resumo-valor">
              {formatarPreco(reserva?.valor ?? valor)}
            </dd>
          </div>
        </dl>

        <p className="modal-texto">
          {confirmada
            ? "Sua reserva está pendente de pagamento. Você verá o " +
              "pagamento na próxima etapa."
            : "O horário fica garantido para você assim que confirmar. " +
              "O pagamento é feito na próxima etapa."}
        </p>

        {erro && (
          <p className="form-erro" role="alert">
            {erro}
          </p>
        )}

        <footer className="modal-acoes">
          {confirmada ? (
            <button
              className="botao botao--primario"
              type="button"
              onClick={fechar}
              autoFocus
            >
              Concluir
            </button>
          ) : (
            <>
              <button
                className="botao botao--secundario"
                type="button"
                onClick={fechar}
                disabled={enviando}
              >
                Voltar
              </button>

              <button
                className="botao botao--primario"
                type="button"
                onClick={confirmar}
                disabled={enviando || erro !== ""}
              >
                {enviando ? "Confirmando..." : "Confirmar reserva"}
              </button>
            </>
          )}
        </footer>
      </div>
    </dialog>
  );
}
