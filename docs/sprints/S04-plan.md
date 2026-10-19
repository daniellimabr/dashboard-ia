# S04 — Painel lendo os eventos reais do harness

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.5.0
- **Status:** aguardando aprovação

## Objetivo

Daniel roda `npm run dev` e vê as sprints, tarefas, revisões e o consumo **reais** do Dashboard IA e do Main Harness. Os dados vêm dos eventos que o harness já grava (`~/.harness/events`), completados pelos arquivos de cada repo. Um pedido ao harness lista o que ainda falta para a Sala de controle ficar completa.

## Escopo

1. **Importador no formato do harness** ([contrato v1](../../../Main%20Harness/docs/contracts/events.md)).
   - Lê `~/.harness/events/*.jsonl` (um arquivo por dia, só acréscimo). A pasta pode ser trocada por `DASHBOARD_EVENTS_DIR`.
   - Projetos vêm de `~/.harness/projects.json` (`id`, `name`, `path`).
   - Tipos aplicados:
     - `session.start` e `session.end` → chat;
     - `sprint.approved`, `sprint.open`, `sprint.close` e `sprint.feedback`;
     - `task.start`, `task.phase` e `task.done`;
     - `review.result` (rodada = contagem de reprovações);
     - `usage` (id = `message_id`, o mesmo id do importador de transcripts, sem contar em dobro);
     - `alert.context` → % de contexto do agente.
   - Os demais tipos ficam só no log `event`.
   - Evento com `v` desconhecido é ignorado e contado. Linha inválida vai para `import_error`.
   - **Agentes:** derivados do campo `agent` dos eventos de cada sessão. Começo = 1º evento, fim = `session.end`.
2. **Leitura dos repos** (`server/repo.ts`), só dentro de `<repo>/docs`.
   - Do sprint plan (`sprint.approved.data.plan`): título, objetivo, tarefas (id, título, agente, dependências, estimativa) e ondas (linha "Ondas"/"Paralelismo").
   - Lista de documentos: `docs/sprints/*-plan.md`, `*-release.md`, `docs/adr/*.md` e `docs/prd/*.md`, com o markdown lido na hora.
   - `docs/backlog.md` e `docs/roadmap.md`.
3. **Estado derivado no servidor** (`server/data.ts`), pelas regras da spec 0001 §4.1:
   - `phase`: Plano / Execução / Esperando você;
   - `alerts`: reprovação aberta, entrega para testar, plano esperando aprovação;
   - `nextStep` e `whereStopped` padrão;
   - `Project.events` (textos tipo "T01 concluída", "T02 reprovada (1/2)", "S03 fechada");
   - sprint entregue quando todas as tarefas do `sprint.open` estão prontas;
   - `lastCommand` = último `session.start` (até o harness gravar o comando de verdade).
4. **Sanitizar o markdown** (DOMPurify) antes de renderizar. Os documentos agora vêm de arquivos dos repos.
5. **Fim do gerador de exemplo:** sai `scripts/sample-events.ts` e o formato próprio da S03. Os testes passam a usar fixtures no formato do harness.
6. **Pedido ao harness** (`hx request`, completando o B032) com o que falta:
   - `agent.start` e `agent.end` com id e tarefa;
   - título do chat;
   - evento do comando de Daniel (`UserPromptSubmit`);
   - `project.status` opcional (onde parou e próximo passo);
   - fonte do limite da assinatura.
7. **Spec 0001, backlog e roadmap atualizados:** o formato passa a ser o contrato do harness, e as extensões da S03 saem.

## Fora de escopo

- Navegação pelos projetos e documentos (item do backlog, S05).
- Agentes rodando com precisão (depende do pedido ao harness, S05 do harness).
- Limite real da assinatura: continua "estimado" e "sem dado".
- Link para abrir o documento no VS Code, ações pelo painel e versão online.

## Critérios de aceite

1. Com `npm run dev` e sem preparo nenhum, as telas mostram o Dashboard IA e o Main Harness com as sprints reais (S01–S04 de cada um), títulos das tarefas tirados dos planos, situação e reprovações.
2. Um `hx task start` ou `hx task done` em qualquer projeto aparece na tela em até ~7 s, sem recarregar.
3. O consumo (tokens e US$) bate com os eventos `usage`. Importar eventos e transcripts juntos não conta nada em dobro.
4. A aba Documentos lista os planos, Release Reports, ADRs e PRDs do repo. Backlog e Roadmap vêm dos arquivos do repo. Nenhum arquivo fora de `<repo>/docs` é lido, nem com `..` ou caminho absoluto no evento.
5. Fase, alertas e próximo passo saem dos eventos: sprint entregue → "Esperando você" + "Testar a entrega da SNN"; reprovação aberta → alerta "Reviewer reprovou TNN"; sprint aberta → "Execução".
6. "Desde o seu último comando" lista os eventos desde o último início de chat.
7. Markdown com `<script>` ou `onerror` sai limpo na tela.
8. Linha inválida vai para `import_error`, e evento de `v` desconhecido é ignorado e contado. Nenhum dos dois para a importação.
9. Pedido ao harness criado com a lista de lacunas.
10. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (TDD, Vitest, `// @vitest-environment node` no servidor):**
  - T01: fixture `server/fixtures/harness-events.jsonl` com linhas reais anonimizadas de cada tipo, mais linha inválida, `v: 2` e `usage` repetido. Cobre `projects.json` (pasta temporária), dedupe entre `usage` e transcript e arquivo diário novo.
  - T02: repo de mentira em `server/fixtures/repo/` (plano com tabela de tarefas e ondas, release, ADR, backlog). Cobre caminho com `..`/absoluto recusado e plano sem tabela.
  - T03: banco em memória com eventos da fixture e o repo de mentira. Confere fase, alertas, eventos de texto, entrega e `lastCommand`.
  - T04: `Markdown` com `<script>`, `<img onerror>` e link `javascript:`.
