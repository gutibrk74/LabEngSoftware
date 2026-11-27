# Relatório de Execução de Testes — Reserva Gávea

## Resumo da execução

| Item | Valor |
| --- | --- |
| Última execução | 27/11/2026 |
| Versão testada | branch `docs/fechamento-sprint-2` (Develop ao fim da Sprint 2: US01 a US09, renovação do token e sincronização da sessão; API versão 1.0.0) |
| Ambiente | Backend: Python 3.12.3, pytest 9.1.1, PostgreSQL 16.15. Frontend: Node.js 24.21.0, TypeScript 6.0.3 (execução local) |
| Comandos | `pytest -v` (na pasta `Atv_grupo_1/backend`) e `npm run test:sessao` (na pasta `Atv_grupo_1/frontend`) |
| Resultado | **144 testes — 144 passaram, 0 falharam** (139 do backend + 5 de sessão do frontend) |
| Estabilidade | as duas suítes completas executadas localmente, sem nenhuma falha |

Os testes do backend ficam em `Atv_grupo_1/backend/tests/` e rodam contra um banco PostgreSQL próprio (`reserva_quadras_test`), criado e migrado automaticamente. O banco de desenvolvimento nunca é usado.

Os testes de sessão do frontend ficam em `Atv_grupo_1/frontend/tests/sessao.test.cjs`. Eles usam o executor de testes nativo do Node.js (`node:test`) e o TypeScript já instalado pelo projeto, sem dependências novas: o teste compila `services/sessao.ts` e `services/renovacaoSessao.ts` numa pasta temporária e simula `localStorage`, `window` e a API Web Locks.

---

## Como executar

### Via Docker Compose

```bash
cd Atv_grupo_1
docker compose exec backend sh -c "pip install --no-cache-dir -r requirements-dev.txt && pytest"
```

### Localmente (com `.venv` ativada e PostgreSQL rodando)

```bash
cd Atv_grupo_1/backend
pip install -r requirements-dev.txt
pytest            # resumo
pytest -v -s      # cada teste + o resultado das rodadas de concorrência
```

### Testes de sessão do frontend

```bash
cd Atv_grupo_1/frontend
npm install           # só na primeira vez
npm run test:sessao
```

O banco de testes usa as mesmas credenciais do `.env`. Para usar outro nome de banco: `TEST_DB_NAME=meu_banco_test pytest` (o nome precisa terminar em `_test`).

---

## Cobertura por funcionalidade

| Arquivo | História | Testes | O que é verificado |
| --- | --- | :---: | --- |
| `test_saude.py` | — | 2 | API no ar e uso do banco de testes |
| `test_auth.py` | US01 Autenticação e US02 Perfil | 29 | cadastro, CPF ASCII, login, validação do token JWT, renovação do token (`/auth/refresh`), edição de perfil e troca de senha |
| `test_quadras.py` | US08 Infraestrutura | 22 | CRUD de quadras, validações, nome único e permissões |
| `test_busca.py` | US03 Busca | 13 | filtros por esporte e por data |
| `test_reservas.py` | US04 Grade, US05 Reserva e US06 Minhas Reservas | 33 | grade de horários, regras da reserva, listagem do atleta, cancelamento com antecedência e restrições do banco |
| `test_admin_reservas.py` | US07 Gestão de Reservas | 15 | listagem e filtros do admin, permissões, pagamento, cancelamento sem antecedência mínima e regras de reativação |
| `test_repositorios.py` | US05 / US08 (integridade) | 5 | só o índice de horário (reservas) e o índice de nome (quadras) viram 409; outros erros sobem e a sessão é desfeita |
| `test_concorrencia.py` | US05 Reserva e US07 | 14 | pedidos simultâneos para o mesmo horário, inclusive a reativação pelo administrador |
| `test_metricas.py` | US09 Dashboard e Relatórios | 6 | permissões, período padrão e validação, reservas por status, faturamento, ocupação por quadra e geral e por esporte |
| **Total do backend** | | **139** | |
| `frontend/tests/sessao.test.cjs` | US01 Autenticação (sessão no frontend) | 5 | janela de renovação, mesma sessão × novo login, 401 atrasado, trava entre abas e ausência de Web Locks |
| **Total geral** | | **144** | |

