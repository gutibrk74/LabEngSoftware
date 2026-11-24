import { useState } from "react";
import "../styles/modal.css";
import "../styles/reservas-admin.css";
import ConfirmModal from "../components/ConfirmModal";
import { useQuadras } from "../hooks/useQuadras";
import { useRelogio } from "../hooks/useRelogio";
import { useReservasAdmin } from "../hooks/useReservasAdmin";
import type { StatusReserva } from "../services/reservas";
import { alterarStatusReserva } from "../services/reservasAdmin";
import type { ReservaAdmin } from "../services/reservasAdmin";
import {
  formatarDataCurta,
  formatarDataExtenso,
  formatarHora,
  somarDias,
} from "../utils/datas";
import { ESPORTES } from "../utils/quadras";

const ROTULO_STATUS: Record<StatusReserva, string> = {
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Confirmacao = {
  reserva: ReservaAdmin;
  // Só as ações que pedem confirmação: cancelar e reativar.
  status: "cancelada" | "pendente";
};

type Periodo = { inicio: string; fim: string };

export default function ReservasAdminPage() {
  const { hoje, hora } = useRelogio();
  const [periodo, setPeriodo] = useState<Periodo>(() => ({
    inicio: hoje,
    fim: somarDias(hoje, 7),
  }));
  const [quadraId, setQuadraId] = useState("");
  const [status, setStatus] = useState<StatusReserva | "">("");

  const { reservas, carregando, erro, recarregar } = useReservasAdmin({
    inicio: periodo.inicio || undefined,
    fim: periodo.fim || undefined,
    quadraId: quadraId ? Number(quadraId) : undefined,
    status: status || undefined,
  });
  const { quadras } = useQuadras(true);

  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [errosLinha, setErrosLinha] = useState<Record<number, string>>({});

  function jaComecou(reserva: ReservaAdmin): boolean {
    return (
      reserva.data < hoje || (reserva.data === hoje && reserva.horario <= hora)
    );
  }

  function limparErro(reservaId: number) {
    setErrosLinha((atual) => {
      const resto = { ...atual };
      delete resto[reservaId];
      return resto;
    });
  }

  // Pagar e desfazer o pagamento não pedem confirmação: são reversíveis.
  async function mudarStatusDireto(
    reserva: ReservaAdmin,
    novoStatus: StatusReserva,
  ) {
    limparErro(reserva.id);
    setProcessandoId(reserva.id);

    try {
      await alterarStatusReserva(reserva.id, novoStatus);
      recarregar();
    } catch (error) {
      setErrosLinha((atual) => ({
        ...atual,
        [reserva.id]:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar a reserva.",
      }));
    } finally {
      setProcessandoId(null);
    }
  }

  async function confirmarAcao() {
    if (!confirmacao) {
      return;
    }

    // Se falhar (ex.: 409 porque o horário já foi reservado por outra
    // pessoa), o ConfirmModal mostra a mensagem e continua aberto.
    await alterarStatusReserva(confirmacao.reserva.id, confirmacao.status);
    limparErro(confirmacao.reserva.id);
    setConfirmacao(null);
    recarregar();
  }

  const contagem = {
    pendente: reservas.filter((r) => r.status === "pendente").length,
    paga: reservas.filter((r) => r.status === "paga").length,
    cancelada: reservas.filter((r) => r.status === "cancelada").length,
  };

  const atalhos: { rotulo: string; periodo: Periodo }[] = [
    { rotulo: "Hoje", periodo: { inicio: hoje, fim: hoje } },
    {
      rotulo: "Próximos 7 dias",
      periodo: { inicio: hoje, fim: somarDias(hoje, 7) },
    },
    {
      rotulo: "Últimos 30 dias",
      periodo: { inicio: somarDias(hoje, -30), fim: hoje },
    },
    { rotulo: "Todas as datas", periodo: { inicio: "", fim: "" } },
  ];

  return (
    <section className="reservas-admin-page">
      <header className="reservas-admin-cabecalho">
        <h2>Gestão de Reservas</h2>
        <p>
          Consulte as reservas do complexo, registre pagamentos e cancele ou
          reative quando necessário.
        </p>
      </header>

      <div className="reservas-admin-filtros" role="search">
        <div className="form-campo">
          <label htmlFor="filtro-inicio">De</label>
          <input
            id="filtro-inicio"
            type="date"
            value={periodo.inicio}
            max={periodo.fim || undefined}
            onChange={(event) =>
              setPeriodo((atual) => ({ ...atual, inicio: event.target.value }))
            }
          />
        </div>

        <div className="form-campo">
          <label htmlFor="filtro-fim">Até</label>
          <input
            id="filtro-fim"
            type="date"
            value={periodo.fim}
            min={periodo.inicio || undefined}
            onChange={(event) =>
              setPeriodo((atual) => ({ ...atual, fim: event.target.value }))
            }
          />
        </div>

        <div className="form-campo">
          <label htmlFor="filtro-quadra">Quadra</label>
          <select
            id="filtro-quadra"
            value={quadraId}
            onChange={(event) => setQuadraId(event.target.value)}
          >
            <option value="">Todas as quadras</option>
            {quadras.map((quadra) => (
              <option key={quadra.id} value={quadra.id}>
                {quadra.nome}
                {quadra.ativa ? "" : " (inativa)"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-campo">
          <label htmlFor="filtro-status">Status</label>
          <select
            id="filtro-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as StatusReserva | "")
            }
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div className="reservas-admin-atalhos" aria-label="Atalhos de período">
          {atalhos.map((atalho) => {
            const ativo =
              atalho.periodo.inicio === periodo.inicio &&
              atalho.periodo.fim === periodo.fim;

            return (
              <button
                key={atalho.rotulo}
                type="button"
                className={`reservas-admin-atalho ${
                  ativo ? "reservas-admin-atalho--ativo" : ""
                }`}
                aria-pressed={ativo}
                onClick={() => setPeriodo(atalho.periodo)}
              >
                {atalho.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      <p className="reservas-admin-resumo" aria-live="polite">
        {carregando
          ? "Carregando reservas..."
          : `${reservas.length} reserva(s): ${contagem.pendente} pendente(s), ` +
            `${contagem.paga} paga(s), ${contagem.cancelada} cancelada(s).`}
      </p>

      {erro && (
        <p className="form-erro" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && reservas.length === 0 ? (
        <div className="reservas-admin-vazio">
          Nenhuma reserva encontrada com esses filtros.
        </div>
      ) : (
        <div className="reservas-admin-tabela-wrap">
          <table className="reservas-admin-tabela">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Horário</th>
                <th scope="col">Quadra</th>
                <th scope="col">Atleta</th>
                <th scope="col" className="coluna-valor">
                  Valor
                </th>
                <th scope="col">Status</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>

            <tbody>
              {reservas.map((reserva) => {
                const processando = processandoId === reserva.id;
                const erroLinha = errosLinha[reserva.id];
                const esporte =
                  ESPORTES[reserva.quadra_esporte]?.nome ??
                  reserva.quadra_esporte;

                return (
                  <tr
                    key={reserva.id}
                    className={
                      reserva.status === "cancelada" ? "linha--cancelada" : ""
                    }
                  >
                    <td>{formatarDataCurta(reserva.data)}</td>
                    <td>
                      {formatarHora(reserva.horario)}–
                      {formatarHora(reserva.horario + 1)}
                    </td>
                    <td>
                      <strong>{reserva.quadra_nome}</strong>
                      <span className="celula-detalhe">{esporte}</span>
                    </td>
                    <td>
                      <strong>{reserva.atleta_nome}</strong>
                      <span className="celula-detalhe">
                        {reserva.atleta_email}
                      </span>
                    </td>
                    <td className="coluna-valor">
                      {formatoMoeda.format(reserva.valor)}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-badge--${reserva.status}`}
                      >
                        {ROTULO_STATUS[reserva.status]}
                      </span>
                    </td>
                    <td>
                      <div className="celula-acoes">
                        {reserva.status === "pendente" && (
                          <button
                            type="button"
                            className="botao botao--secundario botao--pequeno"
                            disabled={processando}
                            onClick={() => mudarStatusDireto(reserva, "paga")}
                          >
                            Marcar como paga
                          </button>
                        )}

                        {reserva.status === "paga" && (
                          <button
                            type="button"
                            className="botao botao--secundario botao--pequeno"
                            disabled={processando}
                            onClick={() =>
                              mudarStatusDireto(reserva, "pendente")
                            }
                          >
                            Desfazer pagamento
                          </button>
                        )}

                        {reserva.status !== "cancelada" && (
                          <button
                            type="button"
                            className="botao botao--perigo botao--pequeno"
                            disabled={processando}
                            onClick={() =>
                              setConfirmacao({ reserva, status: "cancelada" })
                            }
                          >
                            Cancelar
                          </button>
                        )}

                        {reserva.status === "cancelada" &&
                          (jaComecou(reserva) ? (
                            <span className="celula-detalhe">—</span>
                          ) : (
                            <button
                              type="button"
                              className="botao botao--secundario botao--pequeno"
                              disabled={processando}
                              onClick={() =>
                                setConfirmacao({ reserva, status: "pendente" })
                              }
                            >
                              Reativar
                            </button>
                          ))}
                      </div>

                      {erroLinha && (
                        <p className="celula-erro" role="alert">
                          {erroLinha}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmacao && (
        <ConfirmModal
          titulo={
            confirmacao.status === "cancelada"
              ? "Cancelar reserva"
              : "Reativar reserva"
          }
          mensagem={
            `${confirmacao.status === "cancelada" ? "Cancelar" : "Reativar"} ` +
            `a reserva de ${confirmacao.reserva.atleta_nome} na ` +
            `${confirmacao.reserva.quadra_nome}, ` +
            `${formatarDataExtenso(confirmacao.reserva.data)} às ` +
            `${formatarHora(confirmacao.reserva.horario)}?` +
            (confirmacao.status === "cancelada"
              ? " O horário fica livre para outros atletas."
              : " Ela volta como pendente; registre o pagamento depois.")
          }
          textoConfirmar={
            confirmacao.status === "cancelada"
              ? "Sim, cancelar"
              : "Sim, reativar"
          }
          onConfirmar={confirmarAcao}
          onFechar={() => setConfirmacao(null)}
        />
      )}
    </section>
  );
}
