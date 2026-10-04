import "../styles/home.css";
import type { Usuario } from "../services/api";

type HomePageProps = {
  usuario: Usuario;
  onLogout: () => void;
};

const NOME_PERFIL: Record<string, string> = {
  usuario: "Atleta",
  administrador: "Administrador",
};

export default function HomePage({ usuario, onLogout }: HomePageProps) {
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <img src="/images/logo-reserva-gavea.png" alt="" />
          <span>Reserva Gávea</span>
        </div>

        <div className="home-user">
          <span className="home-badge">
            {NOME_PERFIL[usuario.perfil] ?? usuario.perfil}
          </span>

          <button className="home-logout" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="home-content">
        <h1>Olá, {primeiroNome}!</h1>
        <p>Em breve você poderá buscar e reservar quadras por aqui.</p>
      </main>
    </div>
  );
}