Os testes de horário usam um relógio fixo (sábado, 10/10/2026, 15h30 em São Paulo), para que o resultado não dependa do dia em que a suíte é executada.

---

## Destaque: concorrência e bloqueio de reserva duplicada

### Objetivo

Comprovar o requisito central do sistema: **um mesmo horário de uma quadra nunca pode ter duas reservas**, mesmo quando vários atletas confirmam ao mesmo tempo.

### Como o sistema garante a regra

A garantia não depende apenas de uma checagem no código (que dois pedidos simultâneos poderiam passar juntos). Ela está **no próprio banco de dados**: o índice único parcial `uq_reservas_quadra_data_horario` impede duas linhas com a mesma quadra, data e horário entre as reservas que não estão canceladas. Quando dois pedidos chegam juntos, o PostgreSQL aceita o primeiro e recusa o segundo; o `ReservaRepository` converte essa recusa na resposta `409 — Esse horário já foi reservado.`

### Metodologia

- **10 atletas diferentes**, cada um com seu próprio login.
- Cada pedido roda numa **thread própria, com seu próprio cliente HTTP e sua própria conexão com o banco**, como se fossem 10 navegadores.
- Todas as threads esperam numa **barreira** (`threading.Barrier`) e são liberadas no mesmo instante, para os pedidos chegarem juntos ao servidor.
- O teste é repetido em **5 rodadas**, cada uma num horário diferente.
- Depois de cada rodada, o banco é consultado para confirmar quantas reservas existem de fato.

### Resultado

| Rodada | Horário disputado | Pedidos simultâneos | Aprovados (201) | Recusados (409) | Reservas no banco |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 9h | 10 | 1 | 9 | 1 |
| 2 | 10h | 10 | 1 | 9 | 1 |
| 3 | 11h | 10 | 1 | 9 | 1 |
| 4 | 12h | 10 | 1 | 9 | 1 |
| 5 | 13h | 10 | 1 | 9 | 1 |
| **Total** | | **50** | **5** | **45** | **5** |

**Em 50 tentativas simultâneas, o sistema aprovou exatamente 1 reserva por horário e barrou as outras 45. Nenhuma reserva duplicada foi gravada.**

### Verificações complementares

| Teste | Resultado |
| --- | --- |
| **Controle:** 10 pedidos simultâneos para **horários diferentes** | os 10 foram aceitos — prova que as recusas acima vêm do conflito de horário, e não do paralelismo |
| Horário com reserva **cancelada** disputado por 10 atletas ao mesmo tempo | 1 aceito, 9 recusados — o cancelamento libera o horário e a regra continua valendo |
| 10 gravações simultâneas **direto no banco**, sem passar pela API nem pelas regras do serviço | só 1 foi gravada — a garantia está no banco, não só no código |
| 3 cadastros simultâneos de quadra com o mesmo nome ("Arena", "ARENA", "arena") | 1 aceito, 2 recusados — nome único sem diferenciar maiúsculas |

### Reativação pelo administrador (US07)

Reativar uma reserva cancelada a deixa ativa de novo, então ela também disputa o horário pelo índice `uq_reservas_quadra_data_horario`. O serviço **não** consulta a ocupação antes de gravar: quem decide é o banco, e o `ReservaRepository._confirmar()` converte a recusa em `409 — Esse horário já foi reservado.`

**Metodologia:** a mesma da seção anterior (threads, um cliente HTTP por pedido e barreira). Em cada rodada, um atleta reserva e cancela um horário; em seguida, **o administrador reativa essa reserva ao mesmo tempo que 9 outros atletas tentam reservar o mesmo horário**. A reativação aceita responde `200`, a reserva nova aceita responde `201` e as recusas respondem `409`.

