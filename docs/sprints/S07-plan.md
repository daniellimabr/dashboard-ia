# S07 — Telas escolhidas nos drafts da S06

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.8.1
- **Status:** aguardando aprovação

## Objetivo

As 7 telas passam a ter, no painel real, a variante que Daniel escolheu nos drafts da S06. No fim, os drafts saem do repo (`drafts.html` e `src/drafts/`).

## Escopo

1. **Sala de controle (variante B):** as sprints mais recentes viram abas na janela da sprint, cada aba com id + situação ("Em execução", "Concluída"...). Clicar troca horários, tarefas e gasto para aquela sprint.
2. **Projetos › Chats (variante B, lista):** título, início e última interação, da mais recente para a mais antiga, com acabamento melhor que o draft (alinhamento, hierarquia de texto, estado vazio, chat aberto em destaque).
3. **Projetos › Sprints (variante B, acordeão):** um item por sprint com resumo (objetivo, status, datas, tarefas); a ativa já aberta com as tarefas; aberta, links para plano e Release Report.
4. **Projetos › Documentos (variante A):** ADRs e PRDs agrupados por tipo.
5. **Projetos › Backlog e Roadmap:**
   - **Backlog:** tabela (A) primeiro e kanban (B) abaixo, com controle de status. Novo formato do item no `backlog.md` (já aplicado no planejamento): `- [prioridade] data [status: SNN] — texto`. Sem marca = **Backlog**; `[planejado: SNN]` = **Planejado** (entrou num sprint plan); `[concluído: SNN]` = **Concluído** (a sprint fechou). O kanban tem essas 3 colunas; a tabela mostra prioridade, data, status e sprint. O "Topo do backlog" do Bem-vindo passa a ignorar itens concluídos e a esconder a marca.
   - **Quem atualiza a marca:** o Tech Lead, ao escrever o sprint plan (planejado) e ao fechar a sprint (concluído). Vai um pedido ao harness para isso entrar nas skills `sprint-plan` e `release-report`.
   - **Roadmap (A numa linha do tempo):** cada seção do `roadmap.md` (Feito, Agora, Próximo, Depois) é uma etapa da linha do tempo; cada etapa abre em acordeão a lista de sprints citadas (S01, S04...). Clicar na sprint abre o plano se não estiver concluída, ou o Release Report se estiver 100%.
6. **Projetos › Consumo (no sentido da A, acordeão dia › sprints):** cada dia mostra custo e tokens; aberto, mostra quanto foi para cada sprint daquele dia (e "fora de sprint"). O servidor passa a devolver o consumo por dia e por sprint (mesma janela de tempo que já usa para o custo da sprint).
7. **Limpeza:** apagar `drafts.html` e `src/drafts/` (inclui a cópia `ControlColumn.tsx`, dívida da S06) e atualizar o `index.md`.

## Fora de escopo

- Título do chat e "aguardando revisão de Daniel" (dependem do pedido ao harness de 2026-10-21; a tela usa o que já existe).
- Mudar o formato do `roadmap.md`.
- Consumo por agente (o evento `usage` ainda não traz o agente).
- Ações pelo painel.

## Critérios de aceite

1. Sala de controle: abas com as sprints recentes (id + situação); trocar de aba troca horários, tarefas e gasto.
2. Chats: lista da mais recente para a mais antiga, com título, início e última interação.
3. Sprints: acordeão com resumo; a ativa aberta com as tarefas; links para plano e Release Report.
4. Documentos: ADRs e PRDs em grupos separados.
5. Backlog: tabela e, abaixo, kanban com as colunas Backlog, Planejado e Concluído, a partir das marcas do `backlog.md` real; o Bem-vindo não mostra itens concluídos.
6. Roadmap: etapas numa linha do tempo; cada uma abre a lista de sprints; o link da sprint vai ao plano (não concluída) ou ao Release Report (100%).
7. Consumo: acordeão por dia; aberto, custo por sprint naquele dia; a soma das sprints + "fora de sprint" bate com o total do dia.
8. `drafts.html` e `src/drafts/` não existem mais; o app compila e os testes passam.
9. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (TDD, Vitest + Testing Library), um por tela:** T01 troca de aba; T02 ordem e campos da lista; T03 ativa aberta e links; T04 grupos ADR/PRD; T05 parser do backlog (item, prioridade, data, status/sprint, subitens; sem marca = backlog) e do roadmap (etapas e sprints citadas) + link plano × Release Report; T06 servidor soma por dia e sprint (borda da janela da sprint e "fora de sprint") e a tela abre o dia.
- **T07:** `hx run npx vitest run` e build zerados depois de apagar os drafts.
- **Manual (Daniel):** abre cada aba de um projeto e a Sala de controle. Reiniciar o painel antes (a T06 muda o `server/`).

