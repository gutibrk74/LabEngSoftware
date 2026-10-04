const API_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function verificarSaudeDaApi() {
  const resposta = await fetch(`${API_URL}/health`);

  if (!resposta.ok) {
    throw new Error("Não foi possível conectar à API");
  }

  return resposta.json();
}