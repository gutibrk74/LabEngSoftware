import { useState } from "react";
import type { FormEvent } from "react";
import "../styles/perfil.css";
import { ErroApi, alterarSenha, atualizarPerfil } from "../services/api";
import type { ErrosValidacao, Usuario } from "../services/api";

type PerfilPageProps = {
  usuario: Usuario;
  onAtualizarUsuario: (usuario: Usuario) => void;
};

function formatarCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, "");
  if (digitos.length !== 11) {
    return cpf;
  }
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 11) {
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digitos.length === 10) {
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return telefone;
}

export default function PerfilPage({
  usuario,
  onAtualizarUsuario,
}: PerfilPageProps) {
  const [nome, setNome] = useState(usuario.nome);
  const [telefone, setTelefone] = useState(formatarTelefone(usuario.telefone));
  const [cidade, setCidade] = useState(usuario.cidade);
  const [errosDados, setErrosDados] = useState<ErrosValidacao>({});
  const [avisoDados, setAvisoDados] = useState("");
  const [erroGeralDados, setErroGeralDados] = useState("");
  const [salvandoDados, setSalvandoDados] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [errosSenha, setErrosSenha] = useState<ErrosValidacao>({});
  const [avisoSenha, setAvisoSenha] = useState("");
  const [erroGeralSenha, setErroGeralSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  async function salvarDados(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrosDados({});
    setAvisoDados("");
    setErroGeralDados("");

    const nomeLimpo = nome.trim();
    const cidadeLimpa = cidade.trim();
    const telefoneDigitos = telefone.replace(/\D/g, "");

    if (nomeLimpo.length < 3) {
      setErrosDados({ nome: "O nome deve ter pelo menos 3 caracteres." });
      return;
    }

    if (telefoneDigitos.length < 10 || telefoneDigitos.length > 11) {
      setErrosDados({ telefone: "Informe um telefone válido com DDD." });
      return;
    }

    if (cidadeLimpa.length < 2) {
      setErrosDados({ cidade: "A cidade deve ter pelo menos 2 caracteres." });
      return;
    }

    setSalvandoDados(true);

    try {
      const atualizado = await atualizarPerfil({
        nome: nomeLimpo,
        telefone: telefoneDigitos,
        cidade: cidadeLimpa,
      });

      onAtualizarUsuario(atualizado);
      setNome(atualizado.nome);
      setTelefone(formatarTelefone(atualizado.telefone));
      setCidade(atualizado.cidade);
      setAvisoDados("Dados cadastrais atualizados com sucesso.");
    } catch (error) {
      if (error instanceof ErroApi && error.status === 422) {
        setErrosDados((prev) => ({ ...prev, ...error.errosCampos }));
      }
      setErroGeralDados(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar seus dados.",
      );
    } finally {
      setSalvandoDados(false);
    }
  }

  async function salvarNovaSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrosSenha({});
    setAvisoSenha("");
    setErroGeralSenha("");

    if (novaSenha.length < 8) {
      setErrosSenha({
        nova_senha: "A nova senha deve ter pelo menos 8 caracteres.",
      });
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErrosSenha({
        confirmar_nova_senha: "As senhas não coincidem.",
      });
      return;
    }

    setSalvandoSenha(true);

    try {
      await alterarSenha({
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmar_nova_senha: confirmarNovaSenha,
      });

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setAvisoSenha("Senha alterada com sucesso.");
    } catch (error) {
      if (error instanceof ErroApi && error.status === 422) {
        setErrosSenha((prev) => ({ ...prev, ...error.errosCampos }));
      }
      setErroGeralSenha(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.",
      );
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <section className="perfil-page">
      <header className="perfil-cabecalho">
        <h2>Meu Perfil</h2>
        <p>Visualize seus dados cadastrais e mantenha seu contato atualizado.</p>
      </header>

      <div className="perfil-grid">
        <article className="perfil-card">
          <h3>Dados Pessoais</h3>
          <p className="perfil-card-subtitulo">
            E-mail e CPF são fixos no cadastro; os demais dados podem ser
            editados.
          </p>

          <form className="perfil-form" onSubmit={salvarDados}>
            <div className="perfil-campo">
              <label htmlFor="perfil-nome">Nome completo</label>
              <input
                id="perfil-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
              />
              {errosDados.nome && (
                <span className="field-error" role="alert">
                  {errosDados.nome}
                </span>
              )}
            </div>

            <div className="perfil-dupla">
              <div className="perfil-campo">
                <label htmlFor="perfil-email">E-mail</label>
                <input
                  id="perfil-email"
                  type="email"
                  value={usuario.email}
                  disabled
                />
              </div>

              <div className="perfil-campo">
                <label htmlFor="perfil-cpf">CPF</label>
                <input
                  id="perfil-cpf"
                  type="text"
                  value={formatarCpf(usuario.cpf)}
                  disabled
                />
              </div>
            </div>

            <div className="perfil-dupla">
              <div className="perfil-campo">
                <label htmlFor="perfil-telefone">Telefone</label>
                <input
                  id="perfil-telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  maxLength={15}
                  required
                />
                {errosDados.telefone && (
                  <span className="field-error" role="alert">
                    {errosDados.telefone}
                  </span>
                )}
              </div>

              <div className="perfil-campo">
                <label htmlFor="perfil-cidade">Cidade</label>
                <input
                  id="perfil-cidade"
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  maxLength={100}
                  required
                />
                {errosDados.cidade && (
                  <span className="field-error" role="alert">
                    {errosDados.cidade}
                  </span>
                )}
              </div>
            </div>

            {erroGeralDados && (
              <p className="form-erro" role="alert">
                {erroGeralDados}
              </p>
            )}

            {avisoDados && (
              <p className="perfil-sucesso" role="status">
                {avisoDados}
              </p>
            )}

            <button
              type="submit"
              className="botao botao--primario"
              disabled={salvandoDados}
            >
              {salvandoDados ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        </article>

        <article className="perfil-card">
          <h3>Alterar Senha</h3>
          <p className="perfil-card-subtitulo">
            Use uma senha forte com pelo menos 8 caracteres.
          </p>

          <form className="perfil-form" onSubmit={salvarNovaSenha}>
            <div className="perfil-campo">
              <label htmlFor="perfil-senha-atual">Senha atual</label>
              <input
                id="perfil-senha-atual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
                required
              />
              {errosSenha.senha_atual && (
                <span className="field-error" role="alert">
                  {errosSenha.senha_atual}
                </span>
              )}
            </div>

            <div className="perfil-campo">
              <label htmlFor="perfil-nova-senha">Nova senha</label>
              <input
                id="perfil-nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {errosSenha.nova_senha && (
                <span className="field-error" role="alert">
                  {errosSenha.nova_senha}
                </span>
              )}
            </div>

            <div className="perfil-campo">
              <label htmlFor="perfil-confirmar-senha">
                Confirmar nova senha
              </label>
              <input
                id="perfil-confirmar-senha"
                type="password"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {errosSenha.confirmar_nova_senha && (
                <span className="field-error" role="alert">
                  {errosSenha.confirmar_nova_senha}
                </span>
              )}
            </div>

            {erroGeralSenha && (
              <p className="form-erro" role="alert">
                {erroGeralSenha}
              </p>
            )}

            {avisoSenha && (
              <p className="perfil-sucesso" role="status">
                {avisoSenha}
              </p>
            )}

            <button
              type="submit"
              className="botao botao--secundario"
              disabled={salvandoSenha}
            >
              {salvandoSenha ? "Atualizando..." : "Atualizar senha"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}