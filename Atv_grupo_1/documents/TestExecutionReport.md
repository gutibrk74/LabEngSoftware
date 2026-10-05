# Relatório de Execução de Testes — Reserva Gávea (Sprint 1)

## Resumo da execução

| Item | Valor |
| --- | --- |
| Data da execução | 04/10/2026, 22h06 (horário de Brasília) |
| Versão testada | branch `test/automacao-e-report`, commit `b21a9a9` |
| Ambiente | Python 3.14.2, pytest 9.1.1, PostgreSQL 16.15 |
| Comando | `pytest -v` (na pasta `Atv_grupo_1/backend`) |
| Resultado | **97 testes — 97 passaram, 0 falharam** |
| Duração | 53,7 segundos |
| Estabilidade | a suíte completa foi executada 4 vezes seguidas, sem nenhuma falha |

Os testes ficam em `Atv_grupo_1/backend/tests/` e rodam contra um banco PostgreSQL próprio (`reserva_quadras_test`), criado e migrado automaticamente. O banco de desenvolvimento nunca é usado.

---

## Como executar

Na pasta `Atv_grupo_1/backend`, com o ambiente virtual ativado e o PostgreSQL rodando:

```bash
pip install -r requirements-dev.txt
pytest            # resumo
pytest -v -s      # cada teste + o resultado das rodadas de concorrência
```

O banco de testes usa as mesmas credenciais do `.env`. Para usar outro nome de banco: `TEST_DB_NAME=meu_banco_test pytest` (o nome precisa terminar em `_test`).

---

## Cobertura por funcionalidade

| Arquivo | História | Testes | O que é verificado |
| --- | --- | :---: | --- |
| `test_saude.py` | — | 2 | API no ar e uso do banco de testes |
| `test_auth.py` | US01 Autenticação | 21 | cadastro, login, validação do token JWT e perfis |
| `test_quadras.py` | US08 Infraestrutura | 22 | CRUD de quadras, validações, nome único e permissões |
| `test_busca.py` | US03 Busca | 13 | filtros por esporte e por data |
| `test_reservas.py` | US04 Grade e US05 Reserva | 30 | grade de horários, regras da reserva, preço e restrições do banco |
| `test_concorrencia.py` | US05 Reserva | 9 | pedidos simultâneos para o mesmo horário |
| **Total** | | **97** | |

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

Saída da execução (`pytest -v -s tests/test_concorrencia.py`):

```text
[rodada 1] 10 pedidos simultâneos para 9h: 1 aprovado(s) (201), 9 recusado(s) (409)
[rodada 2] 10 pedidos simultâneos para 10h: 1 aprovado(s) (201), 9 recusado(s) (409)
[rodada 3] 10 pedidos simultâneos para 11h: 1 aprovado(s) (201), 9 recusado(s) (409)
[rodada 4] 10 pedidos simultâneos para 12h: 1 aprovado(s) (201), 9 recusado(s) (409)
[rodada 5] 10 pedidos simultâneos para 13h: 1 aprovado(s) (201), 9 recusado(s) (409)
```

---

## 📖 Como preencher esta tabela (Guia para Devs)
Use esta tabela para registrar o resultado dos testes de cada funcionalidade. Preencha ou atualize as colunas conforme o padrão abaixo.

### ID
Código único do teste (ex: CT-01, CT-02). Não altere a ordem ou os IDs existentes.

### Cenário / Casos de Teste:
O que está sendo testado (ex: Validação de payload com valor zerado).

### Status
Estado atual da funcionalidade. Use apenas:

- ✅ Passou (Funcionalidade OK)

- ❌ Falhou (Apresentou bug/divergência)

### Observação / Defeito:

Se Passou: Coloque N/A ou um breve comentário de sucesso.

Se Falhou: Descreva brevemente o comportamento errado observado ou cole o link/ID do card de bug (ex: BUG-102: Erro 500 no checkout).

### Usuario
Seu arroba ou nome de usuário (ex: @nome.sobrenome).

### Data
Data em que a validação foi executada (DD/MM/AAAA).

---

## Casos de teste

A coluna "Observação" indica o arquivo e o teste automatizado correspondentes (em `Atv_grupo_1/backend/tests/`).

