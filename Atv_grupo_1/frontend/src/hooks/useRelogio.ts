import { useEffect, useState } from "react";
import { hojeIso, horaAtual } from "../utils/datas";

const UMA_HORA_MS = 60 * 60 * 1000;

function lerRelogio() {
  return { hoje: hojeIso(), hora: horaAtual() };
}

// Dia e hora atuais de São Paulo, atualizados a cada virada de hora para
// a tela não mostrar como livre um horário que acabou de começar.
export function useRelogio() {
  const [agora, setAgora] = useState(lerRelogio);

  useEffect(() => {
    // O fuso de São Paulo é de hora cheia, então a virada da hora local
    // coincide com a do relógio do sistema.
    const espera = UMA_HORA_MS - (Date.now() % UMA_HORA_MS) + 500;
    const timer = window.setTimeout(() => setAgora(lerRelogio()), espera);

    // Com o computador suspenso o timer atrasa; confere ao voltar à aba.
    function aoVoltar() {
      const atual = lerRelogio();

      if (atual.hoje !== agora.hoje || atual.hora !== agora.hora) {
        setAgora(atual);
      }
    }

    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [agora]);

  return agora;
}
