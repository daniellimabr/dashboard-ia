# S06 — Release Report

> Sprint fechada em 2026-10-22 07:55 (horário de Brasília). Plano: [S06-plan.md](S06-plan.md).

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                                                | Agente    | Planejado | Início           | Fim              | Duração                              |
| ------ | --------- | --------------------------------------------------------------------- | --------- | --------- | ---------------- | ---------------- | ------------------------------------ |
| ✅     | T01       | Sala de controle mostra a última sprint fechada quando não há ativa   | tech-lead | 10 min    | 18:47            | 18:54            | 3 min (fila: 1 min, revisão: 3 min)  |
| ✅     | T02       | Draft Sala de controle (2 variantes)                                  | clone     | 20 min    | 18:47            | 19:24            | 16 min (fila: 5 min, revisão: 7 min) |
| ✅     | T03       | Drafts Projetos: Chats, Sprints e Documentos (2 variantes cada)       | clone     | 20 min    | 18:47            | 19:11            | 10 min (fila: 2 min, revisão: 6 min) |
| ✅     | T04       | Drafts Projetos: Backlog, Roadmap e Consumo (2 variantes cada)        | clone     | 20 min    | 18:47            | 19:11            | 10 min (fila: 3 min, revisão: 7 min) |
| ✅     | T05       | Revisão: lint, tipos e testes zerados; drafts cobrem todos os pedidos | reviewer  | 5 min     | 18:51            | 18:54            | 4 min                                |
| ✅     | T06       | Limites 5 h e semanal reais a partir do evento `usage.limits`         | tech-lead | 10 min    | 19:41            | 01:05            | 6 min (fila: 0 min, revisão: 3 min)  |
| ✅     | Ajuste 1  | 1 ajuste(s)                                                           |           |           | 18:57            | 19:14            | 17 min                               |
| ✅     | Ajuste 2  | 1 ajuste(s)                                                           |           |           | 19:14            | 19:50            | 36 min                               |
| ✅     | Ajuste 3  | 1 ajuste(s)                                                           |           |           | 19:50            | 07:55            | 6 min                                |
| ✅     | **Total** | 6 tarefas                                                             |           | 25 min    | 2026-10-21 18:47 | 2026-10-22 01:05 | 1 h 6 min (pausas: 5 h 12 min)       |

## Entrega

- **Sprint fechada na Sala de controle (T01):** sem sprint ativa ou planejada, a coluna do projeto mostra a última sprint fechada com o selo "Concluída".
- **Drafts das 7 telas (T02–T04):** Sala de controle e as abas de Projetos (Chats, Sprints, Documentos, Backlog, Roadmap, Consumo), 2 variantes cada. Ficam num arquivo paralelo (`drafts.html` + `src/drafts/`), com os componentes e o CSS reais e dados fake, sem tocar no painel em produção. Na Sala de controle, as sprints recentes viram abas na janela da sprint.
- **Limites reais de 5 h e semanal (T06):** o painel lê o evento `usage.limits` do harness. A barra do topo mostra o % real e "renova em …" em vez do estimado.
- **Escolhas de Daniel** registradas no `docs/backlog.md` para a S07: Sala de controle B; Chats lista (B) com acabamento melhor; Sprints B; Documentos A; Backlog tabela + kanban; Roadmap A em linha do tempo; Consumo em acordeão dia › sprints.

## Indicadores

| Tarefa    | Planejado  | Real                                 | Diferença |
| --------- | ---------- | ------------------------------------ | --------- |
| T01       | 10 min     | 3 min (fila: 1 min, revisão: 3 min)  | −7 min    |
| T02       | 20 min     | 16 min (fila: 5 min, revisão: 8 min) | −4 min    |
| T03       | 20 min     | 10 min (fila: 2 min, revisão: 7 min) | −10 min   |
| T04       | 20 min     | 10 min (fila: 3 min, revisão: 7 min) | −11 min   |
| T05       | 5 min      | 4 min                                | −1 min    |
| T06       | 10 min     | 7 min (fila: 1 min, revisão: 3 min)  | −4 min    |
| **Total** | 1 h 25 min | 49 min (soma)                        |           |

