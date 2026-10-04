import { useState } from "react";
import "../styles/quadras.css";
import ConfirmModal from "../components/ConfirmModal";
import QuadraCard from "../components/QuadraCard";
import QuadraFormModal from "../components/QuadraFormModal";
import { useQuadrasAdmin } from "../hooks/useQuadrasAdmin";
import { atualizarQuadra, inativarQuadra } from "../services/quadras";
import type { Quadra } from "../services/quadras";

type Formulario = { aberto: false } | { aberto: true; quadra?: Quadra };

export default function QuadrasAdminPage() {
  const { quadras, carregando, erro, recarregar } = useQuadrasAdmin();
  const [formulario, setFormulario] = useState<Formulario>({ aberto: false });
  const [quadraParaInativar, setQuadraParaInativar] = useState<Quadra | null>(
    null,
  );
  const [erroAcao, setErroAcao] = useState("");

  function fecharFormulario() {
    setFormulario({ aberto: false });
  }

  function aoSalvar() {
    fecharFormulario();
    recarregar();
  }

  async function confirmarInativacao() {
    if (!quadraParaInativar) {
      return;
    }

    await inativarQuadra(quadraParaInativar.id);
    setQuadraParaInativar(null);
    recarregar();
  }

  async function reativar(quadra: Quadra) {
    setErroAcao("");
    const { id, ...dados } = quadra;

    try {
      await atualizarQuadra(id, { ...dados, ativa: true });
      recarregar();
    } catch (error) {
      setErroAcao(
        error instanceof Error
          ? error.message
          : "Não foi possível reativar a quadra.",
      );
    }
  }

  const ativas = quadras.filter((quadra) => quadra.ativa).length;

  return (
    <section className="quadras-page">
      <header className="quadras-cabecalho">
        <div>
          <h2>Gestão de Quadras</h2>
          <p>Cadastre, edite e inative os espaços do complexo.</p>
        </div>

        <button
          className="botao botao--primario"
          type="button"
          onClick={() => setFormulario({ aberto: true })}
        >
          + Nova quadra
        </button>
      </header>

      <div className="quadras-resumo">
        <div className="resumo-card">
          <span>Total</span>
          <strong>{quadras.length}</strong>
        </div>
        <div className="resumo-card resumo-card--ativas">
          <span>Ativas</span>
          <strong>{ativas}</strong>
        </div>
        <div className="resumo-card resumo-card--inativas">
          <span>Inativas</span>
          <strong>{quadras.length - ativas}</strong>
        </div>
      </div>

      {carregando && <p className="quadras-aviso">Carregando quadras...</p>}

      {(erro || erroAcao) && (
        <p className="quadras-aviso quadras-aviso--erro" role="alert">
          {erro || erroAcao}
        </p>
      )}

      {!carregando && !erro && quadras.length === 0 && (
        <p className="quadras-aviso">Nenhuma quadra cadastrada ainda.</p>
      )}

      <div className="quadras-grid">
        {quadras.map((quadra) => (
          <QuadraCard
            key={quadra.id}
            quadra={quadra}
            acoes={
              <>
                <button
                  className="botao botao--secundario botao--pequeno"
                  type="button"
                  onClick={() => setFormulario({ aberto: true, quadra })}
                >
                  Editar
                </button>

                {quadra.ativa ? (
                  <button
                    className="botao botao--perigo botao--pequeno"
                    type="button"
                    onClick={() => setQuadraParaInativar(quadra)}
                  >
                    Inativar
                  </button>
                ) : (
                  <button
                    className="botao botao--secundario botao--pequeno"
                    type="button"
                    onClick={() => reativar(quadra)}
                  >
                    Reativar
                  </button>
                )}
              </>
            }
          />
        ))}
      </div>

      {formulario.aberto && (
        <QuadraFormModal
          quadra={formulario.quadra}
          onFechar={fecharFormulario}
          onSalvar={aoSalvar}
        />
      )}

      {quadraParaInativar && (
        <ConfirmModal
          titulo="Inativar quadra"
          mensagem={`"${quadraParaInativar.nome}" deixará de aparecer para os atletas. Você pode reativá-la depois.`}
          textoConfirmar="Inativar"
          onConfirmar={confirmarInativacao}
          onFechar={() => setQuadraParaInativar(null)}
        />
      )}
    </section>
  );
}
