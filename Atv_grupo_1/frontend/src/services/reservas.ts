import { API_URL, fetchAutenticado, tratarResposta } from "./api";

export type HorarioGrade = {
  horario: number;
  disponivel: boolean;
  valor: number;
};

export type GradeHorarios = {
  quadra_id: number;
  data: string;
  horarios: HorarioGrade[];
};

export type StatusReserva = "pendente" | "paga" | "cancelada";

export type Reserva = {
  id: number;
  quadra_id: number;
  data: string;
  horario: number;
  valor: number;
  status: StatusReserva;
  criado_em: string;
};

export type ReservaPayload = {
  quadra_id: number;
  data: string;
  horario: number;
  // Valor mostrado na revisão; a API recusa se o preço tiver mudado.
  valor_esperado: number;
};

export async function buscarGradeHorarios(
  quadraId: number,
  data: string,
): Promise<GradeHorarios> {
  const parametros = new URLSearchParams({ data });
  const resposta = await fetch(
    `${API_URL}/quadras/${quadraId}/horarios?${parametros}`,
  );
  return tratarResposta<GradeHorarios>(resposta);
}

export async function criarReserva(dados: ReservaPayload): Promise<Reserva> {
  const resposta = await fetchAutenticado("/reservas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return tratarResposta<Reserva>(resposta);
}
