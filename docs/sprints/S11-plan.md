# S11 — Agentes e ondas confiáveis, modelo e tokens por modelo

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.10.1
- **Status:** aguardando aprovação

## Objetivo

A Sala de controle mostra as ondas de qualquer plano, um agente por clone com a tarefa que ele conduz e a barra de contexto explicada. Cada tarefa mostra o modelo que a executou, e cada sprint mostra tokens e US$ por modelo (Gemini à parte).

## Diagnóstico (perguntas de Daniel, 2026-10-28)

1. **6thGear S03 sem ondas:** a sprint foi planejada em ondas, mas num terceiro formato (`**Ondas:** (1) T01; (2) T02 e T03 em paralelo; ...`) que o leitor do plano não conhece. É a terceira vez (S09, S10/T07, agora). Correção aqui (T01) e pedido ao harness para fixar um formato só no template do `sprint-plan`.
2. **Clone "sem tarefa nesta sprint":** o Tech Lead do 6thGear abriu **dois** clones (`agent.start` às 12:23:02) **antes** do `hx task start` da T02 e T03 (12:23:06), então o evento veio com `task: null`. E o painel junta todos os clones do chat numa linha só ("Clone"), porque usa o tipo do agente como id, não o `agent_id`. Correção: T02 aqui + pedido ao harness para o `agent.start` do clone levar a tarefa.
3. **Barra à direita do agente:** é o **% da janela de contexto** usado pelo agente (perto de cheia, ele grava o handoff e compacta). Hoje não diz isso na tela; T02 põe o número e o rótulo.

## Escopo

1. **Leitor do plano (T01, servidor):** `server/repo.ts` aceita também `(N) T01; (2) T02 e T03 ...` (primeira frase de cada item, mesma regra de hoje). A coluna Agente no formato novo (`clone (sonnet)`, `gemini`, `tech-lead`) vira `agent` = papel (`clone`) e `plannedModel` = modelo (`sonnet`); sem parênteses, como hoje.
2. **Agentes (T02):**
   - Servidor: um agente por `agent_id` do `agent.start`/`agent.end` (dois clones = duas linhas, "Clone 1", "Clone 2"); a tarefa vem do `task` do evento.
   - Clone sem tarefa no evento: mostra as tarefas em andamento planejadas para `clone` que nenhum outro agente assumiu; se não houver, "Tarefa não informada pelo harness" (sai o "Sem tarefa nesta sprint").
   - Barra de contexto com o número ao lado ("ctx 42%") e tooltip "Contexto usado pelo agente"; agente encerrado: sem barra.
3. **Modelo por tarefa e tokens por modelo — servidor (T03):** importar `model` dos eventos `task.*` e de `worker.start/end` (Gemini); `Task.model` nos dados. Por sprint: entrada, saída, cache e US$ por modelo, a partir de `usage` (já tem `model`, sprint e tarefa); Gemini com US$ 0 e marcado "fora do Claude".
4. **Modelo na tabela de tarefas (T04, front):** a coluna Agente da tabela mostra papel + modelo real (ex.: "clone · Sonnet"); sem dado real, o planejado em cinza.
5. **Tokens por modelo na sprint (T05, front):** na página da sprint (acordeão de Sprints), um bloco "Consumo por modelo": uma linha por modelo com entrada, saída, cache e US$; Gemini numa linha à parte "fora do Claude · US$ 0".

## Fora de escopo

- Itens médios e baixos do backlog (link para o VS Code, histórico de chats, ações pelo painel, versão online).
- Consumo por modelo na Sala de controle e na tela Consumo (só na página da sprint, por ora).
- Mudar o harness: vai como pedido (`hx request`), não aqui.

## Critérios de aceite

