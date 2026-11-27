# Guia de Instalação — Reserva Gávea

Passo a passo para rodar o sistema do zero: via **Docker Compose** (recomendado) ou manualmente (banco de dados, API e interface web).

---

## 1. Clonar o repositório

```bash
git clone https://github.com/gutibrk74/LabEngSoftware.git
cd LabEngSoftware
git checkout Develop
```

> A branch `Develop` tem a versão mais recente. A `main` recebe as entregas fechadas de cada sprint.

---

## 2. Opção A — Subir tudo com Docker Compose (Recomendado)

Com o [Docker](https://www.docker.com/) instalado e em execução, basta rodar na pasta `Atv_grupo_1`:

```bash
cd Atv_grupo_1
docker compose up --build -d
```

O Compose sobe automaticamente:
- **`reserva_gavea_db`:** PostgreSQL 15 na porta `5432` com banco `reserva_quadras`
- **`reserva_gavea_api`:** Backend FastAPI na porta `8000` (aplica `alembic upgrade head` na inicialização)
- **`reserva_gavea_web`:** Frontend React + Vite na porta `5173`

Acesse no navegador:
- **Aplicação Web:** http://localhost:5173
- **Documentação da API (Swagger):** http://localhost:8000/docs

### Comandos úteis no Docker Compose

```bash
# Promover um usuário cadastrado para administrador:
docker compose exec backend python -m app.scripts.promover_admin email@exemplo.com

# Rodar a suíte completa de testes automatizados do backend (139 testes):
docker compose exec backend sh -c "pip install --no-cache-dir -r requirements-dev.txt && pytest"

# Encerrar os containers:
docker compose down
```

---

## 3. Opção B — Execução Manual (sem Docker Compose)

### 3.1 Pré-requisitos

| Ferramenta | Versão | Para quê |
| --- | --- | --- |
| [Git](https://git-scm.com/) | qualquer recente | clonar o repositório |
| [Python](https://www.python.org/downloads/) | **3.12 ou superior** | backend (FastAPI); é a versão da imagem Docker e a usada nos testes |
| [Node.js](https://nodejs.org/) | **20.19+ ou 22.12+** | frontend (React + Vite) |
| [PostgreSQL](https://www.postgresql.org/download/) | **14 ou superior** | banco de dados |

### 3.2 Banco de dados (PostgreSQL)

Crie um banco vazio chamado `reserva_quadras` (pelo pgAdmin ou pelo terminal):

```bash
psql -U postgres -c "CREATE DATABASE reserva_quadras;"
```

### 3.3 Backend (API)

```bash
cd Atv_grupo_1/backend
```

**Linux/macOS**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell)**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env          # Linux/macOS
copy .env.example .env        # Windows
```

Preencha `DB_PASSWORD` e gere uma chave `JWT_SECRET_KEY` (`ACCESS_TOKEN_EXPIRE_MINUTES` é a validade do token, em minutos; o padrão é 60, e o frontend renova o token sozinho enquanto o usuário está usando o sistema):

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Aplique as migrações e inicie a API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

### 3.4 Frontend (interface web)

Em **outro terminal**, a partir da raiz do repositório:

```bash
cd Atv_grupo_1/frontend
npm install
npm run dev
```

Abra **http://localhost:5173**.

> O frontend chama a API pelo próprio endereço (`/api/...`) e o Vite repassa os pedidos para
> `http://127.0.0.1:8000`. Se a API estiver em outra porta, inicie o frontend com
> `API_PROXY_TARGET=http://127.0.0.1:8001 npm run dev` (no PowerShell:
> `$env:API_PROXY_TARGET="http://127.0.0.1:8001"; npm run dev`).

### 3.5 Testes automatizados

**Backend** (139 testes, na pasta `Atv_grupo_1/backend`, com o ambiente virtual ativado e o PostgreSQL rodando):

```bash
pip install -r requirements-dev.txt   # só na primeira vez
pytest
```

Os testes criam e usam um banco separado, `reserva_quadras_test`, com as credenciais do `.env`; o banco de desenvolvimento não é alterado.

**Frontend** (5 testes da sessão, na pasta `Atv_grupo_1/frontend`, depois do `npm install`; não precisa da API nem do banco):

```bash
npm run test:sessao
```

O resultado da última execução está em [`TestExecutionReport.md`](TestExecutionReport.md).

### Usando o GitHub Codespaces

1. Rode a API e o frontend (`npm run dev`) em terminais do codespace.
2. Na aba **Ports** (Portas) do VS Code, abra o endereço da porta **5173**
   (algo como `https://<nome-do-codespace>-5173.app.github.dev`).

---

## 4. Primeiro acesso

1. Na tela de login, clique em **Crie aqui** e cadastre um usuário. Todo cadastro feito pela tela é um **atleta**.
2. Para ter um **administrador** (que gerencia quadras e reservas e acompanha o dashboard), promova um usuário já cadastrado:
   - **Com Docker:** `docker compose exec backend python -m app.scripts.promover_admin email@exemplo.com`
   - **Local:** `python -m app.scripts.promover_admin email@exemplo.com`
3. Entre com o administrador e cadastre as quadras no menu **Quadras**. O menu do administrador também tem **Reservas** (consulta, registro de pagamento, cancelamento e reativação) e **Dashboard** (ocupação e faturamento por período).
4. Entre com o atleta para buscar quadras no **Início**, reservar em **Horários**, gerenciar em **Minhas Reservas** e editar seus dados em **Meu Perfil**.

---

## 5. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `Field required` para `DB_PASSWORD` ou `JWT_SECRET_KEY` ao iniciar a API | o arquivo `.env` não existe ou está incompleto | copie `.env.example` para `.env` e preencha os campos |
| `connection refused` / `could not connect to server` | o PostgreSQL não está rodando | inicie o serviço do PostgreSQL ou suba via `docker compose up -d` |
| `relation "quadras" does not exist` (ou outra tabela) | migrações não aplicadas | `alembic upgrade head` |
| `NetworkError` / `Failed to fetch` na tela | a API não está rodando ou está em outra porta | confira se a API responde em `/health`; se estiver em outra porta, use `API_PROXY_TARGET` |
| `address already in use` na porta 8000 ou 5173 | já existe outro processo usando a porta | feche o processo anterior ou pare containers antigos |
| A sessão expira depois de 60 minutos mesmo com o sistema em uso | o site foi aberto por um endereço HTTP que não é `localhost` (por exemplo, o IP da máquina na rede); fora de HTTPS ou `localhost` o navegador não oferece a API Web Locks, e o frontend não renova o token para não arriscar duas renovações ao mesmo tempo | abra por `http://localhost:5173` ou por um endereço HTTPS (como o do Codespaces) |