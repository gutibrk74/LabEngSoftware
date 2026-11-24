import { fetchAutenticado, tratarResposta } from "./api";
import type { Reserva, ReservaAtleta, StatusReserva } from "./reservas";

export type ReservaAdmin = ReservaAtleta & {
  usuario_id: number;
  atleta_nome: string;
  atleta_email: string;
};

// Todos opcionais; para um dia só, use inicio = fim.
export type FiltrosReservasAdmin = {
  inicio?: string;
  fim?: string;
  quadraId?: number;
  status?: StatusReserva;
};

export async function listarReservasAdmin(
  filtros: FiltrosReservasAdmin = {},
): Promise<ReservaAdmin[]> {
  const parametros = new URLSearchParams();

  if (filtros.inicio) {
    parametros.set("inicio", filtros.inicio);
  }
  if (filtros.fim) {
    parametros.set("fim", filtros.fim);
  }
  if (filtros.quadraId !== undefined) {
    parametros.set("quadra_id", String(filtros.quadraId));
  }
  if (filtros.status) {
    parametros.set("status", filtros.status);
  }

  const busca = parametros.size > 0 ? `?${parametros}` : "";
  const resposta = await fetchAutenticado(`/admin/reservas${busca}`);
  return tratarResposta<ReservaAdmin[]>(resposta);
}

// Regras no backend: pendente <-> paga, pendente/paga -> cancelada e
// cancelada -> pendente (reativar, só antes do horário e com a quadra ativa).
export async function alterarStatusReserva(
  reservaId: number,
  status: StatusReserva,
): Promise<Reserva> {
  const resposta = await fetchAutenticado(
    `/admin/reservas/${reservaId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  return tratarResposta<Reserva>(resposta);
}
