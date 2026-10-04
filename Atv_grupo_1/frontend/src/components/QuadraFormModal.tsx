import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "../styles/modal.css";
import { atualizarQuadra, criarQuadra } from "../services/quadras";
import type { Quadra, QuadraPayload, TipoEsporte } from "../services/quadras";
import { ESPORTES } from "../utils/quadras";

type QuadraFormModalProps = {
  quadra?: Quadra;
  onFechar: () => void;
  onSalvar: () => void;
};

const HORAS_ABERTURA = Array.from({ length: 24 }, (_, hora) => hora);
const HORAS_FECHAMENTO = Array.from({ length: 24 }, (_, hora) => hora + 1);

const COMODIDADES = [
  { campo: "coberta", rotulo: "Coberta" },
  { campo: "iluminacao", rotulo: "Iluminação" },
  { campo: "replay", rotulo: "Replay" },
  { campo: "vestiario", rotulo: "Vestiário" },
] as const;

export default function QuadraFormModal({
  quadra,
  onFechar,
  onSalvar,
}: QuadraFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const editando = quadra !== undefined;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setSalvando(true);

    const data = new FormData(event.currentTarget);

    const dados: QuadraPayload = {
      nome: String(data.get("nome") ?? "").trim(),
      tipo_esporte: String(data.get("tipo_esporte")) as TipoEsporte,
      piso: String(data.get("piso") ?? "").trim(),
      comprimento_m: Number(data.get("comprimento_m")),
      largura_m: Number(data.get("largura_m")),
      preco_hora: Number(data.get("preco_hora")),
      hora_abertura: Number(data.get("hora_abertura")),
      hora_fechamento: Number(data.get("hora_fechamento")),
      coberta: data.has("coberta"),
      iluminacao: data.has("iluminacao"),
      replay: data.has("replay"),
      vestiario: data.has("vestiario"),
    };

    try {
      if (editando) {
        await atualizarQuadra(quadra.id, {
          ...dados,
          ativa: data.has("ativa"),
        });
      } else {
        await criarQuadra(dados);
      }

      onSalvar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a quadra.",
      );
      setSalvando(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="quadra-form-titulo"
      onClose={onFechar}
    >
      <form className="modal-form" onSubmit={handleSubmit}>
        <header className="modal-cabecalho">
          <h2 id="quadra-form-titulo">
            {editando ? "Editar quadra" : "Nova quadra"}
          </h2>

          <button
            className="modal-fechar"
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
          >
            ×
          </button>
        </header>

        <div className="form-campo">
          <label htmlFor="quadra-nome">Nome</label>
          <input
            id="quadra-nome"
            name="nome"
            defaultValue={quadra?.nome}
            placeholder="Ex.: Quadra de Tênis A"
            minLength={3}
            maxLength={100}
            required
          />
        </div>

        <div className="form-linha">
          <div className="form-campo">
            <label htmlFor="quadra-esporte">Esporte</label>
            <select
              id="quadra-esporte"
              name="tipo_esporte"
              defaultValue={quadra?.tipo_esporte ?? "futebol"}
            >
              {Object.entries(ESPORTES).map(([valor, info]) => (
                <option key={valor} value={valor}>
                  {info.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-campo">
            <label htmlFor="quadra-piso">Piso</label>
            <input
              id="quadra-piso"
              name="piso"
              defaultValue={quadra?.piso}
              placeholder="Ex.: Saibro"
              minLength={2}
              maxLength={60}
              required
            />
          </div>
        </div>

        <div className="form-linha form-linha--tres">
          <div className="form-campo">
            <label htmlFor="quadra-comprimento">Comprimento (m)</label>
            <input
              id="quadra-comprimento"
              name="comprimento_m"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="999.99"
              step="0.01"
              defaultValue={quadra?.comprimento_m}
              required
            />
          </div>

          <div className="form-campo">
            <label htmlFor="quadra-largura">Largura (m)</label>
            <input
              id="quadra-largura"
              name="largura_m"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="999.99"
              step="0.01"
              defaultValue={quadra?.largura_m}
              required
            />
          </div>

          <div className="form-campo">
            <label htmlFor="quadra-preco">Preço/hora (R$)</label>
            <input
              id="quadra-preco"
              name="preco_hora"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              defaultValue={quadra?.preco_hora}
              required
            />
          </div>
        </div>

        <div className="form-linha">
          <div className="form-campo">
            <label htmlFor="quadra-abertura">Abre às</label>
            <select
              id="quadra-abertura"
              name="hora_abertura"
              defaultValue={quadra?.hora_abertura ?? 8}
            >
              {HORAS_ABERTURA.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}h
                </option>
              ))}
            </select>
          </div>

          <div className="form-campo">
            <label htmlFor="quadra-fechamento">Fecha às</label>
            <select
              id="quadra-fechamento"
              name="hora_fechamento"
              defaultValue={quadra?.hora_fechamento ?? 22}
            >
              {HORAS_FECHAMENTO.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}h
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="form-opcoes">
          <legend>Comodidades</legend>

          {COMODIDADES.map(({ campo, rotulo }) => (
            <label key={campo} className="form-check">
              <input
                type="checkbox"
                name={campo}
                defaultChecked={quadra?.[campo] ?? false}
              />
              {rotulo}
            </label>
          ))}
        </fieldset>

        {editando && (
          <label className="form-check form-check--destaque">
            <input type="checkbox" name="ativa" defaultChecked={quadra.ativa} />
            Quadra ativa (visível para os atletas)
          </label>
        )}

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
          >
            Cancelar
          </button>

          <button
            className="botao botao--primario"
            type="submit"
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
