import { useId, useState } from "react";
import type { FormEvent } from "react";
import "../styles/login.css";

type AuthPageProps = {
  mode: "login" | "cadastro";
};

function PasswordField({
  label,
  name,
  creating = false,
}: {
  label: string;
  name: string;
  creating?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="login-field">
      <label htmlFor={id}>{label}</label>

      <div className="password-control">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder="Digite sua senha"
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={creating ? 8 : undefined}
          required
        />

        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible(!visible)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "cadastro";
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    if (isRegister) {
      const name = String(data.get("nome") ?? "").trim();
      const city = String(data.get("cidade") ?? "").trim();
      const cpf = String(data.get("cpf") ?? "").replace(/\D/g, "");
      const phone = String(data.get("telefone") ?? "").replace(/\D/g, "");

      if (!name || !city) {
        setMessage("Preencha seu nome e sua cidade.");
        return;
      }

      if (cpf.length !== 11) {
        setMessage("Informe um CPF com 11 dígitos.");
        return;
      }

      if (phone.length < 10 || phone.length > 11) {
        setMessage("Informe o telefone com DDD: 10 ou 11 dígitos.");
        return;
      }

      if (data.get("senha") !== data.get("confirmarSenha")) {
        setMessage("As senhas não coincidem. Confira os dois campos.");
        return;
      }
    }

    setMessage(
      isRegister
        ? "Formulário validado. O cadastro ainda não está conectado ao servidor."
        : "Formulário validado. O login ainda não está conectado ao servidor.",
    );
  }

  return (
    <main className="login-page">
      <section className="login-cover" aria-labelledby="brand-title">
        <div className="login-brand">
  <img
    className="login-brand-logo"
    src="/images/logo-reserva-gavea.png"
    alt=""
  />

  <h1 id="brand-title">Reserva Gávea</h1>

          <p className="login-tagline">
            Seu próximo jogo começa aqui.
            Reserve quadras e campos esportivos com facilidade.
          </p>
        </div>
      </section>

      <section
        className={`login-panel ${isRegister ? "login-panel--register" : ""}`}
        aria-labelledby="auth-title"
      >
        <div className="login-content">
          <img
            className="auth-logo"
            src="/images/logo-reserva-gavea.png"
            alt=""
          />

          <header className="login-heading">
            <h2 id="auth-title">
              {isRegister ? "Crie sua conta" : "Bem-vindo de volta"}
            </h2>

            <p>
              {isRegister
                ? "Cadastre-se para reservar seu próximo jogo"
                : "Faça login para continuar"}
            </p>
          </header>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            onChange={() => setMessage("")}
          >
            {isRegister && (
              <div className="login-field">
                <label htmlFor="nome">Nome completo</label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  maxLength={120}
                  required
                />
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete={isRegister ? "email" : "username"}
                required
              />
            </div>

            {isRegister && (
              <>
                <div className="auth-field-row">
                  <div className="login-field">
                    <label htmlFor="telefone">Telefone</label>
                    <input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      placeholder="(12) 99999-9999"
                      autoComplete="tel-national"
                      maxLength={15}
                      required
                    />
                  </div>

                  <div className="login-field">
                    <label htmlFor="cpf">CPF</label>
                    <input
                      id="cpf"
                      name="cpf"
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="cidade">Cidade</label>
                  <input
                    id="cidade"
                    name="cidade"
                    type="text"
                    placeholder="Sua cidade"
                    autoComplete="address-level2"
                    maxLength={100}
                    required
                  />
                </div>
              </>
            )}

            <PasswordField
              label="Senha"
              name="senha"
              creating={isRegister}
            />

            {isRegister && (
              <>
                <PasswordField
                  label="Confirmar senha"
                  name="confirmarSenha"
                  creating
                />
                <p className="auth-hint">
                  Use pelo menos 8 caracteres na senha.
                </p>
              </>
            )}

            <button className="login-submit" type="submit">
              {isRegister ? "Criar minha conta" : "Entrar no sistema"}
            </button>

            {message && (
              <p className="login-message" role="status">
                {message}
              </p>
            )}
          </form>

          <p className="auth-switch">
            {isRegister ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
            <a href={isRegister ? "#/login" : "#/cadastro"}>
              {isRegister ? "Entre aqui" : "Crie aqui"}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}