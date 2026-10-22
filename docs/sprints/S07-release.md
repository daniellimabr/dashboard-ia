# S07 — Release Report

> Sprint fechada em 2026-10-22. Objetivo: levar ao painel real as variantes escolhidas por Daniel nos drafts da S06 e apagar os drafts.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                               | Agente    | Planejado | Início           | Fim              | Duração                               |
| ------ | --------- | ---------------------------------------------------- | --------- | --------- | ---------------- | ---------------- | ------------------------------------- |
| ✅     | T01       | Sala de controle: abas das sprints recentes          | clone     | 15 min    | 08:12            | 08:46            | 7 min (fila: 17 min, revisão: 10 min) |
| ✅     | T02       | Chats em lista, com acabamento                       | clone     | 15 min    | 08:12            | 08:46            | 8 min (fila: 16 min, revisão: 10 min) |
| ✅     | T03       | Sprints em acordeão                                  | clone     | 15 min    | 08:12            | 08:46            | 7 min (fila: 17 min, revisão: 10 min) |
| ✅     | T04       | Documentos agrupados por tipo                        | clone     | 10 min    | 08:12            | 08:46            | 5 min (fila: 19 min, revisão: 10 min) |
| ✅     | T05       | Backlog (tabela + kanban) e Roadmap (linha do tempo) | clone     | 30 min    | 08:12            | 08:46            | 8 min (fila: 16 min, revisão: 10 min) |
| ✅     | T06       | Consumo em acordeão dia › sprints (servidor + tela)  | tech-lead | 30 min    | 08:12            | 08:46            | 9 min (fila: 15 min, revisão: 10 min) |
| ✅     | T07       | Apagar drafts e atualizar `index.md`                 | tech-lead | 5 min     | 08:22            | 08:48            | 26 min                                |
| ✅     | T08       | Revisão da onda (lint, tipos, testes, critérios)     | reviewer  | 10 min    | 08:48            | 08:49            | 0 min (revisão: 1 min)                |
| ✅     | Ajuste 1  | 1 ajuste(s)                                          |           |           | 09:01            | 09:08            | 6 min                                 |
| ✅     | **Total** | 8 tarefas                                            |           | 45 min    | 2026-10-22 08:12 | 2026-10-22 08:49 | 37 min                                |

## Entrega

- **Sala de controle (T01):** as 5 sprints mais recentes de cada projeto viram abas (`S05 · Em execução`, `S04 · Concluída`…). Trocar de aba troca horários, gantt, itens e gasto da sprint.
- **Chats (T02):** lista com título, início e última interação; abertos primeiro e em destaque, depois do mais recente para o mais antigo; estado vazio. **Ajuste de Daniel:** o título agora vem do nome que o Claude Code dá ao chat (linha `ai-title` do transcript), não mais do id da sessão.
- **Sprints (T03):** acordeão com resumo (objetivo, status, datas, tarefas); a ativa abre sozinha; aberta, links para plano e Release Report.
- **Documentos (T04):** só ADRs e PRDs, em grupos separados. Os demais tipos abrem por link.
- **Backlog e Roadmap (T05):** tabela + kanban (Backlog, Planejado, Concluído) a partir das marcas do `backlog.md`, com filtro de status; o Bem-vindo ignora concluídos. Roadmap em linha do tempo (Feito, Agora, Próximo, Depois), cada etapa abre as sprints citadas; o link vai ao Release Report (sprint 100%) ou ao plano.
- **Consumo (T06):** acordeão por dia com custo e tokens; aberto, o custo de cada sprint e "Fora de sprint". O servidor devolve o consumo por dia e sprint. Corrigida a borda da janela da sprint (`…00.000Z` × `…00Z` comparados como texto), que podia deixar fora um gasto no instante do início.
- **Limpeza (T07):** `drafts.html` e `src/drafts/` apagados (inclui a dívida `ControlColumn.tsx` da S06); `index.md` atualizado.

## Indicadores

| Tarefa    | Planejado  | Real                                  | Diferença |
| --------- | ---------- | ------------------------------------- | --------- |
| T01       | 15 min     | 7 min (fila: 17 min, revisão: 10 min) | −8 min    |
| T02       | 15 min     | 8 min (fila: 16 min, revisão: 10 min) | −7 min    |
| T03       | 15 min     | 7 min (fila: 17 min, revisão: 10 min) | −8 min    |
| T04       | 10 min     | 5 min (fila: 20 min, revisão: 10 min) | −6 min    |
| T05       | 30 min     | 8 min (fila: 16 min, revisão: 10 min) | −22 min   |
| T06       | 30 min     | 9 min (fila: 15 min, revisão: 10 min) | −21 min   |
| T07       | 5 min      | 26 min                                | +21 min   |
| T08       | 10 min     | 0 min (revisão: 1 min)                | −10 min   |
| **Total** | 2 h 10 min | 1 h 9 min (soma)                      |           |

