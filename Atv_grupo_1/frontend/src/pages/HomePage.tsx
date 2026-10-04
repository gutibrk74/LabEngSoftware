import "../styles/home.css";
import "../styles/quadras.css";
import QuadraCard from "../components/QuadraCard";
import { useQuadras } from "../hooks/useQuadras";
import type { Usuario } from "../services/api";

type HomePageProps = {
  usuario: Usuario;
};

export default function HomePage({ usuario }: HomePageProps) {
  const isAdmin = usuario.perfil === "administrador";
  const primeiroNome = usuario.nome.split(" ")[0];
  const { quadras, carregando, erro } = useQuadras(false);

  return (
    <section className="home">
      <p className="home-saudacao">Olá, {primeiroNome} 👋</p>
      <h2 className="home-titulo">
        {isAdmin ? "Painel de Controle" : "Painel Esportivo"}
      </h2>

      <div className="home-secao">
        <header className="home-secao-cabecalho">
          <h3>Espaços disponíveis</h3>

          {isAdmin && <a href="#/quadras">Gerenciar quadras →</a>}
        </header>

        {carregando && <p className="quadras-aviso">Carregando quadras...</p>}

        {erro && (
          <p className="quadras-aviso quadras-aviso--erro" role="alert">
            {erro}
          </p>
        )}

        {!carregando && !erro && quadras.length === 0 && (
          <p className="quadras-aviso">Nenhuma quadra disponível no momento.</p>
        )}

        <div className="quadras-grid">
          {quadras.map((quadra) => (
            <QuadraCard key={quadra.id} quadra={quadra} />
          ))}
        </div>
      </div>
    </section>
  );
}
