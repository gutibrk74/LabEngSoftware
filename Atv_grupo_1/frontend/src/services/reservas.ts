import { API_URL, tratarResposta } from "./api";

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
