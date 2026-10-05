import { useState } from "react";
import "../styles/home.css";
import "../styles/quadras.css";
import BuscaQuadras from "../components/BuscaQuadras";
import QuadraCard from "../components/QuadraCard";
import { useQuadras } from "../hooks/useQuadras";
import type { Usuario } from "../services/api";
import type { TipoEsporte } from "../services/quadras";
import { formatarDataExtenso } from "../utils/datas";

type HomePageProps = {
  usuario: Usuario;
};

export default function HomePage({ usuario }: HomePageProps) {
  const isAdmin = usuario.perfil === "administrador";
  const primeiroNome = usuario.nome.split(" ")[0];
  const [esporte, setEsporte] = useState<TipoEsporte | "">("");
  const [data, setData] = useState("");
  const { quadras, carregando, erro } = useQuadras(false, { esporte, data });
  const temFiltro = esporte !== "" || data !== "";

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

        <BuscaQuadras
          esporte={esporte}
          data={data}
          onEsporte={setEsporte}
          onData={setData}
        />

        {data && (
          <p className="busca-resumo">
            Quadras com horário livre em {formatarDataExtenso(data)}
          </p>
        )}

        {carregando && <p className="quadras-aviso">Buscando quadras...</p>}

        {erro && (
          <p className="quadras-aviso quadras-aviso--erro" role="alert">
            {erro}
          </p>
        )}

        {!carregando && !erro && quadras.length === 0 && (
          <p className="quadras-aviso">
            {temFiltro
              ? "Nenhuma quadra encontrada com esses filtros."
              : "Nenhuma quadra disponível no momento."}
          </p>
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
