import { useState } from "react";
import "../styles/modal.css";
import "../styles/dashboard.css";
import { useMetricas } from "../hooks/useMetricas";
import { useRelogio } from "../hooks/useRelogio";
import type { Metricas } from "../services/metricas";
import {
  fimDoMes,
  formatarDataCurta,
  inicioDoMes,
  somarDias,
} from "../utils/datas";
import { ESPORTES } from "../utils/quadras";

type Periodo = { inicio: string; fim: string };

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoPercentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

function rotuloEsporte(esporte: string): string {
  return ESPORTES[esporte as keyof typeof ESPORTES]?.nome ?? esporte;
}

function horas(quantidade: number): string {
  return `${quantidade} h`;
}

type BarraProps = {
  rotulo: string;
  detalhe?: string;
  valor: string;
  // Largura da barra, de 0 a 1.
  proporcao: number;
  dica: string;
};

// Barra horizontal simples em CSS: a largura é a grandeza; o número fica
// escrito ao lado, então a leitura nunca depende só da cor ou do tamanho.
function Barra({ rotulo, detalhe, valor, proporcao, dica }: BarraProps) {
  const largura = `${Math.min(Math.max(proporcao, 0), 1) * 100}%`;

  return (
    <li className="barra" title={dica}>
      <div className="barra-rotulo">
        <span>{rotulo}</span>
        {detalhe && <span className="barra-etiqueta">{detalhe}</span>}
      </div>
      <div className="barra-trilho" aria-hidden="true">
        <div className="barra-preenchimento" style={{ width: largura }} />
      </div>
      <span className="barra-valor">{valor}</span>
    </li>
  );
}

function Cards({ metricas }: { metricas: Metricas }) {
  const { reservas_por_status: status, faturamento, ocupacao_geral } =
    metricas;

  return (
    <>
      <h3 className="dashboard-secao-titulo">Reservas no período</h3>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <span>Total</span>
          <strong>{status.total}</strong>
        </div>
        <div className="dashboard-card">
          <span>Pendentes</span>
          <strong>{status.pendente}</strong>
        </div>
        <div className="dashboard-card">
          <span>Pagas</span>
          <strong>{status.paga}</strong>
        </div>
        <div className="dashboard-card">
          <span>Canceladas</span>
          <strong>{status.cancelada}</strong>
        </div>
      </div>

      <h3 className="dashboard-secao-titulo">Faturamento e ocupação</h3>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <span>Realizado</span>
          <strong>{formatoMoeda.format(faturamento.realizado)}</strong>
          <small>reservas pagas</small>
        </div>
        <div className="dashboard-card">
          <span>A receber</span>
          <strong>{formatoMoeda.format(faturamento.a_receber)}</strong>
          <small>reservas pendentes</small>
        </div>
        <div className="dashboard-card dashboard-card--destaque">
          <span>Previsto</span>
          <strong>{formatoMoeda.format(faturamento.previsto)}</strong>
          <small>pagas + pendentes</small>
        </div>
        <div className="dashboard-card">
          <span>Ocupação geral</span>
          <strong>{formatoPercentual.format(ocupacao_geral.taxa)}</strong>
          <small>
            {horas(ocupacao_geral.horas_reservadas)} de{" "}
            {horas(ocupacao_geral.horas_disponiveis)}
          </small>
        </div>
      </div>
    </>
  );
}

