import AppLayout from "./components/AppLayout";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSessao } from "./hooks/useSessao";
import HomePage from "./pages/HomePage";
import HorariosPage from "./pages/HorariosPage";
import LoginPage from "./pages/LoginPage";
import MinhasReservasPage from "./pages/MinhasReservasPage";
import PerfilPage from "./pages/PerfilPage";
import QuadrasAdminPage from "./pages/QuadrasAdminPage";
import RegisterPage from "./pages/RegisterPage";
import ReservasAdminPage from "./pages/ReservasAdminPage";

export default function App() {
  const route = useHashRoute();
  const { usuario, carregando, entrar, sair, atualizarUsuario } = useSessao();

  if (carregando) {
    return <p className="app-loading">Carregando...</p>;
  }

  if (!usuario) {
    return route === "#/cadastro" ? (
      <RegisterPage />
    ) : (
      <LoginPage onLogin={entrar} />
    );
  }

  const isAdmin = usuario.perfil === "administrador";

  if (route === "#/horarios") {
    return (
      <AppLayout
        usuario={usuario}
        rotaAtual={route}
        titulo="Grade de Horários"
        onLogout={sair}
      >
        <HorariosPage />
      </AppLayout>
    );
  }

  if (route === "#/minhas-reservas") {
    return (
      <AppLayout
        usuario={usuario}
        rotaAtual={route}
        titulo="Minhas Reservas"
        onLogout={sair}
      >
        <MinhasReservasPage />
      </AppLayout>
    );
  }

  if (route === "#/perfil") {
    return (
      <AppLayout
        usuario={usuario}
        rotaAtual={route}
        titulo="Meu Perfil"
        onLogout={sair}
      >
        <PerfilPage
          usuario={usuario}
          onAtualizarUsuario={atualizarUsuario}
        />
      </AppLayout>
    );
  }

  if (isAdmin && route === "#/quadras") {
    return (
      <AppLayout
        usuario={usuario}
        rotaAtual={route}
        titulo="Quadras"
        onLogout={sair}
      >
        <QuadrasAdminPage />
      </AppLayout>
    );
  }

  if (isAdmin && route === "#/reservas") {
    return (
      <AppLayout
        usuario={usuario}
        rotaAtual={route}
        titulo="Gestão de Reservas"
        onLogout={sair}
      >
        <ReservasAdminPage />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      usuario={usuario}
      rotaAtual="#/inicio"
      titulo="Início"
      onLogout={sair}
    >
      <HomePage usuario={usuario} />
    </AppLayout>
  );
}