| Indicador                                       | Valor                                                     |
| ----------------------------------------------- | --------------------------------------------------------- |
| Relógio (previsto · corrido)                    | 25 min · 1 h 6 min (pausas fora: 5 h 12 min)              |
| Trabalho · espera por Daniel                    | 29 min · 9 h 57 min                                       |
| Tarefas feitas                                  | 6/6                                                       |
| Tokens (entrada / saída / cache escrito / lido) | 450 / 114.155 / 1.763.990 / 20.238.896                    |
| Custo total                                     | US$ 16,92                                                 |
| Custo por agente                                | Tech Lead US$ 10,85 · clones US$ 3,68 · Reviewer US$ 2,39 |
| Retrabalho (ajustes de Daniel)                  | 3 rodadas · 59 min · US$ 13,15                            |
| Reprovações do Reviewer                         | 1 (T06)                                                   |
| Alertas de contexto · handoffs                  | 0 · 0                                                     |

## Revisão

- **Onda 1 (Sonnet):** T01–T04 aprovadas de primeira. Achados baixos nos drafts HTML (sem efeito, já que foram refeitos).
- **Ajustes 1 e 2 (mesmo Reviewer):** drafts refeitos dentro do app e depois isolados num entry paralelo; aprovados. A cópia do `Column` em `src/drafts/ControlColumn.tsx` é dívida aceita até os drafts serem apagados.
- **T06 (Opus, entrada externa):** 1 reprovação por três falhas de robustez: evento antigo sobrescrevia o novo, data de renovação inválida travava a barra e faltava o teste de `buildData`. Corrigidas com `WHERE excluded.at >= limit_window.at`, validação da data e pct limitado a 0..100; aprovada. Sem achados de segurança.

## Retorno de Daniel

1. **"Os drafts não se assemelham nem um pouco com o sistema atual."** Os clones seguiram o `S02-draft.html`, que já estava desatualizado. Refeitos com os componentes reais.
2. **Abas de sprint na Sala de controle + "não é pra mexer no painel em produção".** O draft passou a usar abas, e tudo de rascunho saiu do app para `drafts.html` com dados fake.
3. **"Ainda aparece estimado."** Duas causas: os eventos `usage.limits` já tinham sido lidos antes da T06 (corrigido subindo a versão do banco, que relê os eventos) e o servidor em execução era de antes da sprint (resolvido reiniciando).

- **Escopo:** a T06 entrou no meio da sprint, com reaprovação do plano.

## Retrospectiva

- **O que foi bem:**
  - **Velocidade das tarefas:** 49 min reais para 1 h 25 min planejados (soma). Todas abaixo do previsto, como na S05.
  - **Paralelismo:** 3 clones em paralelo duas vezes, sem conflito de arquivo.
  - **Revisão com Opus na entrada externa** pegou de novo os defeitos de ordem e formato, como na S03.
- **O que pegou:**
  - **Retrabalho caro:** 3 rodadas de ajuste custaram US$ 13,15 dos US$ 16,92 (78%). Na S05 não houve ajuste; na S04, 1 rodada de US$ 1,45. A causa principal foi o handoff dos drafts apontar para uma referência visual antiga (S02) em vez das telas atuais. **Regra daqui em diante:** draft de tela parte dos componentes reais, num entry paralelo com dados fake, nunca de HTML à mão.
  - **Mudança de versão do banco esquecida:** a T06 mudou o que um evento grava, mas não subiu a `VERSION` em `server/db.ts`, então os eventos já lidos não foram reaplicados. Só apareceu com o painel real. **Regra:** toda mudança em `server/events.ts` que passa a gravar um evento antigo sobe a `VERSION`.
  - **Servidor antigo em execução:** o teste de Daniel rodou num servidor iniciado antes da sprint. Na entrega, dizer para reiniciar o painel quando há mudança em `server/`.
  - **Relógio:** 1 h 6 min corridos para 25 min previstos, puxados pelos ajustes. Sem eles, a sprint teria fechado em ~10 min de relógio.
  - **Limite de 5 h atingido no meio da revisão:** os agentes não voltaram sozinhos quando o limite renovou. O harness já tem o patch; a atualização aqui fica para depois da sprint.
- **Pedidos ao harness:**
  - `hx sprint approve` em plano alterado exige `--force`, que não aparece no `hx help`. Pedido registrado.
