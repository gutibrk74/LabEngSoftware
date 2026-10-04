import "../styles/quadras.css";
import QuadraCard from "../components/QuadraCard";
import { useQuadrasAdmin } from "../hooks/useQuadrasAdmin";

export default function QuadrasAdminPage() {
  const { quadras, carregando, erro } = useQuadrasAdmin();

  const ativas = quadras.filter((quadra) => quadra.ativa).length;

  return (
    <section className="quadras-page">
      <header className="quadras-cabecalho">
        <h2>Gestão de Quadras</h2>
        <p>Cadastre, edite e inative os espaços do complexo.</p>
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

      {erro && (
        <p className="quadras-aviso quadras-aviso--erro" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && quadras.length === 0 && (
        <p className="quadras-aviso">Nenhuma quadra cadastrada ainda.</p>
      )}

      <div className="quadras-grid">
        {quadras.map((quadra) => (
          <QuadraCard key={quadra.id} quadra={quadra} />
        ))}
      </div>
    </section>
  );
}
