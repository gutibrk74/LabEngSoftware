import { useEffect, useState } from "react";
import "../styles/minhas-reservas.css";
import ConfirmModal from "../components/ConfirmModal";
import { cancelarReserva, listarMinhasReservas } from "../services/reservas";
import type { ReservaAtleta } from "../services/reservas";
import {
  formatarDataExtenso,
  formatarHora,
  hojeIso,
  horaAtual,
} from "../utils/datas";

type Aba = "proximas" | "historico";

const ROTULO_ESPORTE: Record<string, string> = {
  futebol: "Futebol",
  futsal: "Futsal",
  tenis: "Tênis",
  volei: "Vôlei",
  basquete: "Basquete",
};

function reservaFutura(reserva: ReservaAtleta): boolean {
  if (reserva.status === "cancelada") {
    return false;
  }

  const hoje = hojeIso();
  if (reserva.data > hoje) {
    return true;
  }

  return reserva.data === hoje && reserva.horario > horaAtual();
}

export default function MinhasReservasPage() {
  const [reservas, setReservas] = useState<ReservaAtleta[]>([]);
  const [aba, setAba] = useState<Aba>("proximas");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [reservaParaCancelar, setReservaParaCancelar] =
    useState<ReservaAtleta | null>(null);

  // Só altera o estado nos callbacks, depois da resposta da API.
  function buscarReservas(): Promise<void> {
    return listarMinhasReservas()
      .then((dados) => setReservas(dados))
      .catch((error: unknown) =>
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar suas reservas.",
        ),
      )
      .finally(() => setCarregando(false));
  }

  async function carregar() {
    setCarregando(true);
    setErro("");
    await buscarReservas();
  }

  // Na montagem, "carregando" e "erro" já começam no estado de carga.
  useEffect(() => {
    buscarReservas();
  }, []);

  async function confirmarCancelamento() {
    if (!reservaParaCancelar) {
      return;
    }

    await cancelarReserva(reservaParaCancelar.id);
    setReservaParaCancelar(null);
    await carregar();
  }

  const proximas = reservas.filter(reservaFutura);
  const historico = reservas.filter((item) => !reservaFutura(item));
  const exibidas = aba === "proximas" ? proximas : historico;

  return (
    <section className="minhas-reservas-page">
      <header className="minhas-reservas-cabecalho">
        <div>
          <h2>Minhas Reservas</h2>
          <p>Acompanhe seus próximos jogos e o histórico de agendamentos.</p>
        </div>

        <a className="botao botao--primario" href="#/horarios">
          Nova reserva
        </a>
      </header>

      <div className="reservas-abas" role="tablist" aria-label="Filtro de reservas">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "proximas"}
          className={`reservas-aba ${aba === "proximas" ? "reservas-aba--ativa" : ""}`}
          onClick={() => setAba("proximas")}
        >
          Próximas ({proximas.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={aba === "historico"}
          className={`reservas-aba ${aba === "historico" ? "reservas-aba--ativa" : ""}`}
          onClick={() => setAba("historico")}
        >
          Histórico ({historico.length})
        </button>
      </div>

      {erro && (
        <p className="form-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando ? (
        <p>Carregando reservas...</p>
      ) : exibidas.length === 0 ? (
        <div className="reserva-vazio">
          <p>
            {aba === "proximas"
              ? "Você não possui reservas futuras no momento."
              : "Nenhuma reserva anterior ou cancelada encontrada."}
          </p>
        </div>
      ) : (
        <div className="reservas-lista">
          {exibidas.map((reserva) => {
            const futura = reservaFutura(reserva);
            const rotuloStatus =
              reserva.status === "cancelada"
                ? "Cancelada"
                : futura
                  ? "Confirmada"
                  : "Concluída";
            const classeStatus =
              reserva.status === "cancelada"
                ? "reserva-badge--cancelada"
                : futura
                  ? "reserva-badge--ativa"
                  : "reserva-badge--concluida";

            return (
              <article key={reserva.id} className="reserva-card">
                <div className="reserva-card-topo">
                  <div>
                    <span className="reserva-esporte">
                      {ROTULO_ESPORTE[reserva.quadra_esporte] ??
                        reserva.quadra_esporte}
                    </span>
                    <h3>{reserva.quadra_nome}</h3>
                  </div>

                  <span className={`reserva-badge ${classeStatus}`}>
                    {rotuloStatus}
                  </span>
                </div>

                <div className="reserva-detalhes">
                  <p>
                    <span>Data: </span>
                    {formatarDataExtenso(reserva.data)}
                  </p>
                  <p>
                    <span>Horário: </span>
                    {formatarHora(reserva.horario)} às{" "}
                    {formatarHora(reserva.horario + 1)}
                  </p>
                  <p>
                    <span>Valor: </span>
                    {reserva.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>

                {futura && (
                  <button
                    type="button"
                    className="botao botao--perigo"
                    onClick={() => setReservaParaCancelar(reserva)}
                  >
                    Cancelar reserva
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {reservaParaCancelar && (
        <ConfirmModal
          titulo="Cancelar reserva"
          mensagem={`Deseja cancelar sua reserva na ${reservaParaCancelar.quadra_nome} no dia ${formatarDataExtenso(reservaParaCancelar.data)} às ${formatarHora(reservaParaCancelar.horario)}?`}
          textoConfirmar="Sim, cancelar"
          onConfirmar={confirmarCancelamento}
          onFechar={() => setReservaParaCancelar(null)}
        />
      )}
    </section>
  );
}