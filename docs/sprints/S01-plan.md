# S01 — Draft do front do painel

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.4.0
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe um site local (`npm run dev`) navegável com a melhor interpretação do Dashboard IA: todas as telas principais com dados de exemplo realistas, tema claro/escuro, para validar o desenho antes de ligar os dados reais.

## Escopo

1. Projeto web: Vite + React + TypeScript, Vitest, scripts `dev`, `build`, `test`, `typecheck`.
2. Modelo de dados (tipos) já no formato dos futuros eventos do harness: projeto (id fixo), chat/sessão com agentes filhos (clones, Reviewer), sprint, tarefa (início, fim, duração, pronta), consumo (tokens, US$, %).
3. Dados de exemplo: 3 projetos, chats com e sem sprint, 1 sprint ativa e 2 fechadas, agentes rodando agora.
4. Telas:
   - **Visão geral:** cards por projeto (sprint ativa, agentes rodando, consumo do dia).
   - **Projeto > Chats:** lista e detalhe do chat (tarefas com checkbox, início/fim/duração; clones e Reviewer como filhos).
   - **Projeto > Sprints:** lista e detalhe da sprint (tarefas com checkbox, início/fim/duração, status de revisão).
   - **Projeto > Backlog e Roadmap** e **Projeto > Documentos** (sprint plans, Release Reports, ADRs, PRDs em markdown renderizado, só leitura).
   - **Projeto > Consumo:** US$, tokens e % por projeto, gráfico por dia (SVG simples, sem biblioteca de gráfico).
5. ADR 0001 com a arquitetura combinada (eventos em arquivo → importador → SQLite embutido do Node → servidor local → React).

## Fora de escopo

Servidor, SQLite, leitura de arquivos reais, atualização automática, ações pelo painel, versão online (ver `docs/backlog.md`).

## Critérios de aceite

1. `npm run dev` abre o painel no navegador; navegação entre Visão geral e as 5 abas de um projeto funciona, inclusive por URL (recarregar mantém a tela).
2. Lista de tarefas (chat e sprint) mostra checkbox de pronta, início, fim e duração formatada; tarefa em andamento mostra duração corrida.
3. Chat mostra seus agentes filhos (clones/Reviewer) e, se tiver, a sprint ligada; chat sem sprint aparece normalmente.
4. Consumo mostra US$, tokens e % por projeto e o gráfico por dia.
5. Documentos e backlog/roadmap aparecem como markdown renderizado.
6. Tema claro/escuro segue o sistema; layout funciona em 360 px de largura sem rolagem horizontal.
7. `npm run build` e `npm test` passam.
8. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (Vitest, TDD):** `src/lib/time.ts` (duração, formatação, tarefa em andamento); `src/lib/usage.ts` (totais e % por projeto, série por dia); agregações da visão geral (agentes rodando, sprint ativa).
- **Componentes (Vitest + Testing Library, jsdom):** `TaskList` (checkbox, duração, em andamento); cada tela renderiza com os dados de exemplo sem erro e mostra o dado-chave do seu critério (crit. 2–5).
- **Manual (Reviewer):** `npm run dev`, navegar todas as telas, recarregar em rota interna, tema escuro, largura 360 px (crit. 1, 6).
- **Dados de teste:** só `src/data/mock.ts`, sem arquivos externos; nada a limpar.
- Vitest roda pelo PowerShell (pasta com espaço).

## Tarefas

| Id  | Tarefa                                                                                                                                           | Agente    | Arquivos                                                                                                                                                                             | Depende de                   | Estimativa |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------- |
| T01 | Base: Vite/React/Vitest, tipos, dados de exemplo, layout com navegação e rotas (páginas vazias), tema, `TaskList` e utilitários de tempo/consumo | tech-lead | `package.json`, `vite.config.ts`, `index.html`, `tsconfig.json`, `eslint.config.mjs`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/data/*`, `src/lib/*`, `src/components/*` | —                            | 1 h 30 min |
| T02 | Tela Visão geral                                                                                                                                 | clone     | `src/pages/Overview.tsx`, `src/pages/Overview.module.css`, `src/pages/Overview.test.tsx`                                                                                             | T01                          | 45 min     |
| T03 | Telas Chats (lista + detalhe com agentes filhos)                                                                                                 | clone     | `src/pages/Chats.tsx`, `src/pages/Chats.module.css`, `src/pages/Chats.test.tsx`                                                                                                      | T01                          | 1 h        |
| T04 | Telas Sprints (lista + detalhe)                                                                                                                  | clone     | `src/pages/Sprints.tsx`, `src/pages/Sprints.module.css`, `src/pages/Sprints.test.tsx`                                                                                                | T01                          | 1 h        |
| T05 | Telas Backlog/Roadmap e Documentos (markdown renderizado)                                                                                        | clone     | `src/pages/Plan.tsx`, `src/pages/Docs.tsx`, `src/pages/Docs.module.css`, `src/pages/Docs.test.tsx`                                                                                   | T01                          | 1 h        |
| T06 | Tela Consumo (cards + gráfico SVG por dia)                                                                                                       | clone     | `src/pages/Usage.tsx`, `src/pages/Usage.module.css`, `src/pages/Usage.test.tsx`                                                                                                      | T01                          | 45 min     |
| T07 | ADR 0001 — arquitetura do painel                                                                                                                 | tech-lead | `docs/adr/0001-arquitetura.md`                                                                                                                                                       | —                            | 30 min     |
| T08 | Revisão: lint e tipos zerados, testes, critérios de aceite, teste manual                                                                         | reviewer  | (só leitura)                                                                                                                                                                         | T02, T03, T04, T05, T06, T07 | 45 min     |

**Paralelismo:** T07 roda junto com T01. Depois de T01, T02–T06 rodam em paralelo em clones (cada um só nos seus arquivos de `src/pages/`). Arquivos compartilhados (`App.tsx`, `src/data/*`, `src/lib/*`, `src/components/*`, `package.json`) são do Tech Lead: clone que precisar de dado ou componente novo pede ao Tech Lead, não edita. Dependência nova de clone (ex.: lib de markdown em T05) também passa pelo Tech Lead.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-16 16:36:00 (horário de Brasília) — UTC 2026-10-16T19:36:00Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `fc5becaa728ec543bf5e6999216e4896cf2f640bbacdd33278ae33f5a1595fa0`
- **Versão do harness:** 0.4.0