| ID | Cenário / Casos de Teste | Status | Observação / Defeito | Usuario | Data |
| --- | :--- | :---: | :--- | :----- | :----- |
| CT-01 | API no ar e testes usando banco próprio | ✅ | `test_saude.py` | @mariana-lins | 04/10/2026 |
| CT-02 | Cadastro normaliza e-mail (minúsculas), CPF e telefone (só dígitos) e cria perfil atleta | ✅ | `test_auth.py::test_cadastro_normaliza_email_cpf_e_telefone` | @mariana-lins | 04/10/2026 |
| CT-03 | Senha guardada com hash argon2, nunca em texto puro | ✅ | `test_auth.py::test_cadastro_guarda_senha_com_hash` | @mariana-lins | 04/10/2026 |
| CT-04 | Cadastro recusa e-mail repetido (sem diferenciar maiúsculas) e CPF repetido — 409 | ✅ | `test_auth.py::test_cadastro_recusa_email_repetido...`, `..._cpf_repetido` | @mariana-lins | 04/10/2026 |
| CT-05 | Cadastro recusa CPF, telefone, senha curta e senhas diferentes — 422 | ✅ | `test_auth.py::test_cadastro_recusa_*` (4 testes) | @mariana-lins | 04/10/2026 |
| CT-06 | Login devolve token JWT e dados do usuário | ✅ | `test_auth.py::test_login_devolve_token_e_dados_do_usuario` | @mariana-lins | 04/10/2026 |
| CT-07 | Login recusa senha errada e e-mail inexistente com a mesma mensagem — 401 | ✅ | `test_auth.py::test_login_recusa_senha_errada_e_email_inexistente` | @mariana-lins | 04/10/2026 |
| CT-08 | Login recusa usuário inativo — 403 | ✅ | `test_auth.py::test_login_recusa_usuario_inativo` | @mariana-lins | 04/10/2026 |
| CT-09 | `/auth/me` devolve o usuário logado | ✅ | `test_auth.py::test_me_devolve_o_usuario_logado` | @mariana-lins | 04/10/2026 |
| CT-10 | Token ausente, inválido, expirado ou assinado com outra chave é recusado — 401 | ✅ | `test_auth.py::test_me_*` (4 testes) | @mariana-lins | 04/10/2026 |
| CT-11 | Token de usuário inativado deixa de valer | ✅ | `test_auth.py::test_token_de_usuario_inativado_deixa_de_valer` | @mariana-lins | 04/10/2026 |
| CT-12 | Rotas de admin: visitante 401, atleta 403, administrador 200 | ✅ | `test_auth.py::test_rota_de_admin_recusa_atleta_e_aceita_administrador` | @mariana-lins | 04/10/2026 |
| CT-13 | Script `promover_admin` dá acesso de admin sem novo login; e-mail inexistente é informado | ✅ | `test_auth.py::test_promover_admin_*` (2 testes) | @mariana-lins | 04/10/2026 |
| CT-14 | Cadastro de quadra com valores padrão (ativa, 8h–22h, sem comodidades) e espaços removidos | ✅ | `test_quadras.py::test_cadastra_quadra_com_valores_padrao` | @mariana-lins | 04/10/2026 |
| CT-15 | Cadastro de quadra recusa esporte inválido, preço zero, 3 casas decimais, dimensão negativa, nome curto e hora fora de 0–24 — 422 | ✅ | `test_quadras.py::test_cadastro_recusa_dados_invalidos` (7 casos) | @mariana-lins | 04/10/2026 |
| CT-16 | Horário de funcionamento invertido ou de duração zero é recusado (API e banco) | ✅ | `test_quadras.py::test_cadastro_recusa_horario_invertido` (2), `test_banco_recusa_horario_invertido` | @mariana-lins | 04/10/2026 |
| CT-17 | Nome de quadra único sem diferenciar maiúsculas, inclusive direto no banco — 409 | ✅ | `test_quadras.py::test_nome_repetido_*`, `test_banco_garante_nome_unico_*` | @mariana-lins | 04/10/2026 |
| CT-18 | Lista pública só com quadras ativas, em ordem de nome; admin vê todas | ✅ | `test_quadras.py::test_lista_publica_mostra_so_ativas_em_ordem_de_nome` | @mariana-lins | 04/10/2026 |
| CT-19 | Detalhe público esconde quadra inativa e inexistente — 404 | ✅ | `test_quadras.py::test_detalhe_publico_esconde_quadra_inativa` | @mariana-lins | 04/10/2026 |
| CT-20 | Edição de quadra (preço, comodidades, horário); exige o campo `ativa`; recusa nome repetido e quadra inexistente | ✅ | `test_quadras.py::test_edita_quadra`, `test_edicao_*` (3 testes) | @mariana-lins | 04/10/2026 |
| CT-21 | Inativar (DELETE) tira a quadra da lista pública sem apagar do banco; reativar devolve | ✅ | `test_quadras.py::test_inativar_e_reativar`, `test_inativar_nao_apaga_do_banco` | @mariana-lins | 04/10/2026 |
| CT-22 | Atleta não pode cadastrar, editar nem inativar quadras — 403; visitante — 401 | ✅ | `test_quadras.py::test_atleta_nao_pode_alterar_quadras` | @mariana-lins | 04/10/2026 |
| CT-23 | Busca sem filtros e por esporte (inclusive esporte sem quadras e esporte inválido) | ✅ | `test_busca.py` (4 testes) | @mariana-lins | 04/10/2026 |
| CT-24 | Busca por data esconde quadra sem horário livre; reserva cancelada libera a quadra | ✅ | `test_busca.py::test_com_data_*`, `test_reserva_cancelada_libera_a_quadra_na_busca` | @mariana-lins | 04/10/2026 |
| CT-25 | Busca combina esporte e data; esconde quadra que já fechou hoje; nunca mostra inativa | ✅ | `test_busca.py` (3 testes) | @mariana-lins | 04/10/2026 |
| CT-26 | Busca recusa data passada, mais de 30 dias e formato errado; aceita o limite de 30 dias | ✅ | `test_busca.py::test_data_invalida` (3), `test_limite_de_30_dias_e_aceito` | @mariana-lins | 04/10/2026 |
| CT-27 | Grade lista os horários de funcionamento com o valor, sem expor quem reservou | ✅ | `test_reservas.py::test_grade_lista_os_horarios_de_funcionamento` | @mariana-lins | 04/10/2026 |
| CT-28 | Grade marca reservas pendentes e pagas como ocupadas e libera as canceladas | ✅ | `test_reservas.py::test_grade_marca_*`, `test_grade_libera_*` | @mariana-lins | 04/10/2026 |
| CT-29 | Grade de hoje bloqueia horários que já começaram; respeita o horário de cada quadra | ✅ | `test_reservas.py::test_grade_de_hoje_*`, `test_grade_respeita_*` | @mariana-lins | 04/10/2026 |
| CT-30 | Grade valida a data (ontem e hoje+31 recusados, hoje+30 aceito) e quadra inativa/inexistente | ✅ | `test_reservas.py::test_grade_valida_a_data` (3), `test_grade_de_quadra_inativa_ou_inexistente` | @mariana-lins | 04/10/2026 |
| CT-31 | Reserva exige login — 401 | ✅ | `test_reservas.py::test_reserva_exige_login` | @mariana-lins | 04/10/2026 |
| CT-32 | Reserva criada como pendente, com o preço, e o horário passa a constar como ocupado | ✅ | `test_reservas.py::test_reserva_criada_como_pendente_com_o_preco` | @mariana-lins | 04/10/2026 |
| CT-33 | Horário já reservado é recusado para outro atleta e para o mesmo atleta — 409 | ✅ | `test_reservas.py::test_horario_ocupado_responde_409` | @mariana-lins | 04/10/2026 |
| CT-34 | Reserva recusa antes de abrir, na hora de fechar, hora 24, horário já iniciado, data passada e hoje+31; aceita a última hora e a próxima hora de hoje | ✅ | `test_reservas.py::test_reserva_recusa_horarios_invalidos` (6), `test_reserva_aceita_horarios_validos` (2) | @mariana-lins | 04/10/2026 |
| CT-35 | Reserva de quadra inativa ou inexistente — 404 | ✅ | `test_reservas.py::test_reserva_de_quadra_inativa_ou_inexistente` | @mariana-lins | 04/10/2026 |
| CT-36 | Reserva exige o valor visto na revisão e recusa preço desatualizado (409 com o preço novo, horário continua livre) | ✅ | `test_reservas.py::test_reserva_exige_o_valor_esperado`, `test_reserva_recusa_preco_desatualizado` | @mariana-lins | 04/10/2026 |
| CT-37 | Reserva guarda o preço do momento (mudança posterior de preço não altera) | ✅ | `test_reservas.py::test_reserva_guarda_o_preco_do_momento` | @mariana-lins | 04/10/2026 |
| CT-38 | Reserva cancelada libera o horário para outra pessoa | ✅ | `test_reservas.py::test_reserva_cancelada_libera_o_horario` | @mariana-lins | 04/10/2026 |
| CT-39 | Virada da meia-noite entre as validações não permite reservar uma data que acabou de passar | ✅ | `test_reservas.py::test_meia_noite_entre_as_validacoes_nao_aceita_data_passada` | @mariana-lins | 04/10/2026 |
| CT-40 | Banco recusa reserva com hora 24, status inválido, valor zero e quadra inexistente | ✅ | `test_reservas.py::test_banco_recusa_reserva_invalida` (4 casos) | @mariana-lins | 04/10/2026 |
| CT-41 | **10 pedidos simultâneos para o mesmo horário (5 rodadas): 1 aprovado e 9 recusados em cada, 1 só reserva no banco** | ✅ | `test_concorrencia.py::test_dez_atletas_no_mesmo_horario_so_um_consegue` (5 rodadas) — 50 tentativas, 5 aprovadas, 45 barradas | @mariana-lins | 04/10/2026 |
| CT-42 | Controle: 10 pedidos simultâneos para horários diferentes são todos aceitos | ✅ | `test_concorrencia.py::test_controle_*` | @mariana-lins | 04/10/2026 |
| CT-43 | Horário cancelado volta a ser disputado: 10 pedidos simultâneos, 1 aceito | ✅ | `test_concorrencia.py::test_horario_cancelado_*` | @mariana-lins | 04/10/2026 |
| CT-44 | 10 gravações simultâneas direto no banco: só 1 aceita | ✅ | `test_concorrencia.py::test_banco_barra_gravacoes_simultaneas_sem_passar_pela_api` | @mariana-lins | 04/10/2026 |
| CT-45 | 3 cadastros simultâneos de quadra com o mesmo nome: 1 aceito, 2 recusados | ✅ | `test_concorrencia.py::test_cadastro_simultaneo_de_quadras_com_mesmo_nome` | @mariana-lins | 04/10/2026 |
