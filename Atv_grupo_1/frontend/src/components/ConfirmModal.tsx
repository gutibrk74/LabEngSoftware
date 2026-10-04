import { useEffect, useRef, useState } from "react";
import "../styles/modal.css";

type ConfirmModalProps = {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  onConfirmar: () => Promise<void>;
  onFechar: () => void;
};

export default function ConfirmModal({
  titulo,
  mensagem,
  textoConfirmar,
  onConfirmar,
  onFechar,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function confirmar() {
    setErro("");
    setProcessando(true);

    try {
      await onConfirmar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
      );
      setProcessando(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal modal--pequeno"
      aria-labelledby="confirm-titulo"
      aria-describedby="confirm-mensagem"
      onClose={onFechar}
    >
      <div className="modal-form">
        <h2 id="confirm-titulo" className="modal-titulo">
          {titulo}
        </h2>

        <p id="confirm-mensagem" className="modal-texto">
          {mensagem}
        </p>

        {erro && (
          <p className="form-erro" role="alert">
            {erro}
          </p>
        )}

        <footer className="modal-acoes">
          <button
            className="botao botao--secundario"
            type="button"
            onClick={onFechar}
            autoFocus
          >
            Voltar
          </button>

          <button
            className="botao botao--perigo"
            type="button"
            onClick={confirmar}
            disabled={processando}
          >
            {processando ? "Aguarde..." : textoConfirmar}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
