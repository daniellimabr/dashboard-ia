# S05 — Navegação pelos projetos e documentos

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.7.0
- **Status:** aguardando aprovação

## Objetivo

Daniel entra em qualquer projeto a partir das telas principais e lê todos os documentos dele pelo painel, sem cair em "Página não encontrada".

## Escopo

1. **Corrigir a abertura dos documentos.** Causa: o id do documento tem barra (`dashboard-ia:sprints/S01-plan.md`), o link não é codificado e a rota `docs/:docId?` não casa. Codificar o id nos links (Documentos e Bem-vindo).
2. **Links entre documentos.** Link relativo para `.md` dentro de um documento (ex.: `../adr/0001-x.md`) abre o documento no painel. Link para fora de `docs/` ou que não existe vira texto "não encontrado", sem quebrar a tela.
3. **Página Projetos** (`/projetos`) no lugar do menu provisório "Projetos": um cartão por projeto com fase, sprint atual e atalhos para Chats, Sprints, Backlog e Roadmap, Documentos e Consumo.
4. **Atalhos nas telas principais:** na Sala de controle e na Linha do tempo, o nome do projeto leva ao projeto e o id da sprint (ex.: S04) leva à sprint.

## Fora de escopo

- Redesenho da tela principal (precisa de drafts antes).
- Abrir documento no VS Code, histórico de chats no SQLite, ações pelo painel.
- % real do limite da assinatura.

## Critérios de aceite

1. Clicar em qualquer documento da aba Documentos ou do Bem-vindo abre o documento (testar com plano, Release Report, ADR e PRD dos dois projetos).
2. Link relativo entre documentos abre o documento certo; link quebrado mostra aviso, sem erro.
3. A aba Projetos lista todos os projetos de `projects.json` com atalhos que funcionam; o menu provisório sumiu.
4. Na Sala de controle e na Linha do tempo, projeto e sprint são clicáveis e levam à tela certa.
5. Recarregar a página (F5) num documento aberto mostra o mesmo documento.
6. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (TDD, Vitest + Testing Library):**
  - T01: `Docs` com id contendo `/` abre pelo link; rota direta com id codificado; link relativo `.md` vira link do painel; link para fora de `docs/` ou inexistente mostra aviso.
  - T02: `Projects` lista projetos e atalhos; `Layout` sem o menu provisório; `Control` e `Timeline` com links de projeto e sprint.
- **Ponta a ponta (T03, Reviewer):** `npm run dev` com dados reais, clicar em documentos dos dois projetos, links internos, F5 num documento e todos os atalhos novos.

## Tarefas

| Id  | Tarefa                                                                                                           | Agente    | Arquivos                                                                                                                                                                                                                                                  | Depende de | Bruta  | Planejado |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Abrir documentos: codificar o id nos links; links relativos `.md` entre documentos abrem no painel               | tech-lead | `src/pages/Docs.tsx`, `src/pages/Docs.test.tsx`, `src/pages/Welcome.tsx`, `src/pages/Welcome.test.tsx`, `src/components/Markdown.tsx`, `src/components/Markdown.test.tsx`                                                                                 | —          | 20 min | 10 min    |
| T02 | Página Projetos no lugar do menu provisório; atalhos de projeto e sprint na Sala de controle e na Linha do tempo | clone     | `src/pages/Projects.tsx`, `src/pages/Projects.test.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/components/Layout.tsx`, `src/styles.css`, `src/pages/Control.tsx`, `src/pages/Control.test.tsx`, `src/pages/Timeline.tsx`, `src/pages/Timeline.test.tsx` | —          | 25 min | 13 min    |
| T03 | Revisão: lint, tipos e testes zerados; Ponytail; ponta a ponta com dados reais                                   | reviewer  | (só leitura)                                                                                                                                                                                                                                              | T01, T02   | 10 min | 5 min     |

**Paralelismo:** onda 1 = T01 (Tech Lead) e T02 (clone), sem arquivos cruzados. Onda 2 = T03 com Sonnet (não toca superfície de segurança; links de documentos só navegam dentro do painel).

**Referências da bruta:** T01 como S04/T04 com um bug a mais; T02 como S04/T02 (tela nova + ajustes em duas telas); T03 como S04/T06 sem a parte de segurança.

**Fator:** 50% (média da soma real/planejada de S02–S03, o mesmo da S04).

**Total estimado:** 28 min calibrado (55 min bruto). Relógio: ~20 min de agente (onda 1 em paralelo + revisão), mais a espera pelo teste de Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-21 17:52:05 (horário de Brasília) — UTC 2026-10-21T20:52:05Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `a8b27febb07ae4645fc85c2b570b93f762bfa63a6711991bdc94389cf234f101`
- **Versão do harness:** 0.7.0
