# S01 — Release Report

- **Projeto:** dashboard-ia · **Harness:** 0.4.0 · **Fechada em:** 2026-10-16

## Entrega

Primeiro draft navegável do painel (`npm run dev`), com dados de exemplo: Visão geral com cards por projeto e, dentro de cada projeto, Chats (com agentes filhos), Sprints, Backlog e Roadmap, Documentos e Consumo (gráfico SVG por dia). Tema claro/escuro, rotas por URL, ADR 0001 com a arquitetura (eventos → importador → `node:sqlite` → servidor local → React). 8/8 tarefas, 33 testes, lint e tipos zerados, build ok.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Base: Vite/React/Vitest, tipos, dados de exemplo, layout com navegação e rotas (páginas vazias), tema, `TaskList` e utilitários de tempo/consumo | tech-lead | 1 h 30 min | 17:01 | 17:11 | 10 min |
| ✅ | T02 | Tela Visão geral | clone | 45 min | 17:07 | 17:16 | 9 min |
| ✅ | T03 | Telas Chats (lista + detalhe com agentes filhos) | clone | 1 h | 17:07 | 17:16 | 9 min |
| ✅ | T04 | Telas Sprints (lista + detalhe) | clone | 1 h | 17:07 | 17:16 | 9 min |
| ✅ | T05 | Telas Backlog/Roadmap e Documentos (markdown renderizado) | clone | 1 h | 17:07 | 17:16 | 9 min |
| ✅ | T06 | Tela Consumo (cards + gráfico SVG por dia) | clone | 45 min | 17:07 | 17:16 | 9 min |
| ✅ | T07 | ADR 0001 — arquitetura do painel | tech-lead | 30 min | 17:01 | 17:11 | 10 min |
| ✅ | T08 | Revisão: lint e tipos zerados, testes, critérios de aceite, teste manual | reviewer | 45 min | 17:14 | 17:16 | 1 min |
| ✅ | **Total** | 8 tarefas |  | 3 h 15 min | 2026-10-16 17:01 | 2026-10-16 17:16 | 14 min |

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 3 h 15 min · 14 min |
| Soma das tarefas (planejada · real) | 7 h 15 min · 1 h 4 min |
| Tarefas feitas | 8/8 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 200 / 38.541 / 419.419 / 5.782.884 |
| Custo total | US$ 4.28 |
| Custo por agente | Tech Lead US$ 2.45 · clones US$ 1.56 · Reviewer US$ 0.27 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Reprovações do Reviewer | 0 |
| Alertas de contexto · Handoffs | 0 · 0 |

## Revisão

Duas ondas, um Reviewer (Sonnet), zero reprovações. Onda 1: T01 e T07. Onda 2: T02–T06 e T08. Achados de baixa prioridade sem bloqueio: ordem de import em `Overview.tsx`; gráfico de Consumo com `viewBox` de largura 0 se não houver dados (não ocorre no mock). Segurança: o markdown é renderizado sem sanitização, aceito porque só usa mock local (foi para o backlog).

**Não verificado no navegador:** a máquina não tem navegador para os agentes, então o tema escuro, a largura de 360 px e o recarregamento em rota interna (critérios 1 e 6) só foram checados pelo código.

## Retorno de Daniel

Sem ajustes. É um modelo bem inicial, longe da complexidade e do layout esperados, mas valida a capacidade de entrega do harness. Próximo passo: aprofundar o layout (drafts), com a tela principal mostrando o máximo de informação de cada projeto, antes da comunicação entre painel e agentes/projetos. Isso entrou no backlog como prioridade alta.

## Retrospectiva

Primeira sprint do projeto, sem base de comparação.

- **Funcionou:** o paralelismo. Depois da base, 5 clones fizeram as 5 telas ao mesmo tempo, sem conflito de arquivos, e todos terminaram em cerca de 5 min. A base pronta (tipos, mock, `TaskList`, `renderAt`) deixou os handoffs curtos.
- **Estimativa:** o real ficou cerca de 85% abaixo do planejado (1 h 4 min contra 7 h 15 min de soma; 14 min contra 3 h 15 min de relógio). As próximas estimativas devem partir destes números.
- **Duração dos clones:** a duração registrada vai até o commit, depois da revisão da onda, e não até o clone terminar, o que infla um pouco o tempo das tarefas de clone.
- **Teste manual:** sem navegador, o Reviewer não conseguiu cobrir os critérios visuais.
- **Atrito:** um teste de rota dependia do conteúdo de uma tela de clone e quebrou no meio da onda; o formato de US$ precisou ser unificado entre duas telas (`src/lib/format.ts`). Para as próximas: deixar os formatadores compartilhados prontos na base.
