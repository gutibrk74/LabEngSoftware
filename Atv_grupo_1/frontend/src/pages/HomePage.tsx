import "../styles/home.css";
import type { Usuario } from "../services/api";

type HomePageProps = {
  usuario: Usuario;
};

export default function HomePage({ usuario }: HomePageProps) {
  const isAdmin = usuario.perfil === "administrador";
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <section className="home">
      <p className="home-saudacao">Olá, {primeiroNome} 👋</p>
      <h2 className="home-titulo">
        {isAdmin ? "Painel de Controle" : "Painel Esportivo"}
      </h2>
    </section>
  );
}
