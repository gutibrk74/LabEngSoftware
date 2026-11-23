import { useId, useState } from "react";
import type { FormEvent } from "react";
import "../styles/login.css";
import { ErroApi, cadastrarUsuario, fazerLogin } from "../services/api";
import type { ErrosValidacao, LoginResponse } from "../services/api";

type AuthPageProps = {
  mode: "login" | "cadastro";
  onLogin?: (resposta: LoginResponse) => void;
};

function PasswordField({
  label,
  name,
  creating = false,
  error,
}: {
  label: string;
  name: string;
  creating?: boolean;
  error?: string;
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
          aria-invalid={Boolean(error)}
          required
        />

        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
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

      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function AuthPage({ mode, onLogin }: AuthPageProps) {
  const isRegister = mode === "cadastro";
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ErrosValidacao>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});
    setLoading(true);

    const data = new FormData(event.currentTarget);

    try {
      const email = String(data.get("email") ?? "").trim();
      const senha = String(data.get("senha") ?? "");

      if (isRegister) {
        const cpf = String(data.get("cpf") ?? "").replace(/\D/g, "");
        const telefone = String(data.get("telefone") ?? "").replace(/\D/g, "");
        const cidade = String(data.get("cidade") ?? "").trim();
        const nome = String(data.get("nome") ?? "").trim();
        const confirmarSenha = String(data.get("confirmarSenha") ?? "");

        // Valida depois do trim pra não deixar passar campo só com espaço
        if (nome.length < 3) {
          setFieldErrors({ nome: "O nome deve ter pelo menos 3 caracteres." });
          throw new Error("O nome deve ter pelo menos 3 caracteres.");
        }

        if (cidade.length < 2) {
          setFieldErrors({
            cidade: "A cidade deve ter pelo menos 2 caracteres.",
          });
          throw new Error("A cidade deve ter pelo menos 2 caracteres.");
        }

        if (cpf.length !== 11) {
          setFieldErrors({ cpf: "Informe um CPF com 11 dígitos." });
          throw new Error("Informe um CPF com 11 dígitos.");
        }

        if (telefone.length < 10 || telefone.length > 11) {
          setFieldErrors({ telefone: "Informe um telefone válido com DDD." });
          throw new Error("Informe um telefone válido com DDD.");
        }

        if (senha !== confirmarSenha) {
          setFieldErrors({ confirmar_senha: "As senhas não coincidem." });
          throw new Error("As senhas não coincidem.");
        }

        const usuario = await cadastrarUsuario({
          nome,
          email,
          telefone,
          cpf,
          cidade,
          senha,
          confirmar_senha: confirmarSenha,
        });

        setMessage(
          `Cadastro realizado para ${usuario.nome}. Redirecionando...`,
        );

        window.setTimeout(() => {
          window.location.hash = "#/login";
        }, 1200);
      } else {
        const resposta = await fazerLogin({
          email,
          senha,
        });

        onLogin?.(resposta);
      }
    } catch (error) {
      // Se o backend devolver 422 com erro por campo, exibe direto no input correspondente
      if (error instanceof ErroApi && error.status === 422) {
        setFieldErrors((prev) => ({ ...prev, ...error.errosCampos }));
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setLoading(false);
    }
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
            Seu próximo jogo começa aqui. Reserve quadras e campos esportivos
            com facilidade.
          </p>
        </div>
      </section>

      <section
        className={`login-panel ${
          isRegister ? "login-panel--register" : ""
        }`}
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
            onChange={() => {
              setMessage("");
              setFieldErrors({});
            }}
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
                  aria-invalid={Boolean(fieldErrors.nome)}
                  required
                />
                {fieldErrors.nome && (
                  <span className="field-error" role="alert">
                    {fieldErrors.nome}
                  </span>
                )}
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
                aria-invalid={Boolean(fieldErrors.email)}
                required
              />
              {fieldErrors.email && (
                <span className="field-error" role="alert">
                  {fieldErrors.email}
                </span>
              )}
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
                      aria-invalid={Boolean(fieldErrors.telefone)}
                      required
                    />
                    {fieldErrors.telefone && (
                      <span className="field-error" role="alert">
                        {fieldErrors.telefone}
                      </span>
                    )}
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
                      aria-invalid={Boolean(fieldErrors.cpf)}
                      required
                    />
                    {fieldErrors.cpf && (
                      <span className="field-error" role="alert">
                        {fieldErrors.cpf}
                      </span>
                    )}
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
                    aria-invalid={Boolean(fieldErrors.cidade)}
                    required
                  />
                  {fieldErrors.cidade && (
                    <span className="field-error" role="alert">
                      {fieldErrors.cidade}
                    </span>
                  )}
                </div>
              </>
            )}

            <PasswordField
              label="Senha"
              name="senha"
              creating={isRegister}
              error={fieldErrors.senha}
            />

            {isRegister && (
              <>
                <PasswordField
                  label="Confirmar senha"
                  name="confirmarSenha"
                  creating
                  error={fieldErrors.confirmar_senha}
                />

                <p className="auth-hint">
                  Use pelo menos 8 caracteres na senha.
                </p>
              </>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Aguarde..."
                : isRegister
                  ? "Criar minha conta"
                  : "Entrar no sistema"}
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