1. A Sala de controle do 6thGear S03 mostra as tarefas agrupadas em 5 ondas; S09 e S10 continuam com ondas.
2. Com dois clones abertos no mesmo chat, aparecem duas linhas de agente, cada uma com sua tarefa (do evento ou deduzida); nunca "Sem tarefa nesta sprint" para clone trabalhando.
3. A barra do agente mostra o % ao lado e o tooltip explica que é o contexto.
4. Cada tarefa mostra o modelo (real, ou planejado em cinza quando não há evento).
5. A página da sprint mostra tokens (entrada, saída, cache) e US$ por modelo; Gemini à parte com US$ 0.
6. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** `server/repo.test.ts` com fixture no formato `(N)` (cópia reduzida do 6thGear S03) e coluna `clone (sonnet)`; formatos antigos seguem passando.
- **T02:** `server/data.test.ts`: dois `agent.start` de executor no mesmo chat viram dois agentes; tarefa do evento. `Control.test.tsx`: clone sem tarefa mostra a em andamento planejada para clone; sem candidata, o texto novo; "ctx N%" visível.
- **T03:** `server/events.test.ts` (model de `task.*` e `worker.*`) e `server/data.test.ts` (soma por modelo na sprint; Gemini com US$ 0).
- **T04:** `ui.test.tsx`: modelo real; planejado em cinza; sem nenhum.
- **T05:** `Sprints.test.tsx`: bloco por modelo; linha do Gemini à parte; sprint sem consumo.
- **Manual (Daniel):** Sala de controle do 6thGear (ondas e clones) e uma sprint fechada daqui (modelo e consumo).

## Tarefas

| Id  | Tarefa                                                    | Agente         | Arquivos                                                                                                                                            | Depende de | Bruta  | Planejado |
| --- | --------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Plano: ondas no formato `(N)` e Agente com modelo         | clone (sonnet) | `server/repo.ts`, `server/repo.test.ts`, `server/fixtures/repo/`                                                                                    | —          | 20 min | 10 min    |
| T02 | Agentes: um por clone, tarefa do clone, barra de contexto | clone (sonnet) | `server/data.ts`, `server/data.test.ts`, `src/data/types.ts`, `src/pages/Control.tsx`, `src/pages/Control.test.tsx`, `src/pages/Control.module.css` | —          | 50 min | 30 min    |
| T03 | Servidor: modelo por tarefa e tokens por modelo na sprint | clone (sonnet) | `server/events.ts`, `server/events.test.ts`, `server/data.ts`, `server/data.test.ts`, `src/data/types.ts`, `server/fixtures/harness-events.jsonl`   | T02        | 40 min | 25 min    |
| T04 | Tabela de tarefas: modelo real ou planejado               | clone (sonnet) | `src/components/ui.tsx`, `src/components/ui.module.css`, `src/components/ui.test.tsx`                                                               | T01, T03   | 20 min | 15 min    |
| T05 | Página da sprint: consumo por modelo                      | clone (sonnet) | `src/pages/Sprints.tsx`, `src/pages/Sprints.module.css`, `src/pages/Sprints.test.tsx`                                                               | T03        | 25 min | 15 min    |

**Ondas:** onda 1 = T01, T02; onda 2 = T03; onda 3 = T04, T05

- **Onda 1:** dois clones sem cruzamento (T01 só `repo.ts`; T02 `data.ts` e Sala de controle). T02 chama `frontend-design` antes do código.
- **Onda 2:** T03 sozinha, porque mexe de novo em `data.ts` e `types.ts`. Contrato para a onda 3: `Task.model?: string`, `Task.plannedModel?: string`, `Sprint.byModel?: { model; input; output; cache; usd; external? }[]`.
- **Onda 3:** dois clones sem cruzamento (`ui.tsx` × `Sprints.tsx`); os dois chamam `frontend-design`, a T05 também `dataviz`.
- **Reviewer** (Opus) revisa ao fim de cada onda; conferência visual no navegador na onda 3.
- **Pedidos ao harness** (o Tech Lead abre com `hx request` na abertura da sprint): (a) `agent.start` do executor com a tarefa (Tech Lead roda `hx task start` antes de abrir o clone, ou o hook lê o `TNN` da descrição do Agent); (b) um formato único de ondas no template do `sprint-plan` (`**Ondas:** onda 1 = T01, T02; ...`).

**Referências da bruta:** T01 como S10/T01 e T07; T02 e T03 como S09/T03 (servidor + tela); T04 e T05 como ajustes de tela da S10 (~15 min, retrospectiva da S10).

**Fator:** ~60%. Na S10 a soma real foi 46% do planejado com fator de 50% em ajustes de tela; aqui há mais servidor, então um pouco mais folgado.

**Total estimado:** 95 min calibrado (155 min bruto). Relógio: ~70 min de agente (onda 1 ~30, onda 2 ~25, onda 3 ~15) mais as revisões e o teste de Daniel. O servidor muda: reiniciar `node server/main.ts` antes do teste.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-28 09:35:44 (horário de Brasília) — UTC 2026-10-28T12:35:44Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `8b018597b2cc1fd4ea217faf8aad8f52410e4e44b4c4e38cdb7eb3a5a03d93c3`
- **Versão do harness:** 0.10.1
