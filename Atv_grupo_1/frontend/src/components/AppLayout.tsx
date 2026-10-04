import type { ReactNode } from "react";
import "../styles/layout.css";
import type { Usuario } from "../services/api";

type ItemMenu = {
  rota: string;
  rotulo: string;
  icone: ReactNode;
};

type AppLayoutProps = {
  usuario: Usuario;
  rotaAtual: string;
  titulo: string;
  onLogout: () => void;
  children: ReactNode;
};

const ICONE_INICIO = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const ICONE_QUADRAS = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M12 5v14" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ICONE_HORARIOS = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

const MENU_ATLETA: ItemMenu[] = [
  { rota: "#/inicio", rotulo: "Início", icone: ICONE_INICIO },
  { rota: "#/horarios", rotulo: "Horários", icone: ICONE_HORARIOS },
];

const MENU_ADMIN: ItemMenu[] = [
  { rota: "#/inicio", rotulo: "Início", icone: ICONE_INICIO },
  { rota: "#/horarios", rotulo: "Horários", icone: ICONE_HORARIOS },
  { rota: "#/quadras", rotulo: "Quadras", icone: ICONE_QUADRAS },
];

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function obterIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default function AppLayout({
  usuario,
  rotaAtual,
  titulo,
  onLogout,
  children,
}: AppLayoutProps) {
  const isAdmin = usuario.perfil === "administrador";
  const menu = isAdmin ? MENU_ADMIN : MENU_ATLETA;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <img src="/images/logo-reserva-gavea.png" alt="" />
          <div>
            <strong>Reserva Gávea</strong>
            <span>{isAdmin ? "Administrador" : "Atleta"}</span>
          </div>
        </div>

        <nav className="app-menu" aria-label="Menu principal">
          {menu.map((item) => (
            <a
              key={item.rota}
              href={item.rota}
              className={`app-menu-item ${
                rotaAtual === item.rota ? "app-menu-item--ativo" : ""
              }`}
              aria-current={rotaAtual === item.rota ? "page" : undefined}
            >
              {item.icone}
              {item.rotulo}
            </a>
          ))}
        </nav>

        <div className="app-user">
          <span className="app-avatar" aria-hidden="true">
            {obterIniciais(usuario.nome)}
          </span>

          <div className="app-user-info">
            <strong>{usuario.nome.split(" ")[0]}</strong>
            <span>{usuario.email}</span>
          </div>

          <button className="app-logout" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <h1>{titulo}</h1>
          <p>{formatoData.format(new Date())}</p>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