| Rodada | Horário disputado | Pedidos simultâneos | Aceitos | Recusados (409) | Reservas ativas no banco | Ficou com o horário |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | 14h | 10 | 1 | 9 | 1 | um atleta (nova reserva) |
| 2 | 15h | 10 | 1 | 9 | 1 | um atleta (nova reserva) |
| 3 | 16h | 10 | 1 | 9 | 1 | um atleta (nova reserva) |
| 4 | 17h | 10 | 1 | 9 | 1 | um atleta (nova reserva) |
| 5 | 18h | 10 | 1 | 9 | 1 | um atleta (nova reserva) |

**Em todas as rodadas, um único pedido ficou com o horário.** Nesta execução, o administrador perdeu as 5 disputas: o caminho da reativação faz mais leituras antes do commit e chega depois. Como o serviço não verifica a ocupação antes de gravar, o `409` recebido pelo administrador só pode ter vindo do índice do banco, convertido pelo `_confirmar()`, que é exatamente o caminho que o teste precisa comprovar. O caso inverso (reativação aceita e atleta recusado) é verificado sem concorrência em `test_admin_reservas.py::test_reativar_volta_para_pendente_e_ocupa_o_horario`.

### Verificação manual da tela Gestão de Reservas

A tela `#/reservas` foi exercitada no Chrome (modo headless, API e frontend apontando para o banco de testes) com 7 reservas de 2 atletas em 2 quadras. Resultado: menu e título corretos para o administrador; 7 reservas no período padrão (hoje até hoje + 7); marcar como paga e desfazer; confirmação antes de cancelar (e "Voltar" não altera nada); reativar um horário já ocupado mostra "Esse horário já foi reservado." no modal e mantém a reserva cancelada; reativar um horário livre volta para pendente; filtros de status e atalho "Hoje"; sem rolagem horizontal da página em 390 px (a tabela rola dentro do próprio contêiner); o atleta que abre `#/reservas` vai para o Início e não vê o item no menu.

---

### Verificação manual da tela Dashboard

A tela `#/dashboard` foi exercitada no Chrome (modo headless, banco de testes) com 15 reservas no mês (pendentes, pagas e canceladas, em datas passadas e futuras) em 3 quadras, uma delas inativa. Resultado: item "Dashboard" ativo no menu do administrador; cards com os mesmos números calculados à mão (15 reservas; realizado R$ 740,00, a receber R$ 540,00, previsto R$ 1.280,00); barras de ocupação com a quadra inativa marcada e dica no hover ("6 h reservadas de 420 h de funcionamento"); atalho "Últimos 7 dias" troca o período (7 dias, 266 h disponíveis); sem rolagem horizontal da página em 390 px; o atleta que abre `#/dashboard` vai para o Início e não vê o item no menu.

---

## Casos de teste

A coluna "Observação" indica o arquivo e o teste automatizado correspondentes (em `Atv_grupo_1/backend/tests/`).

