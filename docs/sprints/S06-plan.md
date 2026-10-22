# S06 — Drafts da Sala de controle e das abas de Projetos

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.7.0
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe 2 drafts de cada tela pedida (Sala de controle e as abas de Projetos) para escolher funcionalidades e aparência antes de implementar. De quebra, a Sala de controle volta a mostrar a sprint depois do fechamento.

## Escopo

1. **Correção: sprint some depois do fechamento.** Causa: a Sala de controle só procura sprint `active` ou `planned`; depois do `hx sprint close` (antes do Release Report) não acha nada. Sem sprint ativa, mostrar a mais recente fechada, marcada como "Concluída".
2. **Drafts (HTML estático, 2 variantes por tela, dados de exemplo)**, no estilo do `S02-draft.html`:
   - **Sala de controle:** escolher a sprint (mais recente → mais antiga, inclusive fechadas); conversas em andamento fora de sprint; selo de estado com "desde" ("Em execução desde 14:32", "Ocioso desde 10:05", "Aguardando revisão de Daniel desde 16:10", "Concluída").
   - **Projetos › Chats:** lista com título, início e última interação, da mais recente para a mais antiga.
   - **Projetos › Sprints:** acordeão por sprint; no item, um resumo (objetivo, status, datas, tarefas); aberto, links para plano e Release Report.
   - **Projetos › Backlog:** controle por item (status, data de pronto, sprint planejada).
   - **Projetos › Roadmap:** etapas com a etapa atual em destaque; itens com status e sprint.
   - **Projetos › Documentos:** só ADRs e PRDs.
   - **Projetos › Consumo:** visual novo (custo e tokens por dia, por sprint e por agente).
3. **Viabilidade dos dados:** cada draft anota, no rodapé, de onde vem cada dado e o que ainda falta (ex.: título do chat depende do pedido ao harness de 2026-10-21; status de backlog/roadmap pede um formato de tabela nos `.md`).
4. **Ajuste 1 (retorno de Daniel):** os drafts em HTML não pareciam o sistema. Refeitos num arquivo paralelo (`drafts.html` + `src/drafts/`), com os componentes e o CSS reais e dados fake, sem tocar no painel em produção; os HTML saem.
   **Ajuste 2:** na Sala de controle, as sprints mais recentes viram abas na janela da sprint; clicar numa aba troca horários, itens e gasto para aquela sprint.
5. **Limites 5 h e semanal reais (pedido de Daniel, 19:07):** o harness já grava o evento `usage.limits` (% e horário de renovação da janela de 5 h e da semana). O importador passa a gravar esse evento em `limit_window`; a barra do topo mostra o % real e "renova em …" em vez do estimado.

## Fora de escopo

- Implementar as telas novas (próxima sprint, a partir dos drafts escolhidos).
- Mudar o formato do `backlog.md` e do `roadmap.md` (só proposto nos drafts).
- Novos eventos do harness, ações pelo painel.

## Critérios de aceite

1. Com a última sprint fechada e sem sprint ativa, a Sala de controle mostra essa sprint marcada como "Concluída".
2. Existem 2 variantes de cada uma das 7 telas, dentro do app e no visual do sistema, alternáveis por um seletor A/B.
3. Cada pedido de Daniel aparece em pelo menos uma das variantes da tela correspondente.
4. Cada draft lista a origem dos dados e o que falta.
5. Com um evento `usage.limits` recente, a barra do topo mostra o % real de 5 h e da semana e o horário de renovação (sem "estimado").
6. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (TDD, Vitest + Testing Library):** T01: `Control` sem sprint ativa mostra a última fechada com "Concluída"; com sprint ativa, segue igual.
- **Drafts (T02–T04):** um teste de fumaça por tela (renderiza a A com o pedido e troca para a B). O Reviewer confere o critério 3 contra a lista do escopo.
- **T06:** importar um `usage.limits` grava 5 h e semana em `limit_window`; `buildData` devolve o % e o `resetsAt` reais.
- **Manual (Daniel):** abre os drafts e escolhe uma variante (ou mistura) por tela.

## Tarefas

| Id  | Tarefa                                                                | Agente    | Arquivos                                                                     | Depende de | Bruta  | Planejado |
| --- | --------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Sala de controle mostra a última sprint fechada quando não há ativa   | tech-lead | `src/pages/Control.tsx`, `src/pages/Control.test.tsx`                        | —          | 20 min | 10 min    |
| T02 | Draft Sala de controle (2 variantes)                                  | clone     | `drafts.html`, `src/drafts/` (exceto ProjectsDraftA/B), `src/test-utils.tsx` | —          | 40 min | 20 min    |
| T03 | Drafts Projetos: Chats, Sprints e Documentos (2 variantes cada)       | clone     | `src/drafts/ProjectsDraftA*`                                                 | —          | 40 min | 20 min    |
| T04 | Drafts Projetos: Backlog, Roadmap e Consumo (2 variantes cada)        | clone     | `src/drafts/ProjectsDraftB*`                                                 | —          | 40 min | 20 min    |
| T05 | Revisão: lint, tipos e testes zerados; drafts cobrem todos os pedidos | reviewer  | (só leitura)                                                                 | T01–T04    | 10 min | 5 min     |
| T06 | Limites 5 h e semanal reais a partir do evento `usage.limits`         | tech-lead | `server/events.ts`, `server/events.test.ts`, `server/data.test.ts`           | —          | 20 min | 10 min    |

**Paralelismo:** onda 1 = T01 (Tech Lead), T02, T03 e T04 (clones), sem arquivos cruzados. Onda 2 = T05 com Sonnet (não toca superfície de segurança). Os clones copiam tokens de cor e fontes de `src/styles.css` e o formato dos dados de `src/data/mock.ts` (só leitura).

**Referências da bruta:** T01 como S05/T01 (bug pequeno numa tela); T02–T04 como o draft da S02 dividido em três; T05 como S05/T03.

**Onda 3 (após o Ajuste 1):** T06 (Tech Lead), revisada pelo Reviewer com Opus (entrada externa: eventos do harness).

**Fator:** 50% (o mesmo da S04 e S05).

**Total estimado:** 75 min calibrado (150 min bruto). Relógio: ~25 min de agente (onda 1 em paralelo + revisão), mais a conversa com Daniel sobre os drafts.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-21 19:42:16 (horário de Brasília) — UTC 2026-10-21T22:42:16Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `4868b3482f464eac43bc2da8882a11f7f1103aa1ddbc50637bafb5379bfa8720`
- **Versão do harness:** 0.8.0