function Graficos({ metricas }: { metricas: Metricas }) {
  const maiorEsporte = Math.max(
    0,
    ...metricas.por_esporte.map((item) => item.reservas),
  );

  return (
    <div className="dashboard-graficos">
      <section className="dashboard-painel" aria-labelledby="titulo-ocupacao">
        <h3 id="titulo-ocupacao">Ocupação por quadra</h3>
        <p className="dashboard-painel-nota">
          Horas reservadas ÷ horas de funcionamento no período.
        </p>

        {metricas.ocupacao_por_quadra.length === 0 ? (
          <p className="dashboard-vazio">Nenhuma quadra no período.</p>
        ) : (
          <ul className="barras">
            {metricas.ocupacao_por_quadra.map((quadra) => (
              <Barra
                key={quadra.quadra_id}
                rotulo={quadra.nome}
                detalhe={quadra.ativa ? undefined : "inativa"}
                valor={formatoPercentual.format(quadra.taxa)}
                proporcao={quadra.taxa}
                dica={
                  `${quadra.nome} (${rotuloEsporte(quadra.tipo_esporte)}): ` +
                  `${horas(quadra.horas_reservadas)} reservadas de ` +
                  `${horas(quadra.horas_disponiveis)} de funcionamento`
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-painel" aria-labelledby="titulo-esporte">
        <h3 id="titulo-esporte">Reservas por esporte</h3>
        <p className="dashboard-painel-nota">
          Reservas pendentes e pagas, com o faturamento previsto.
        </p>

        {metricas.por_esporte.length === 0 ? (
          <p className="dashboard-vazio">Nenhuma quadra no período.</p>
        ) : (
          <ul className="barras">
            {metricas.por_esporte.map((item) => (
              <Barra
                key={item.esporte}
                rotulo={rotuloEsporte(item.esporte)}
                valor={
                  `${item.reservas} ${item.reservas === 1 ? "reserva" : "reservas"}` +
                  ` · ${formatoMoeda.format(item.faturamento_previsto)}`
                }
                proporcao={maiorEsporte > 0 ? item.reservas / maiorEsporte : 0}
                dica={
                  `${rotuloEsporte(item.esporte)}: ${item.reservas} reserva(s), ` +
                  `${formatoMoeda.format(item.faturamento_previsto)} previstos`
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { hoje } = useRelogio();
  const [periodo, setPeriodo] = useState<Periodo>(() => ({
    inicio: inicioDoMes(hoje),
    fim: fimDoMes(hoje),
  }));
  const { metricas, carregando, erro } = useMetricas(
    periodo.inicio,
    periodo.fim,
  );

  const mesPassado = somarDias(inicioDoMes(hoje), -1);
  const atalhos: { rotulo: string; periodo: Periodo }[] = [
    {
      rotulo: "Este mês",
      periodo: { inicio: inicioDoMes(hoje), fim: fimDoMes(hoje) },
    },
    {
      rotulo: "Mês passado",
      periodo: { inicio: inicioDoMes(mesPassado), fim: mesPassado },
    },
    {
      rotulo: "Últimos 7 dias",
      periodo: { inicio: somarDias(hoje, -6), fim: hoje },
    },
    {
      rotulo: "Próximos 7 dias",
      periodo: { inicio: hoje, fim: somarDias(hoje, 6) },
    },
  ];

  return (
    <section className="dashboard-page">
      <header className="dashboard-cabecalho">
        <h2>Dashboard</h2>
        <p>
          Indicadores das reservas pela data do jogo. Canceladas não entram
          no faturamento nem na ocupação.
        </p>
      </header>

      <div className="dashboard-filtros" role="search">
        <div className="form-campo">
          <label htmlFor="dashboard-inicio">De</label>
          <input
            id="dashboard-inicio"
            type="date"
            required
            value={periodo.inicio}
            max={periodo.fim}
            onChange={(event) => {
              const valor = event.target.value;
              // Campo apagado: mantém o período anterior.
              if (valor) {
                setPeriodo((atual) => ({ ...atual, inicio: valor }));
              }
            }}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="dashboard-fim">Até</label>
          <input
            id="dashboard-fim"
            type="date"
            required
            value={periodo.fim}
            min={periodo.inicio}
            onChange={(event) => {
              const valor = event.target.value;
              // Campo apagado: mantém o período anterior.
              if (valor) {
                setPeriodo((atual) => ({ ...atual, fim: valor }));
              }
            }}
          />
        </div>

        <div className="dashboard-atalhos" aria-label="Atalhos de período">
          {atalhos.map((atalho) => {
            const ativo =
              atalho.periodo.inicio === periodo.inicio &&
              atalho.periodo.fim === periodo.fim;

            return (
              <button
                key={atalho.rotulo}
                type="button"
                className={`dashboard-atalho ${
                  ativo ? "dashboard-atalho--ativo" : ""
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

      <p className="dashboard-resumo" aria-live="polite">
        {carregando
          ? "Carregando indicadores..."
          : metricas &&
            `${formatarDataCurta(metricas.periodo.inicio)} a ` +
              `${formatarDataCurta(metricas.periodo.fim)} ` +
              `(${metricas.periodo.dias} dia(s))`}
      </p>

      {erro && (
        <p className="form-erro" role="alert">
          {erro}
        </p>
      )}

      {metricas && (
        <div
          className={`dashboard-conteudo ${
            carregando ? "dashboard-conteudo--carregando" : ""
          }`}
        >
          <Cards metricas={metricas} />
          <Graficos metricas={metricas} />
          <p className="dashboard-rodape">
            Valores pelo preço do momento de cada reserva. A ocupação usa o
            horário de funcionamento atual de cada quadra.
          </p>
        </div>
      )}
    </section>
  );
}
