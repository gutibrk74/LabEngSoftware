import AppLayout from "./components/AppLayout";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSessao } from "./hooks/useSessao";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  const route = useHashRoute();
  const { usuario, carregando, entrar, sair } = useSessao();

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