| Indicador                                       | Valor                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Relógio (previsto · corrido)                    | 45 min · 37 min (82%)                                      |
| Trabalho · espera por Daniel                    | 36 min · 16 min                                            |
| Tarefas feitas                                  | 8/8                                                        |
| Tokens (entrada / saída / cache escrito / lido) | 268 / 45.861 / 619.080 / 9.190.080                         |
| Custo total                                     | US$ 5,67                                                   |
| Custo por agente                                | Tech Lead US$ 2,37 · clones US$ 2,72 · Reviewer US$ 0,58   |
| Retrabalho (ajustes de Daniel)                  | 1 rodada · 7 min · US$ 0,73                                |
| Reprovações do Reviewer                         | 0                                                          |
| Alertas de contexto · handoffs                  | 0 · 0                                                      |

## Revisão

- **Onda 1 (Sonnet, uma revisão para T01–T06):** todas aprovadas de primeira; suíte 158/158, lint e tipos zerados; sem achados de segurança (SQL novo parametrizado, links com `encodeURIComponent`). Pontos menores aceitos: `key={i.text}` no `Plan.tsx` (texto repetido geraria aviso), o roadmap trata qualquer `S` + número como sprint, e `Sprints.tsx` assume `data.sprints` em ordem crescente.
- **T07 + T08 (mesmo Reviewer):** critério 8 conferido (drafts não existem, build ok); 150/150 testes (os 8 a menos eram dos drafts).
- **Ajuste 1 (mesmo Reviewer):** aprovado; ponto menor: `aiTitle` que não seja texto vai para `import_error` em vez de renomear.

## Retorno de Daniel

1. **"A tela de chat ainda mostra o hash como título."** O título era o id da sessão (o plano deixava título do chat fora de escopo, à espera do harness). Os transcripts do Claude Code já trazem `ai-title`; o importador passou a gravá-lo no chat e a `VERSION` do banco subiu para 5 para nomear os chats antigos.

## Retrospectiva

- **O que foi bem:**
  - **Custo e retrabalho:** US$ 5,67 contra US$ 16,92 da S06, com 1 ajuste curto (US$ 0,73) contra 3 rodadas (US$ 13,15). A regra da S06 (drafts com componentes reais) pagou: Daniel não pediu nenhuma mudança de tela.
  - **Paralelismo:** 5 clones + Tech Lead ao mesmo tempo, sem conflito de arquivo; relógio de 37 min para 45 previstos.
  - **Tarefas abaixo do previsto** pela terceira sprint seguida: soma real 1 h 9 min (só trabalho: ~51 min sem a espera da T07) contra 2 h 10 min. O fator de 50% ainda está alto para telas; dá para usar ~35% na S08.
  - **Regras da S06 aplicadas:** a T06 já subiu a `VERSION` no ajuste e a entrega avisou para reiniciar o painel.
- **O que pegou:**
  - **T07 com +21 min:** o apagamento dos drafts foi negado duas vezes pelo classificador de permissão, e a tarefa ficou contando enquanto esperava a autorização de Daniel. Pedidos ao harness abaixo.
  - **Fila de 15–20 min nas tarefas da onda 1:** é o custo de uma revisão por onda (os clones esperam o mais lento). Aceitável enquanto a revisão for barata (US$ 0,58).
  - **Título do chat:** estava fora de escopo, mas a solução já existia no transcript. Antes de deixar algo "à espera do harness", olhar o que o Claude Code já grava.
- **Pedidos ao harness (inbox):**
  - Marcas `[planejado: SNN]`/`[concluído: SNN]` do backlog nas skills `sprint-plan` e `release-report` (hoje feitas à mão).
  - Espera por resposta de Daniel dentro de uma tarefa não contar como duração (T07: 26 min medidos, ~24 de espera).
  - Permitir `git rm` de arquivos rastreados previstos no plano aprovado (2 negações na T07).
  - `hx task phase` funcionar em tarefa reaberta por `hx sprint feedback` (falhou no ajuste da T02).
