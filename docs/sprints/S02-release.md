# S02 — Release Report

> Sprint em andamento. A tabela de execução abaixo é atualizada pelo `hx` a cada tarefa; o Tech Lead completa o restante no fechamento (skill release-report), mantendo esta tabela.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Base: visual escuro (tokens, fontes), menu com as 3 telas + Ociosos e limites, rotas (telas vazias), remoção da Visão geral, tipos e mock novos, `lib` (progress, idle, since), `ProgressRow`, `Spark` e stub de `Gantt` | tech-lead | 40 min | 19:22 | 19:35 | 13 min |
| ✅ | T02 | Tela Bem-vindo de volta | clone | 20 min | 19:29 | 19:41 | 11 min |
| ✅ | T03 | Tela Sala de controle (colunas, alertas, tabela de horários, acordeão, agentes, consumo) | clone | 30 min | 19:29 | 19:41 | 11 min |
| ✅ | T04 | Mini-gantt (componente usado pela Sala de controle) | clone | 25 min | 19:29 | 19:41 | 11 min |
| ✅ | T05 | Tela Linha do tempo | clone | 25 min | 19:29 | 19:41 | 11 min |
| ✅ | T06 | Tela Ociosos | clone | 15 min | 19:29 | 19:41 | 11 min |
| ✅ | T07 | Revisão: fidelidade ao rascunho; qualidade da apresentação, layout e código; lint/tipos/testes zerados | reviewer | 20 min | 19:37 | 19:41 | 3 min |
| ✅ | **Total** | 7 tarefas |  | 1 h 30 min | 2026-10-18 19:22 | 2026-10-18 19:41 | 18 min |

## Entrega

O painel ganhou as quatro telas do draft da S02, com tema escuro e as fontes IBM Plex:

- **Bem-vindo de volta:** uma coluna por projeto ativo, com o que mudou desde o seu último comando, fase, alertas, próximo passo e documentos da sprint.
- **Sala de controle:** uma coluna por projeto, com acordeões nesta ordem:
  - Horários: tabela, mini-gantt e duração corrida.
  - Fora da sprint.
  - Itens da sprint.
  - Agentes.
  - Consumo, com o gasto da sprint.
- **Linha do tempo:** uma faixa por projeto, com as barras dos agentes e os marcos do período.
- **Ociosos:** lista os projetos parados, com o botão "Trazer para ativos".

O menu passou a mostrar os limites de 5 h e semanal, a aba "Ociosos (N)" e um menu provisório "Projetos", que leva às abas de qualquer projeto. A tela Visão geral saiu. Os dados continuam vindo do mock.

Fora do código, a sprint também entregou:

- a spec do backend ([docs/specs/0001-backend-dados-e-api.md](../specs/0001-backend-dados-e-api.md)), com eventos, banco SQLite e contratos da API;
- uma página com o fluxo da esteira: https://claude.ai/artifact/7EeekR8GqBGofEqEtV67vn

## Indicadores

| Indicador | S01 | S02 |
|---|---|---|
| Tarefas feitas | 8/8 | 7/7 |
| Tempo de relógio (previsto · corrido) | 3 h 15 min · 14 min | 1 h 30 min · 18 min |
| Soma das tarefas (planejada · real) | 7 h 15 min · 1 h 4 min | 2 h 55 min · 1 h 13 min |
| Real ÷ planejado (soma) | 15% | 42% |
| Custo total | US$ 4.28 | US$ 10.88 |
| Retrabalho (ajustes pedidos por Daniel) | 0 | 3 |
| Reprovações do Reviewer | 0 | 0 |
| Alertas de contexto · handoffs | — | 1 · 1 |

Custo por agente na S02:

| Agente | Custo |
|---|---|
| Tech Lead | US$ 5.61 |
| Clones | US$ 4.20 |
| Reviewer | US$ 1.07 |

A sprint esperou 34 min pelo seu teste. A tabela de execução não mede o tempo gasto na rodada de ajustes depois da entrega.

## Revisão

Uma onda principal (T02–T06 e T07) e uma revisão da rodada de ajustes, sempre com o mesmo Reviewer (Sonnet). Nenhuma reprovação.

Achados corrigidos antes do commit:

- **Textos:** "hoje" no lugar de "há 0 dias" e "dia" no singular.
- **Mini-gantt:** a linha "agora" passou a ficar limitada a 100%.
- **Backlog:** o arquivo voltou ao formato de fim de linha original (CRLF).
- **Spec:** duas notas para ela bater com `types.ts`:
  - `backlog`/`roadmap` só vêm nas telas de projeto;
  - `lastCommand` traz o chat.
- **Código sem uso:** saiu o `ganttLayout`.

**Não verificado no navegador:** os agentes não têm navegador. A largura de 360 px (eixo de horas do gantt) só foi conferida pelo CSS.

## Retorno de Daniel

Uma rodada com vários ajustes, todos feitos:

- Agentes e Consumo viraram acordeões, com resumo visível fechado.
- Acordeões abertos por padrão:
  - Fora da sprint e Itens da sprint, quando há tarefa rodando;
  - Consumo, sempre.
- "Duração corrida" e o gantt foram para Horários. "Gasto da sprint" foi para Consumo.
- O gantt passou a usar o horário real, com uma previsão tracejada para as tarefas não iniciadas.
- O menu "Projetos" entrou como solução provisória. A navegação de verdade pelos projetos e documentos foi para o backlog, como candidata à S03.
- A spec do backend e a página da esteira foram escritas.

Daniel aprovou a sprint em seguida.

## Retrospectiva

- **Estimativa melhorou, mas ainda sobra:**
  - Na soma das tarefas, o real foi 42% do planejado, contra 15% na S01.
  - No relógio, 18 min contra 1 h 30 min previstos, ou seja 20%, contra 7% na S01.
  - Os clones em paralelo continuam encurtando muito o tempo de relógio.
- **Ajustes depois da entrega:**
  - A S01 não teve nenhum; a S02 teve uma rodada grande.
  - O draft fixou o visual, mas não o comportamento (o que abre e fecha, o eixo do gantt, a navegação). Na S03, o plano deve descrever o comportamento de cada tela.
- **Custo:** foi 2,5× o da S01. O Tech Lead respondeu por metade, por causa da rodada de ajustes, da spec e de um handoff de contexto.
- **Atritos com comandos de arquivo:**
  - `cd` com espaço no caminho falhou no Bash de um clone. O pedido "padronizar exploração e edição de arquivos" já está no inbox do harness.
  - Nesta sprint, o PowerShell também bloqueou `Remove-Item` em caminho com espaço, tratando-o como "caminho de sistema".
  - O modo restrito do PowerShell bloqueou `[IO.File]`.
- **Funcionou:** a base (tipos, mock, `lib`) antes da onda paralela de novo evitou conflitos entre os 5 clones.
