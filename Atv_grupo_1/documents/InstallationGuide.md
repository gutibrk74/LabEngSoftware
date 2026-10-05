# Guia de Instalação — Reserva Gávea

Passo a passo para rodar o sistema do zero: banco de dados, API (backend) e interface web (frontend).

Os comandos estão separados para **Linux/macOS** e **Windows (PowerShell)** quando são diferentes.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Para quê |
| --- | --- | --- |
| [Git](https://git-scm.com/) | qualquer recente | clonar o repositório |
| [Python](https://www.python.org/downloads/) | **3.10 ou superior** | backend (FastAPI) |
| [Node.js](https://nodejs.org/) | **20.19+ ou 22.12+** | frontend (React + Vite) |
| [PostgreSQL](https://www.postgresql.org/download/) **ou** [Docker](https://www.docker.com/) | PostgreSQL 14+ | banco de dados |

Para conferir as versões instaladas:

```bash
git --version
python --version     # no Linux/macOS pode ser python3
node --version
```

---

## 2. Clonar o repositório

```bash
git clone https://github.com/gutibrk74/LabEngSoftware.git
cd LabEngSoftware
git checkout Develop
```

> A branch `Develop` tem a versão mais recente. A `main` recebe as entregas fechadas de cada sprint.

---

## 3. Banco de dados (PostgreSQL)

Escolha **uma** das opções.

### Opção A — Docker (mais simples)

```bash
docker run -d --name pg-reservas -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reserva_quadras -p 5432:5432 postgres:16-alpine
```

Isso cria o banco `reserva_quadras` com usuário `postgres` e senha `postgres`.
Nas próximas vezes, basta ligar o container: `docker start pg-reservas`.

### Opção B — PostgreSQL instalado no computador

Crie um banco vazio chamado `reserva_quadras` (pelo pgAdmin ou pelo terminal):

```bash
psql -U postgres -c "CREATE DATABASE reserva_quadras;"
```

Anote a senha do usuário `postgres`: ela vai no arquivo `.env` do próximo passo.

---

## 4. Backend (API)

Todos os comandos desta seção são executados dentro da pasta do backend:

```bash
cd Atv_grupo_1/backend
```

### 4.1 Ambiente virtual e dependências

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

> Se o PowerShell bloquear o `Activate.ps1`, rode uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Com o ambiente ativado, o terminal mostra `(.venv)` no início da linha. Ative-o sempre que abrir um terminal novo para o backend.

### 4.2 Variáveis de ambiente (`.env`)

Copie o modelo:

```bash
cp .env.example .env          # Linux/macOS
copy .env.example .env        # Windows
```

Abra o `.env` e preencha:

| Variável | O que colocar |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | já vêm prontos para o banco local (`127.0.0.1`, `5432`, `reserva_quadras`, `postgres`) |
| `DB_PASSWORD` | a senha do PostgreSQL (`postgres` se usou a Opção A) |
| `JWT_SECRET_KEY` | uma chave secreta aleatória (veja abaixo) |
| `JWT_ALGORITHM` | deixe `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | tempo de validade do login, em minutos (padrão `60`) |

Para gerar a `JWT_SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

> O `.env` não vai para o Git (está no `.gitignore`). Cada pessoa tem o seu.

### 4.3 Criar as tabelas (migrações)

```bash
alembic upgrade head
```

A saída deve terminar com `Running upgrade ... -> 9421f8449138, cria tabela reservas` (ou nenhuma linha, se o banco já estiver atualizado).

### 4.4 Iniciar a API

```bash
uvicorn app.main:app --reload
```

Confira no navegador:

- http://127.0.0.1:8000/health → `{"status":"ok"}`
- http://127.0.0.1:8000/docs → documentação interativa (Swagger) com todas as rotas

Deixe este terminal aberto enquanto usa o sistema.

---

## 5. Frontend (interface web)

Em **outro terminal**, a partir da raiz do repositório:

```bash
cd Atv_grupo_1/frontend
npm install
npm run dev
```

Abra **http://localhost:5173**.

> O frontend procura a API em `http://127.0.0.1:8000`. Para usar outro endereço, crie o arquivo
> `Atv_grupo_1/frontend/.env.local` com `VITE_API_URL=http://endereco-da-api:porta` e reinicie o `npm run dev`.

---

## 6. Primeiro acesso

1. Na tela de login, clique em **Crie aqui** e cadastre um usuário. Todo cadastro feito pela tela é um **atleta**.
2. Para ter um **administrador** (que gerencia as quadras), promova um usuário já cadastrado. Na pasta `Atv_grupo_1/backend`, com o ambiente virtual ativado:

   ```bash
   python -m app.scripts.promover_admin email@exemplo.com
   ```

3. Entre com o administrador e cadastre as quadras no menu **Quadras**.
4. Entre com o atleta para buscar quadras no **Início** e reservar em **Horários**.

---

## 7. Depois de atualizar o código (`git pull`)

Sempre que puxar mudanças da `Develop`, rode:

```bash
# backend (com o ambiente virtual ativado)
pip install -r requirements.txt
alembic upgrade head

# frontend
npm install
```

---

## 8. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `Field required` para `DB_PASSWORD` ou `JWT_SECRET_KEY` ao iniciar a API | o arquivo `.env` não existe ou está incompleto | refaça o passo 4.2 |
| `connection refused` / `could not connect to server` | o PostgreSQL não está rodando | `docker start pg-reservas` (Opção A) ou inicie o serviço do PostgreSQL |
| `password authentication failed for user "postgres"` | senha errada no `.env` | corrija `DB_PASSWORD` |
| `database "reserva_quadras" does not exist` | banco não criado | refaça o passo 3 |
| `relation "quadras" does not exist` (ou outra tabela) | migrações não aplicadas | `alembic upgrade head` |
| `NetworkError` / `Failed to fetch` na tela | a API não está rodando ou está em outro endereço | confira o passo 4.4 e o `VITE_API_URL` |
| `address already in use` na porta 8000 ou 5173 | já existe outro processo usando a porta | feche o outro terminal ou use `uvicorn app.main:app --reload --port 8001` (e ajuste o `VITE_API_URL`) |
| `npm` reclama da versão do Node | Node.js antigo | instale o Node 20.19+ ou 22.12+ |
