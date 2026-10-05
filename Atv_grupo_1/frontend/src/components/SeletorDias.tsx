import { diaDaSemanaCurto, paraDataIso } from "../utils/datas";

type SeletorDiasProps = {
  dias: Date[];
  selecionado: string;
  onSelecionar: (dataIso: string) => void;
};

export default function SeletorDias({
  dias,
  selecionado,
  onSelecionar,
}: SeletorDiasProps) {
  return (
    <div className="seletor-dias" role="group" aria-label="Escolha o dia">
      {dias.map((dia) => {
        const iso = paraDataIso(dia);
        const ativo = iso === selecionado;

        return (
          <button
            key={iso}
            type="button"
            className={`seletor-dia ${ativo ? "seletor-dia--ativo" : ""}`}
            aria-pressed={ativo}
            onClick={() => onSelecionar(iso)}
          >
            <span>{diaDaSemanaCurto(dia)}</span>
            <strong>{String(dia.getDate()).padStart(2, "0")}</strong>
          </button>
        );
      })}
    </div>
  );
}
