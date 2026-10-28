# S11 — Release Report

> Entregue e aprovada por Daniel em 2026-10-28.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Plano: ondas no formato `(N)` e Agente com modelo | clone (sonnet) | 10 min | 09:40 | 09:50 | 4 min (fila: 4 min, revisão: 3 min) |
| ✅ | T02 | Agentes: um por clone, tarefa do clone, barra de contexto | clone (sonnet) | 30 min | 09:40 | 09:50 | 7 min (fila: 1 min, revisão: 3 min) |
| ✅ | T03 | Servidor: modelo por tarefa e tokens por modelo na sprint | clone (sonnet) | 25 min | 09:50 | 10:06 | 13 min (fila: 0 min, revisão: 2 min) |
| ✅ | T04 | Tabela de tarefas: modelo real ou planejado | clone (sonnet) | 15 min | 10:06 | 10:13 | 3 min (fila: 1 min, revisão: 3 min) |
| ✅ | T05 | Página da sprint: consumo por modelo | clone (sonnet) | 15 min | 10:06 | 10:13 | 3 min (fila: 1 min, revisão: 3 min) |
| ✅ | Ajuste 1 | 1 ajuste(s) |  |  | 10:19 | 10:23 | 4 min |
| ✅ | **Total** | 5 tarefas |  | 1 h 10 min | 2026-10-28 09:40 | 2026-10-28 10:13 | 34 min |

## Entrega

A Sala de controle lê as ondas de qualquer plano (inclusive o formato `(N)` do 6thGear S03), mostra um agente por clone com a tarefa que ele conduz e explica a barra como "ctx N%". Cada tarefa mostra o modelo que a executou (ou o planejado, em cinza), e a página da sprint traz o bloco "Consumo por modelo", com o Gemini à parte ("fora do Claude · US$ 0"). Suíte com 179 testes, zero erros e zero avisos de lint e tipos.

## Indicadores

| Indicador | S11 | S10 |
|---|---|---|
| Soma das tarefas (planejada · real) | 1 h 35 min · 30 min (32%) | 1 h 53 min · 52 min (46%) |
| Relógio (previsto · corrido) | 1 h 10 min · 34 min | — · 42 min |
| Custo total | US$ 4,58 (Sonnet 3,02 · Opus 1,56) | US$ 7,18 |
| Reprovações do Reviewer | 1 | 0 |
| Ajustes pedidos por Daniel | 1 (4 min · US$ 0,23) | 0 |
| Alertas de contexto · handoffs | 0 · 0 | 0 · — |

## Revisão

- **Onda 1 (T01, T02):** aprovadas de primeira. Achados baixos: `kind` do agente copiado de `events.ts`, e subagente sem prefixo (ex.: `Explore`) agora vira "Clone N".
- **Onda 2 (T03):** reprovada uma vez. O modelo era lido de `data.model` em `task.*`, campo que o harness nunca grava (só `worker.*` e `usage`). O teste usava um formato inventado. Corrigido para ler o modelo dos eventos `usage` do clone; aprovada na re-revisão, que também importou eventos reais num banco em memória para confirmar.
- **Onda 3 (T04, T05):** aprovadas. Achados baixos na T04: tarefa sem agente mostra "—" mesmo com modelo, e sem modelo o papel também fica em cinza.
- **Conferência visual:** o Reviewer não conseguiu abrir o app (`database is locked` e sem ferramenta de navegador). Ficou para o teste de Daniel.

## Retorno de Daniel

1. **Ajuste 1:** o servidor falhou ao reiniciar com `no such table: project`. A migração do banco (T03 subiu a versão para 8) parou no meio quando dois servidores subiram juntos. Corrigido: a migração agora roda numa transação, com teste. Os `ECONNREFUSED` seguintes eram o proxy esperando a reimportação.
2. **Na entrega:** "parece tudo certo".

## Retrospectiva

- **O que foi bem:** custo −36% (US$ 4,58 contra 7,18) e 34 min de relógio. Duas ondas com dois clones sem conflito de arquivo. A revisão pegou o erro mais caro da sprint (campo que não existe nos eventos reais) antes de chegar a Daniel.
- **O que pegou:**
  - **Estimativa:** real em 32% do planejado, de novo abaixo da S10 (46%). O fator de 60% ainda sobra; para ajuste de tela e tarefa pequena de servidor, planejar perto de 40%.
  - **Migração do banco na entrega:** mudar a versão do banco sem testar dois processos subindo juntos custou um ajuste. A transação resolve; vale lembrar que mudança de versão derruba o painel por uns segundos na primeira subida.
  - **Handoff de contrato:** o clone da T03 assumiu um formato de evento sem conferir `events.md`. Handoff que cita eventos deve apontar o contrato (`docs/contracts/events.md`).
  - **Reviewer sem navegador, pela 2ª vez seguida.**
  - **T01 e T02 desta sprint sem modelo real:** o `agent.start` dos dois clones veio sem tarefa (o problema que a própria sprint corrige no painel).
- **Pedidos ao harness (inbox):**
  - `agent.start` do clone levar a tarefa (aberto na abertura da sprint).
  - Formato único de ondas no template do `sprint-plan` (aberto na abertura da sprint).
  - `alert.context` com `agent_id` (novo): dois clones do mesmo chat mostram o mesmo % de contexto.
  - Reviewer com navegador garantido (reforço do pedido da S10): falhou de novo; sem a conferência visual, 2 de 2 sprints de tela dependeram de Daniel ou do Tech Lead.
