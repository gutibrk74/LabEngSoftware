import { useEffect, useState } from "react";
import { verificarSaudeDaApi } from "./services/api";

function App() {
  const [status, setStatus] = useState("Verificando API...");
  const [erro, setErro] = useState("");

  useEffect(() => {
    verificarSaudeDaApi()
      .then((resposta) => {
        setStatus(`API conectada: ${resposta.status}`);
      })
      .catch(() => {
        setErro("Não foi possível conectar ao backend.");
      });
  }, []);

  return (
    <main>
      <h1>Sistema de Reservas de Quadras</h1>

      {erro ? <p>{erro}</p> : <p>{status}</p>}
    </main>
  );
}

export default App;