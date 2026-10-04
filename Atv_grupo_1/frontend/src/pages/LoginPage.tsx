import AuthPage from "../components/AuthPage";
import type { LoginResponse } from "../services/api";

type LoginPageProps = {
  onLogin: (resposta: LoginResponse) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  return <AuthPage mode="login" onLogin={onLogin} />;
}
