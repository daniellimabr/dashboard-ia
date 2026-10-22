# S09 — Release Report

> Sprint fechada em 2026-10-22. Objetivo: aplicar a direção C (escolhida na S08) em todas as telas reais, com tema escuro padrão, Backlog e Roadmap em formato novo, Consumo dentro do projeto, dados reais no lugar de "exemplo", e apagar os drafts. **Entregue**, com 3 ajustes de Daniel.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                              | Agente    | Planejado | Início           | Fim              | Duração                               |
| ------ | --------- | --------------------------------------------------- | --------- | --------- | ---------------- | ---------------- | ------------------------------------- |
| ✅     | T01       | Moldura e base da C (tokens, menu, componentes)     | tech-lead | 21 min    | 15:14            | 18:13            | 11 min (fila: 25 min, revisão: 6 min) |
| ✅     | T02       | Dados reais no lugar de "exemplo" (servidor)        | clone     | 21 min    | 15:14            | 18:16            | 38 min (fila: 2 min, revisão: 5 min)  |
| ✅     | T03       | Início, Sala de controle e Ociosos                  | clone     | 21 min    | 18:11            | 18:24            | 10 min (fila: 1 min, revisão: 1 min)  |
| ✅     | T04       | Linha do tempo                                      | clone     | 11 min    | 15:24            | 18:21            | 28 min (fila: 4 min, revisão: 5 min)  |
| ✅     | T05       | Projeto › Chats, Sprints, Plano e Documentos        | clone     | 16 min    | 15:24            | 18:21            | 31 min (fila: 2 min, revisão: 5 min)  |
| ✅     | T06       | Projeto › Backlog e Roadmap (formato novo)          | clone     | 16 min    | 15:24            | 18:21            | 32 min (fila: 1 min, revisão: 5 min)  |
| ✅     | T07       | Projeto › Consumo                                   | clone     | 11 min    | 15:24            | 18:21            | 28 min (fila: 5 min, revisão: 5 min)  |
| ✅     | T08       | Limpeza: apagar drafts e páginas antigas            | tech-lead | 5 min     | 18:23            | 18:26            | 3 min                                 |
| ✅     | T09       | Revisão das ondas + conferência visual no navegador | reviewer  | 9 min     | 18:26            | 18:43            | 0 min (revisão: 18 min)               |
| ✅     | Ajuste 1  | 1 ajuste(s)                                         |           |           | 18:58            | 18:58            | 0 min                                 |
| ✅     | Ajuste 2  | 1 ajuste(s)                                         |           |           | 18:58            | 18:58            | 0 min                                 |
| ✅     | Ajuste 3  | 1 ajuste(s)                                         |           |           | 18:58            | 19:52            | 54 min                                |
| ✅     | **Total** | 9 tarefas                                           |           | 56 min    | 2026-10-22 15:14 | 2026-10-22 18:43 | 1 h 11 min (pausas: 2 h 19 min)       |

## Entrega

- **Moldura (T01):** tokens da C em `src/styles.css` (escuro em `:root`, claro em `[data-theme="light"]`), fontes Bricolage Grotesque e Instrument Sans, componentes base em `src/components/ui.tsx` (Pill, Meter, Panel, Tabs, Gantt com linha de pausas, TaskTable…). Menu lateral com Telas, Itens do projeto e Projetos (acordeão com 5 sprints e 5 chats sem sprint), limites e botão de tema fixos no pé. Tema e projeto escolhido são lembrados no navegador.
- **Dados reais (T02):** custo e tokens por agente, agente da tarefa (`Task.agentId`) e esperas da sprint (`Sprint.waits`: resposta de Daniel e limite), lidos dos transcripts. Banco na versão 7.
- **Telas (T03–T07):** Início, Sala de controle, Ociosos, Linha do tempo (período na URL), e no projeto Chats, Sprints, Documentos (item aberto pela URL), Backlog (tabela com filtro por situação), Roadmap (colunas por horizonte) e Consumo. Sem nenhum "exemplo"; falta de dado mostra "sem dado".
- **Limpeza (T08):** `drafts.html`, `src/drafts/`, os componentes antigos (Gantt, ProgressRow, Spark, TaskList) e os apelidos de token apagados.
- **Ajustes de Daniel:** tela Componentes removida; roadmap atualizado até a S09; custo por agente corrigido (Reviewer único e consumo de subagente sempre com dono).

## Indicadores

| Tarefa    | Planejado  | Real                                  | Diferença |
| --------- | ---------- | ------------------------------------- | --------- |
| T01       | 21 min     | 11 min (fila: 25 min, revisão: 6 min) | −10 min   |
| T02       | 21 min     | 38 min (fila: 2 min, revisão: 5 min)  | +17 min   |
| T03       | 21 min     | 10 min (fila: 1 min, revisão: 2 min)  | −11 min   |
| T04       | 11 min     | 29 min (fila: 4 min, revisão: 5 min)  | +18 min   |
| T05       | 16 min     | 31 min (fila: 2 min, revisão: 5 min)  | +15 min   |
| T06       | 16 min     | 32 min (fila: 1 min, revisão: 5 min)  | +16 min   |
| T07       | 11 min     | 28 min (fila: 5 min, revisão: 5 min)  | +17 min   |
| T08       | 5 min      | 3 min                                 | −2 min    |
| T09       | 9 min      | 0 min (revisão: 18 min)               | −9 min    |
| **Total** | 2 h 11 min | 3 h 1 min (soma)                      |           |