- **Ponta a ponta (T06, Reviewer):** `npm run dev` com os dados reais desta máquina, banco temporário (`DASHBOARD_DB` numa pasta de rascunho, apagada no fim). Depois, um `hx task start`/`done` de teste num projeto de rascunho para ver a atualização ao vivo.

## Tarefas

| Id  | Tarefa                                                                                                                                                             | Agente          | Arquivos                                                                                                                                                                                                                                                   | Depende de | Bruta  | Planejado |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Importador no formato do harness: eventos v1, `projects.json`, agentes por sessão, `usage` por `message_id`; remover o gerador de exemplo e o teste de ida e volta | tech-lead       | `server/events.ts`, `server/events.test.ts`, `server/fixtures/harness-events.jsonl`, `server/db.ts`, `server/importer.ts`, `server/importer.test.ts`, `server/main.ts`, `server/data.test.ts`, `scripts/sample-events.ts`, `scripts/sample-events.test.ts` | —          | 30 min | 15 min    |
| T02 | Leitura dos repos: plano (tarefas e ondas), lista de documentos, backlog e roadmap, só dentro de `<repo>/docs`                                                     | clone           | `server/repo.ts`, `server/repo.test.ts`, `server/fixtures/repo/**`                                                                                                                                                                                         | —          | 25 min | 13 min    |
| T03 | Estado derivado no `Data`: fase, alertas, próximo passo, eventos de texto, entrega, `lastCommand`; plano e documentos vindos da T02                                | tech-lead       | `server/data.ts`, `server/data.test.ts`                                                                                                                                                                                                                    | T01, T02   | 35 min | 18 min    |
| T04 | Sanitizar o markdown com DOMPurify e tirar o script `sample-events`                                                                                                | clone           | `src/components/Markdown.tsx`, `src/components/Markdown.test.tsx`, `package.json`, `package-lock.json`                                                                                                                                                     | —          | 10 min | 5 min     |
| T05 | Pedido ao harness (lacunas) + spec 0001, backlog e roadmap atualizados                                                                                             | tech-lead       | `docs/specs/0001-backend-dados-e-api.md`, `docs/backlog.md`, `docs/roadmap.md`                                                                                                                                                                             | T03        | 10 min | 5 min     |
| T06 | Revisão: lint, tipos e testes zerados; segurança (leitura de arquivos dos repos, markdown, entrada externa); ponta a ponta com dados reais                         | reviewer (opus) | (só leitura)                                                                                                                                                                                                                                               | T01–T05    | 15 min | 8 min     |

**Paralelismo:** onda 1 = T01 (Tech Lead), T02 e T04 em clones, sem arquivos cruzados. A T04 é dona do `package.json` (sai o script `sample-events`, entra o `dompurify`). Onda 2 = T03. Onda 3 = T05. Revisão = T06 com Opus, porque a sprint lê arquivos e eventos de fora.

**Referências da bruta:**

- T01 como S03/T01 (bruta 30 min);
- T02 como S03/T02;
- T03 como S03/T04, com mais regras;
- T04 e T05 são tarefas pequenas de um arquivo;
- T06 como S03/T06.

**Histórico (hx metrics):**

| Sprint | Previsto   | Corrido | Soma planejada | Soma real  |
| ------ | ---------- | ------- | -------------- | ---------- |
| S02    | 1 h 30 min | 18 min  | 2 h 55 min     | 1 h 13 min |
| S03    | 1 h 15 min | 18 min  | 2 h 25 min     | 1 h 26 min |

Fator: relógio 20% (S02) e 24% (S03), média 22%. Soma 42% (S02) e 59% (S03), média 50%, que é o fator usado na coluna Planejado. A pausa de 9 h da S03 (limite de gasto da conta) já está fora do corrido, então a S03 entra na média.

**Total estimado:** 1 h 4 min calibrado (2 h 5 min bruto). Relógio: ~50 min de agente pelo caminho T01 → T03 → T05 → T06, mais a espera pelo teste de Daniel, à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-19 09:02:06 (horário de Brasília) — UTC 2026-10-19T12:02:06Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `8a531a86addae27a543f82cb788cf47886f44613e693505b321d148a1c52cdc0`
- **Versão do harness:** 0.5.0