| ID | Cenário / Casos de Teste | Status | Observação / Defeito | Usuario | Data |
| --- | :--- | :---: | :--- | :----- | :----- |
| CT-01 | API no ar e testes usando banco próprio | ✅ | `test_saude.py` | @gutibrk74 | 04/10/2026 |
| CT-02 | Cadastro normaliza e-mail (minúsculas), CPF e telefone (só dígitos) e cria perfil atleta | ✅ | `test_auth.py::test_cadastro_normaliza_email_cpf_e_telefone` | @gutibrk74 | 04/10/2026 |
| CT-03 | Senha guardada com hash argon2, nunca em texto puro | ✅ | `test_auth.py::test_cadastro_guarda_senha_com_hash` | @gutibrk74 | 04/10/2026 |
| CT-04 | Cadastro recusa e-mail repetido (sem diferenciar maiúsculas) e CPF repetido — 409 | ✅ | `test_auth.py::test_cadastro_recusa_email_repetido...`, `..._cpf_repetido` | @gutibrk74 | 04/10/2026 |
| CT-05 | Cadastro recusa CPF, telefone, senha curta e senhas diferentes — 422 | ✅ | `test_auth.py::test_cadastro_recusa_*` (4 testes) | @gutibrk74 | 04/10/2026 |
| CT-06 | Login devolve token JWT e dados do usuário | ✅ | `test_auth.py::test_login_devolve_token_e_dados_do_usuario` | @gutibrk74 | 04/10/2026 |
| CT-07 | Login recusa senha errada e e-mail inexistente com a mesma mensagem — 401 | ✅ | `test_auth.py::test_login_recusa_senha_errada_e_email_inexistente` | @gutibrk74 | 04/10/2026 |
| CT-08 | Login recusa usuário inativo — 403 | ✅ | `test_auth.py::test_login_recusa_usuario_inativo` | @gutibrk74 | 04/10/2026 |
| CT-09 | `/auth/me` devolve o usuário logado | ✅ | `test_auth.py::test_me_devolve_o_usuario_logado` | @gutibrk74 | 04/10/2026 |
| CT-10 | Token ausente, inválido, expirado ou assinado com outra chave é recusado — 401 | ✅ | `test_auth.py::test_me_*` (4 testes) | @gutibrk74 | 04/10/2026 |
| CT-11 | Token de usuário inativado deixa de valer | ✅ | `test_auth.py::test_token_de_usuario_inativado_deixa_de_valer` | @gutibrk74 | 04/10/2026 |
| CT-12 | Rotas de admin: visitante 401, atleta 403, administrador 200 | ✅ | `test_auth.py::test_rota_de_admin_recusa_atleta_e_aceita_administrador` | @gutibrk74 | 04/10/2026 |
| CT-13 | Script `promover_admin` dá acesso de admin sem novo login; e-mail inexistente é informado | ✅ | `test_auth.py::test_promover_admin_*` (2 testes) | @gutibrk74 | 04/10/2026 |
| CT-14 | Cadastro de quadra com valores padrão (ativa, 8h–22h, sem comodidades) e espaços removidos | ✅ | `test_quadras.py::test_cadastra_quadra_com_valores_padrao` | @gutibrk74 | 04/10/2026 |
| CT-15 | Cadastro de quadra recusa esporte inválido, preço zero, 3 casas decimais, dimensão negativa, nome curto e hora fora de 0–24 — 422 | ✅ | `test_quadras.py::test_cadastro_recusa_dados_invalidos` (7 casos) | @gutibrk74 | 04/10/2026 |
| CT-16 | Horário de funcionamento invertido ou de duração zero é recusado (API e banco) | ✅ | `test_quadras.py::test_cadastro_recusa_horario_invertido` (2), `test_banco_recusa_horario_invertido` | @gutibrk74 | 04/10/2026 |
| CT-17 | Nome de quadra único sem diferenciar maiúsculas, inclusive direto no banco — 409 | ✅ | `test_quadras.py::test_nome_repetido_*`, `test_banco_garante_nome_unico_*` | @gutibrk74 | 04/10/2026 |
| CT-18 | Lista pública só com quadras ativas, em ordem de nome; admin vê todas | ✅ | `test_quadras.py::test_lista_publica_mostra_so_ativas_em_ordem_de_nome` | @gutibrk74 | 04/10/2026 |
| CT-19 | Detalhe público esconde quadra inativa e inexistente — 404 | ✅ | `test_quadras.py::test_detalhe_publico_esconde_quadra_inativa` | @gutibrk74 | 04/10/2026 |
| CT-20 | Edição de quadra (preço, comodidades, horário); exige o campo `ativa`; recusa nome repetido e quadra inexistente | ✅ | `test_quadras.py::test_edita_quadra`, `test_edicao_*` (3 testes) | @gutibrk74 | 04/10/2026 |
| CT-21 | Inativar (DELETE) tira a quadra da lista pública sem apagar do banco; reativar devolve | ✅ | `test_quadras.py::test_inativar_e_reativar`, `test_inativar_nao_apaga_do_banco` | @gutibrk74 | 04/10/2026 |
| CT-22 | Atleta não pode cadastrar, editar nem inativar quadras — 403; visitante — 401 | ✅ | `test_quadras.py::test_atleta_nao_pode_alterar_quadras` | @gutibrk74 | 04/10/2026 |
| CT-23 | Busca sem filtros e por esporte (inclusive esporte sem quadras e esporte inválido) | ✅ | `test_busca.py` (4 testes) | @gutibrk74 | 04/10/2026 |
| CT-24 | Busca por data esconde quadra sem horário livre; reserva cancelada libera a quadra | ✅ | `test_busca.py::test_com_data_*`, `test_reserva_cancelada_libera_a_quadra_na_busca` | @gutibrk74 | 04/10/2026 |
| CT-25 | Busca combina esporte e data; esconde quadra que já fechou hoje; nunca mostra inativa | ✅ | `test_busca.py` (3 testes) | @gutibrk74 | 04/10/2026 |
| CT-26 | Busca recusa data passada, mais de 30 dias e formato errado; aceita o limite de 30 dias | ✅ | `test_busca.py::test_data_invalida` (3), `test_limite_de_30_dias_e_aceito` | @gutibrk74 | 04/10/2026 |
| CT-27 | Grade lista os horários de funcionamento com o valor, sem expor quem reservou | ✅ | `test_reservas.py::test_grade_lista_os_horarios_de_funcionamento` | @gutibrk74 | 04/10/2026 |
| CT-28 | Grade marca reservas pendentes e pagas como ocupadas e libera as canceladas | ✅ | `test_reservas.py::test_grade_marca_*`, `test_grade_libera_*` | @gutibrk74 | 04/10/2026 |
| CT-29 | Grade de hoje bloqueia horários que já começaram; respeita o horário de cada quadra | ✅ | `test_reservas.py::test_grade_de_hoje_*`, `test_grade_respeita_*` | @gutibrk74 | 04/10/2026 |
| CT-30 | Grade valida a data (ontem e hoje+31 recusados, hoje+30 aceito) e quadra inativa/inexistente | ✅ | `test_reservas.py::test_grade_valida_a_data` (3), `test_grade_de_quadra_inativa_ou_inexistente` | @gutibrk74 | 04/10/2026 |
| CT-31 | Reserva exige login — 401 | ✅ | `test_reservas.py::test_reserva_exige_login` | @gutibrk74 | 04/10/2026 |
| CT-32 | Reserva criada como pendente, com o preço, e o horário passa a constar como ocupado | ✅ | `test_reservas.py::test_reserva_criada_como_pendente_com_o_preco` | @gutibrk74 | 04/10/2026 |
| CT-33 | Horário já reservado é recusado para outro atleta e para o mesmo atleta — 409 | ✅ | `test_reservas.py::test_horario_ocupado_responde_409` | @gutibrk74 | 04/10/2026 |
| CT-34 | Reserva recusa antes de abrir, na hora de fechar, hora 24, horário já iniciado, data passada e hoje+31; aceita a última hora e a próxima hora de hoje | ✅ | `test_reservas.py::test_reserva_recusa_horarios_invalidos` (6), `test_reserva_aceita_horarios_validos` (2) | @gutibrk74 | 04/10/2026 |
| CT-35 | Reserva de quadra inativa ou inexistente — 404 | ✅ | `test_reservas.py::test_reserva_de_quadra_inativa_ou_inexistente` | @gutibrk74 | 04/10/2026 |
| CT-36 | Reserva exige o valor visto na revisão e recusa preço desatualizado (409 com o preço novo, horário continua livre) | ✅ | `test_reservas.py::test_reserva_exige_o_valor_esperado`, `test_reserva_recusa_preco_desatualizado` | @gutibrk74 | 04/10/2026 |
| CT-37 | Reserva guarda o preço do momento (mudança posterior de preço não altera) | ✅ | `test_reservas.py::test_reserva_guarda_o_preco_do_momento` | @gutibrk74 | 04/10/2026 |
| CT-38 | Reserva cancelada libera o horário para outra pessoa | ✅ | `test_reservas.py::test_reserva_cancelada_libera_o_horario` | @gutibrk74 | 04/10/2026 |
| CT-39 | Virada da meia-noite entre as validações não permite reservar uma data que acabou de passar | ✅ | `test_reservas.py::test_meia_noite_entre_as_validacoes_nao_aceita_data_passada` | @gutibrk74 | 04/10/2026 |
| CT-40 | Banco recusa reserva com hora 24, status inválido, valor zero e quadra inexistente | ✅ | `test_reservas.py::test_banco_recusa_reserva_invalida` (4 casos) | @gutibrk74 | 04/10/2026 |
| CT-41 | **10 pedidos simultâneos para o mesmo horário (5 rodadas): 1 aprovado e 9 recusados em cada, 1 só reserva no banco** | ✅ | `test_concorrencia.py::test_dez_atletas_no_mesmo_horario_so_um_consegue` (5 rodadas) — 50 tentativas, 5 aprovadas, 45 barradas | @gutibrk74 | 04/10/2026 |
| CT-42 | Controle: 10 pedidos simultâneos para horários diferentes são todos aceitos | ✅ | `test_concorrencia.py::test_controle_*` | @gutibrk74 | 04/10/2026 |
| CT-43 | Horário cancelado volta a ser disputado: 10 pedidos simultâneos, 1 aceito | ✅ | `test_concorrencia.py::test_horario_cancelado_*` | @gutibrk74 | 04/10/2026 |
| CT-44 | 10 gravações simultâneas direto no banco: só 1 aceita | ✅ | `test_concorrencia.py::test_banco_barra_gravacoes_simultaneas_sem_passar_pela_api` | @gutibrk74 | 04/10/2026 |
| CT-45 | 3 cadastros simultâneos de quadra com o mesmo nome: 1 aceito, 2 recusados | ✅ | `test_concorrencia.py::test_cadastro_simultaneo_de_quadras_com_mesmo_nome` | @gutibrk74 | 04/10/2026 |
| CT-46 | Cadastro bloqueia CPF com dígitos Unicode equivalentes — 422 | ✅ | `test_auth.py::test_cadastro_recusa_cpf_com_digitos_unicode` | @gutibrk74 | 23/11/2026 |
| CT-47 | Listagem `/reservas/minhas` retorna apenas reservas do atleta autenticado com dados da quadra | ✅ | `test_reservas.py::test_listar_minhas_reservas_filtra_por_atleta` | @gutibrk74 | 23/11/2026 |
| CT-48 | Cancelamento `/reservas/{id}/cancelar` libera horário na grade e bloqueia cancelamento fora do prazo (< 2h) ou por outro usuário (403/422) | ✅ | `test_reservas.py::test_cancelar_reserva_*` (2 testes) | @gutibrk74 | 23/11/2026 |
| CT-49 | Edição de perfil (`PATCH /auth/me`) atualiza nome, telefone e cidade e recusa telefone inválido — 422 | ✅ | `test_auth.py::test_atualizar_perfil_*` (2 testes) | @gutibrk74 | 23/11/2026 |
| CT-50 | Alteração de senha (`PATCH /auth/me/senha`) valida senha atual e permite login com a nova senha | ✅ | `test_auth.py::test_alterar_senha_do_atleta` | @gutibrk74 | 23/11/2026 |
| CT-51 | Repositório de reservas: horário repetido vira 409 e a sessão continua utilizável depois do rollback | ✅ | `test_repositorios.py::test_horario_repetido_vira_conflito_e_sessao_continua_valida` | @mariana-lins | 24/11/2026 |
| CT-52 | Repositório de reservas: erro de integridade que não é do índice de horário (valor zero; horário inválido no cancelamento) sobe como erro real, sem virar 409, e nada é gravado | ✅ | `test_repositorios.py::test_outro_erro_de_integridade_nao_vira_conflito_de_horario`, `test_cancelar_nao_esconde_erro_que_nao_e_de_horario` | @mariana-lins | 24/11/2026 |
| CT-53 | Repositório de quadras: nome repetido (sem diferenciar maiúsculas) vira 409; erro que não é de nome (horário invertido) não vira "Já existe uma quadra com este nome." | ✅ | `test_repositorios.py::test_nome_repetido_vira_conflito_de_nome`, `test_erro_que_nao_e_de_nome_nao_vira_conflito_de_nome` | @mariana-lins | 24/11/2026 |
| CT-54 | Rotas `/admin/reservas`: visitante 401, atleta 403 | ✅ | `test_admin_reservas.py::test_rotas_de_admin_recusam_visitante_e_atleta` | @mariana-lins | 24/11/2026 |
| CT-55 | Listagem do admin traz nome e e-mail do atleta e nome e esporte da quadra, em ordem de agenda | ✅ | `test_admin_reservas.py::test_lista_traz_atleta_e_quadra_em_ordem_de_agenda` | @mariana-lins | 24/11/2026 |
| CT-56 | Filtros por período (um dia, só início, só fim), quadra e status; período invertido, status inválido e data mal formatada — 422 | ✅ | `test_admin_reservas.py::test_filtros_por_periodo_quadra_e_status`, `test_filtros_invalidos` | @mariana-lins | 24/11/2026 |
| CT-57 | Marcar como paga e desfazer o pagamento; pagamento registrado depois do jogo; atleta vê o status atualizado | ✅ | `test_admin_reservas.py::test_marcar_como_paga_e_desfazer`, `test_pagamento_pode_ser_registrado_depois_do_jogo` | @mariana-lins | 24/11/2026 |
| CT-58 | Admin cancela sem a antecedência de 2h (que o atleta precisa respeitar), cancela reserva paga e reserva passada; o horário volta a ficar livre | ✅ | `test_admin_reservas.py::test_admin_cancela_*` (2 testes) | @mariana-lins | 24/11/2026 |
| CT-59 | Reativar volta só para pendente, ocupa o horário e impede nova reserva (409); cancelada → paga é recusada — 422 | ✅ | `test_admin_reservas.py::test_reativar_volta_para_pendente_e_ocupa_o_horario`, `test_cancelada_nao_vai_direto_para_paga` | @mariana-lins | 24/11/2026 |
| CT-60 | Reativar recusa horário já iniciado e quadra inativa — 422 | ✅ | `test_admin_reservas.py::test_reativar_recusa_*` (2 testes) | @mariana-lins | 24/11/2026 |
| CT-61 | Reativar horário já ocupado por outra reserva — 409 "Esse horário já foi reservado.", sem alterar nenhuma das duas | ✅ | `test_admin_reservas.py::test_reativar_horario_ja_ocupado_responde_409` | @mariana-lins | 24/11/2026 |
| CT-62 | Mesmo status — 409; reserva inexistente — 404; status inválido — 422 | ✅ | `test_admin_reservas.py::test_mesmo_status_responde_409`, `test_reserva_inexistente_e_status_invalido` | @mariana-lins | 24/11/2026 |
| CT-63 | **Reativação pelo admin simultânea a 9 reservas de atletas (5 rodadas): 1 aceito e 9 recusados em cada, 1 só reserva ativa no banco** | ✅ | `test_concorrencia.py::test_reativacao_pelo_admin_disputa_o_horario_com_atletas` (5 rodadas) | @mariana-lins | 24/11/2026 |
| CT-64 | Rota `/admin/metricas`: visitante 401, atleta 403 | ✅ | `test_metricas.py::test_metricas_recusam_visitante_e_atleta` | @mariana-lins | 24/11/2026 |
| CT-65 | Sem datas, o período é o mês atual (01 a 31/10/2026, 31 dias); sem quadras e sem reservas, tudo zerado e taxa 0, sem divisão por zero | ✅ | `test_metricas.py::test_periodo_padrao_e_o_mes_atual_e_vazio_nao_divide_por_zero` | @mariana-lins | 24/11/2026 |
| CT-66 | Quadra sem reservas no período: ocupação 0 com as horas de funcionamento contadas (14 h × 2 dias) e esporte com 0 reservas | ✅ | `test_metricas.py::test_quadra_sem_reservas_tem_ocupacao_zero` | @mariana-lins | 24/11/2026 |
| CT-67 | Período invertido, maior que 366 dias, com só uma das datas ou mal formatado — 422; exatamente 366 dias é aceito | ✅ | `test_metricas.py::test_periodo_invalido` | @mariana-lins | 24/11/2026 |
| CT-68 | Contagem por status e faturamento: realizado = pagas, a receber = pendentes, previsto = soma; canceladas e reservas fora do período (pela data do jogo) não contam; usa o valor do momento da reserva mesmo após mudar o preço da quadra | ✅ | `test_metricas.py::test_contagem_por_status_e_faturamento` | @mariana-lins | 24/11/2026 |
| CT-69 | Ocupação com quadras de horários diferentes em 3 dias (3/42 h, 6/12 h e 1/36 h), quadra inativa com reserva ativa incluída e marcada, inativa só com cancelada excluída, ocupação geral (10/90 h) e reservas e faturamento previsto por esporte | ✅ | `test_metricas.py::test_ocupacao_por_quadra_geral_e_por_esporte` | @mariana-lins | 24/11/2026 |
| CT-70 | Renovação (`POST /auth/refresh`) de um token perto de expirar devolve um token novo da mesma sessão (mesmo `sub` e `sid`), com expiração maior, os dados do usuário, e o token novo é aceito em `/auth/me` | ✅ | `test_auth.py::test_refresh_renova_token_valido` | @mariana-lins | 27/11/2026 |
| CT-71 | Renovação recusa token ausente, malformado, expirado ou assinado com outra chave — 401 | ✅ | `test_auth.py::test_refresh_recusa_token_invalido_ou_expirado` | @mariana-lins | 27/11/2026 |
| CT-72 | Renovação recusa usuário inativado — 401 | ✅ | `test_auth.py::test_refresh_recusa_usuario_inativo` | @mariana-lins | 27/11/2026 |
| CT-73 | Renovação usa o perfil atual do banco (usuário promovido a administrador recebe o perfil novo) | ✅ | `test_auth.py::test_refresh_usa_perfil_atual_do_banco` | @mariana-lins | 27/11/2026 |
| CT-74 | Frontend renova só na janela final do token, com atividade recente e aba visível; não renova token expirado, fora da janela ou inválido | ✅ | `sessao.test.cjs` — "renova só na janela, com atividade recente e aba visível" | @mariana-lins | 27/11/2026 |
| CT-75 | Frontend distingue a renovação da mesma sessão (mesmo `sid` e usuário) de um novo login, inclusive da mesma conta | ✅ | `sessao.test.cjs` — "distingue renovação de um novo login da mesma conta" | @mariana-lins | 27/11/2026 |
| CT-76 | 401 ou expiração de um token anterior não remove o token novo nem dispara o fim da sessão; o do token atual, sim | ✅ | `sessao.test.cjs` — "401/expiração do token anterior não remove token novo" | @mariana-lins | 27/11/2026 |
| CT-77 | Duas tentativas simultâneas de renovação (Web Locks) executam uma só renovação, e o token antigo não é renovado de novo | ✅ | `sessao.test.cjs` — "duas tentativas simultâneas não executam duas renovações e token antigo não é reutilizado" | @mariana-lins | 27/11/2026 |
| CT-78 | Sem suporte a Web Locks, o frontend não inicia renovação concorrente insegura e mantém o token | ✅ | `sessao.test.cjs` — "sem Web Locks não inicia renovação concorrente insegura" | @mariana-lins | 27/11/2026 |