| Indicador                                       | Valor                                                     |
| ----------------------------------------------- | --------------------------------------------------------- |
| Relógio (previsto · corrido)                    | 56 min · 1 h 11 min (127%)                                |
| Pausas fora do corrido                          | 2 h 19 min (limite de gasto, 15:26–17:50)                 |
| Trabalho · espera por Daniel                    | 35 min · 1 h 36 min                                       |
| Tarefas feitas                                  | 9/9                                                       |
| Tokens (entrada / saída / cache escrito / lido) | 767 / 180.330 / 2.183.906 / 38.563.946                    |
| Custo total                                     | US$ 23,13                                                 |
| Custo por agente                                | Tech Lead US$ 11,22 · clones US$ 9,06 · Reviewer US$ 2,84 |
| Retrabalho (ajustes de Daniel)                  | 3 ajustes · 54 min · US$ 2,06 (9% do custo)               |
| Reprovações do Reviewer                         | 0                                                         |
| Alertas de contexto · handoffs                  | 2 · 2                                                     |

## Revisão

- **Onda 1 (T01, T02):** aprovadas. O Reviewer criou `server/usage.defensive.test.ts` (JSON quebrado em transcript e em `.meta.json`).
- **Onda 2 (T03–T07):** todas aprovadas de primeira, com fidelidade conferida contra o draft C.
- **T09, conferência visual:** pela primeira vez, o Reviewer abriu as 11 telas num Chrome headless em 1920x1080, nos temas claro e escuro. Achou e corrigiu 2 defeitos de CSS: o menu vazando com títulos longos e o título do projeto aparecendo como link azul. Os achados menores ficaram anotados: chat sem título mostra o código no menu, e as barras da Linha do tempo ficam apertadas no período "Hoje".
- **Ajustes:** aprovados pelo mesmo Reviewer. Revisão de segurança do importador sem achados.

## Retorno de Daniel

1. **No meio da sprint:** "não reinventa a roda". A página parecia uma mistura das duas direções, porque as telas antigas ainda estavam dentro da moldura nova. A partir daí, cada clone portou o draft C literalmente, substituindo o arquivo antigo inteiro.
2. **Na entrega:**
   - Custo por agente: corrigir agora.
   - A tela Componentes sai, porque faz parte do design system.
   - O Roadmap estava desatualizado: mostrava a S04 em "Agora".

## Retrospectiva

- **O que foi bem:**
  - **Conferência visual antes da entrega:** pedida na S08, foi feita na T09. Ela pegou 2 defeitos de layout que na S08 só Daniel tinha visto. Os ajustes caíram de 5 rodadas e US$ 14,15 (61% do custo) para 3 ajustes e US$ 2,06 (9%), e nenhum dos 3 foi defeito de layout.
  - **Paralelismo:** 5 clones na onda 2 sem conflito de arquivo, com 0 reprovações. As regras comuns ficaram num handoff único, para não repetir contexto em cada clone.
  - **Custo estável:** US$ 23,13, contra US$ 23,05 na S08, com quase o dobro de tarefas (9 contra 5).
- **O que pegou:**
  - **Estimativa das telas:** T04–T07 levaram de 28 a 32 min contra 11–16 min planejados, cerca de 2x cada. Portar uma tela com teste e dados reais custa mais que um draft. Daqui em diante, planejar porte de tela em cerca de 30 min.
  - **Limite de gasto:** todos os agentes pararam às 15:26 e só voltaram às 17:50, depois da renovação, retomados à mão (2 h 19 min de pausa). Já há um pedido aberto no harness.
  - **Servidor sem recarga:** o "custo sem dado" da entrega vinha do `node server/main.ts`, iniciado antes da T02. Isso custou uma investigação no ajuste 3. Na próxima entrega que mexer no servidor, avisar Daniel para reiniciar.
  - **Ajustes registrados errado:** usei 3 vezes `hx sprint feedback 1`, quando um único `feedback 3` daria uma rodada. Por isso aparecem duas rodadas de 0 min.
- **Pedidos ao harness (inbox):**
  - Roadmap não é atualizado no fechamento da sprint (aberto durante a sprint): ficou parado da S04 à S09.
  - O Reviewer aparece com dois nomes nos eventos, "reviewer" e "main-harness:reviewer" (novo). O painel duplicava o agente, e o custo dele aparecia como "sem dado".
  - `hx task phase` falha em tarefa já concluída que é reaberta por ajuste (novo). Aconteceu na S07, na S08 e duas vezes na S09 (T01 e T02).
