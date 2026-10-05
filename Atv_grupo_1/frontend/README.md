# Frontend — Reserva Gávea

Interface web do sistema, feita com **React 19 + TypeScript** e **Vite**.

## Como rodar

Com a API rodando em `http://127.0.0.1:8000`:

```bash
npm install
npm run dev        # http://localhost:5173
```

O passo a passo completo (incluindo banco e API) está em
[`../documents/InstallationGuide.md`](../documents/InstallationGuide.md).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento com recarga automática |
| `npm run build` | checagem de tipos (`tsc`) e build de produção em `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | serve o build de produção localmente |

## Organização

| Pasta | Conteúdo |
| --- | --- |
| `src/pages` | telas (Início, Horários, Quadras, Login, Cadastro) |
| `src/components` | componentes reutilizáveis (layout, cards, formulários, janelas) |
| `src/hooks` | lógica de estado (sessão, quadras, grade de horários, relógio) |
| `src/services` | chamadas à API, separadas das telas |
| `src/utils` | formatação de datas, preços e dados dos esportes |
| `src/styles` | CSS de cada área |

## Configuração

Por padrão o frontend usa a API em `http://127.0.0.1:8000`. Para mudar, crie `.env.local` com:

```bash
VITE_API_URL=http://endereco-da-api:porta
```