## Tarefas

| Id  | Tarefa                                               | Agente    | Arquivos                                                                                                                                                             | Depende de | Bruta  | Planejado |
| --- | ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Sala de controle: abas das sprints recentes          | clone     | `src/pages/Control.tsx`, `Control.test.tsx`, `Control.module.css`                                                                                                    | —          | 30 min | 15 min    |
| T02 | Chats em lista, com acabamento                       | clone     | `src/pages/Chats.tsx`, `Chats.test.tsx`, `Chats.module.css` (novo)                                                                                                   | —          | 30 min | 15 min    |
| T03 | Sprints em acordeão                                  | clone     | `src/pages/Sprints.tsx`, `Sprints.test.tsx`                                                                                                                          | —          | 30 min | 15 min    |
| T04 | Documentos agrupados por tipo                        | clone     | `src/pages/Docs.tsx`, `Docs.test.tsx` (o caso de backlog/roadmap sai daqui)                                                                                          | —          | 20 min | 10 min    |
| T05 | Backlog (tabela + kanban) e Roadmap (linha do tempo) | clone     | `src/pages/Plan.tsx`, `Plan.test.tsx` (novo), `Plan.module.css` (novo), `src/pages/Welcome.tsx`, `Welcome.test.tsx`                                                  | —          | 60 min | 30 min    |
| T06 | Consumo em acordeão dia › sprints (servidor + tela)  | tech-lead | `server/usage.ts`, `server/usage.test.ts`, `server/data.ts`, `server/data.test.ts`, `src/data/types.ts`, `src/pages/Usage.tsx`, `Usage.test.tsx`, `Usage.module.css` | —          | 60 min | 30 min    |
| T07 | Apagar drafts e atualizar `index.md`                 | tech-lead | `drafts.html`, `src/drafts/`, `index.md`                                                                                                                             | T01–T06    | 10 min | 5 min     |
| T08 | Revisão da onda (lint, tipos, testes, critérios)     | reviewer  | (só leitura)                                                                                                                                                         | T01–T07    | 20 min | 10 min    |

**Paralelismo:** onda 1 = T01–T05 (clones) e T06 (Tech Lead), sem arquivos cruzados. O `ProgressRow` (acordeão) e os componentes de `src/components/` são só leitura; os clones copiam a ideia dos drafts em `src/drafts/` (só leitura até a T07). Onda 2 = T07 e depois T08 com Sonnet (nenhuma tarefa toca hooks, eventos ou entrada externa nova).

**Atenção:** enquanto a T04 não tirar o caso de backlog/roadmap do `Docs.test.tsx`, a T05 pode ver esse teste falhar; é esperado.

**Referências da bruta:** telas simples como S05/T01; T05 e T06 maiores (parser ou servidor + tela), como S06/T06 dobrada; T07 como limpeza curta.

**Fator:** 50% (o mesmo da S04–S06; a S06 ficou abaixo do previsto nas tarefas).

**Total estimado:** 130 min calibrado (260 min bruto). Relógio: ~45 min de agente (onda 1 em paralelo ~30 min + limpeza + revisão), mais o teste de Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-22 08:10:35 (horário de Brasília) — UTC 2026-10-22T11:10:35Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `dbaec9f21943eb0bba1d9f21c6d89f3e6a04833ac059fb62712c485d23e3279a`
- **Versão do harness:** 0.8.1
