import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { ProxyOptions } from "vite";

// O frontend chama a API em "/api/..." no próprio endereço do Vite, e o Vite
// repassa para o backend. Assim não há CORS nem porta extra para liberar,
// e funciona igual no computador e no GitHub Codespaces.
const API_ALVO = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";

const proxy: Record<string, ProxyOptions> = {
  "/api": {
    target: API_ALVO,
    changeOrigin: true,
    rewrite: (caminho) => caminho.replace(/^\/api/, ""),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy,
    // Permite abrir pelo endereço do GitHub Codespaces.
    allowedHosts: [".app.github.dev"],
  },
  preview: {
    proxy,
    allowedHosts: [".app.github.dev"],
  },
});
