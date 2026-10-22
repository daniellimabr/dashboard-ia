# S09 — Revamp do frontend: aplicar a direção C

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.8.2
- **Status:** aguardando aprovação

## Objetivo

O painel em `/` passa a ser a direção C escolhida na S08 (Espaço de trabalho), em todas as telas, com tema escuro como padrão, Backlog e Roadmap num formato próprio, Consumo dentro do projeto e sem nenhum dado "exemplo". Ao final, `drafts.html` e `src/drafts/` deixam de existir.

## Escopo

1. **Moldura e base (T01):** tokens da C em `src/styles.css` (escuro padrão, claro opcional, rolagem fina), componentes da C (`Pill`, `Meter`, `Panel`, `Accordion`, `Tabs`, `Empty`, `Steps`, `Gantt`, `Tip`) em `src/components/ui.tsx`, menu lateral da C em `Layout.tsx` (Telas, Itens do projeto, Projetos em acordeão, limites e tema fixos no pé), título da aba "Dashboard IA: <tela>", rotas novas em `App.tsx` e a tela Componentes. Sem a faixa de notas e sem o seletor A/B/C.
2. **Dados reais no lugar de "exemplo" (T02, servidor):**
   - **Custo e tokens por agente:** dos transcripts (`usage.agentId`), ligados ao agente da sprint.
   - **Espera por resposta de Daniel:** intervalos entre a última resposta do assistente e a próxima mensagem de Daniel, nos transcripts do chat da sprint.
   - **Espera de limite:** intervalos em que a sessão parou por limite (transcript ou `usage.limits`).
   - **Estado do agente, id do agente na tarefa e tarefas tocadas:** do que os eventos atuais já trazem (`task.start`, `task.phase`, `agent`).
   - O que não tiver fonte confiável vira "sem dado" (nunca "exemplo"); a falta vira pedido ao harness, que já está no inbox (`agent.start`/`agent.end`).
3. **Telas (T03–T07):** aplicar os drafts da C nas telas reais, usando a base do T01 e os dados do T02.
   - **T03 — Início, Sala de controle e Ociosos:** Sala de controle com os 4 cards (Andamento, Plano no tempo, Agentes, Consumo), lista de tarefas por onda, agentes "x/y ativos" com seta; Início e Ociosos como no draft.
   - **T04 — Linha do tempo:** agentes agrupados por sprint ou chat avulso, no modelo atual.
   - **T05 — Projeto › Chats, Sprints, Plano e Documentos.**
   - **T06 — Projeto › Backlog e Roadmap em formato novo:**
     - **Backlog:** tabela com prioridade, data, situação (aberto, planejado SNN, concluído SNN) e texto; filtro por situação; abertos primeiro.
     - **Roadmap:** colunas Agora · Próximo · Depois · Feito, com as sprints como cartões que abrem o plano ou o Release Report (como na S07).
     - Ambos leem o markdown do repo e caem no markdown cru se o arquivo não seguir o formato.
   - **T07 — Projeto › Consumo:** no visual da C, acordeão dia › sprints (como hoje), mais o total do projeto.
4. **Limpeza (T08):** apagar `drafts.html`, `src/drafts/`, as páginas antigas que perderam uso (`Welcome`, `Overview`, `Projects`, se substituídas) e os CSS órfãos; atualizar `index.md`.
5. **Conferência visual (T09, Reviewer):** além de lint, tipos e testes, abre o app no navegador e confere cada tela em 1920x1080, escuro e claro: sem rolagem horizontal, sem vazio sob os cards, menu sem vazamento (retrospectiva da S08).

## Fora de escopo

- Novos eventos do harness (pedido já no inbox); o que faltar fica "sem dado".
- Ações pelo painel, link para o VS Code, histórico de chats no SQLite.
- Mudar a direção visual: é aplicar a C como Daniel aprovou na S08.

## Critérios de aceite

1. `/` abre na moldura da C, tema escuro; o botão de tema troca para claro e lembra a escolha.
2. Todas as telas do menu funcionam: Início, Sala de controle, Linha do tempo, Ociosos, Componentes; e no projeto: Chats, Sprints, Backlog, Roadmap, Documentos, Consumo.
3. Nenhum texto "exemplo" no app; o que não tem fonte mostra "sem dado".
4. Sala de controle mostra custo/tokens por agente, espera por Daniel e espera de limite com dados reais quando houver.
5. Backlog e Roadmap no formato novo, com fallback para o markdown.
6. `drafts.html` e `src/drafts/` apagados; `index.md` atualizado.
7. Em 1920x1080, nos dois temas: sem rolagem horizontal da página, cards da linha com a mesma altura.
8. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** moldura renderiza o menu, troca tema (escuro padrão), título da aba por tela; testes dos componentes base portados da C.
- **T02:** testes de servidor com fixtures de transcript: custo por agente, espera por Daniel, espera de limite; campo ausente = sem dado.
- **T03–T07:** um teste por tela com o mock (portar `Draft.test.tsx`/`Control.test.tsx` da C), sem "exemplo"; T06 com parser de backlog/roadmap (formato válido e fallback).
- **T08:** suíte inteira e build passando sem `src/drafts`.
- **T09:** conferência no navegador (1920x1080, escuro e claro), prints anexados à revisão.
- **Manual (Daniel):** passa por todas as telas nos dois temas.

## Tarefas

| Id  | Tarefa                                              | Agente    | Arquivos                                                                                                                                                                                                                                                   | Depende de | Bruta  | Planejado |
| --- | --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Moldura e base da C (tokens, menu, componentes)     | tech-lead | `src/styles.css`, `src/components/Layout.tsx`, `src/components/Layout.module.css`, `src/components/ui.tsx`, `src/components/ui.module.css`, `src/components/*.test.tsx` (novos), `src/App.tsx`, `src/App.test.tsx`, `src/pages/Components.tsx`, `index.md` | —          | 60 min | 21 min    |
| T02 | Dados reais no lugar de "exemplo" (servidor)        | clone     | `server/usage.ts`, `server/data.ts`, `server/db.ts`, `server/*.test.ts`, `server/fixtures/`, `src/data/types.ts`, `src/data/mock.ts`                                                                                                                       | —          | 60 min | 21 min    |
| T03 | Início, Sala de controle e Ociosos                  | clone     | `src/pages/Home.*`, `src/pages/Control.*`, `src/pages/Idle.*`                                                                                                                                                                                              | T01, T02   | 60 min | 21 min    |
| T04 | Linha do tempo                                      | clone     | `src/pages/Timeline.*`                                                                                                                                                                                                                                     | T01        | 30 min | 11 min    |
| T05 | Projeto › Chats, Sprints, Plano e Documentos        | clone     | `src/pages/Chats.*`, `src/pages/Sprints.*`, `src/pages/Plan.*`, `src/pages/Docs.*`                                                                                                                                                                         | T01        | 45 min | 16 min    |
| T06 | Projeto › Backlog e Roadmap (formato novo)          | clone     | `src/pages/Backlog.*`, `src/pages/Roadmap.*`, `src/lib/docsParse.ts`, `src/lib/docsParse.test.ts`                                                                                                                                                          | T01        | 45 min | 16 min    |
| T07 | Projeto › Consumo                                   | clone     | `src/pages/Usage.*`                                                                                                                                                                                                                                        | T01        | 30 min | 11 min    |
| T08 | Limpeza: apagar drafts e páginas antigas            | tech-lead | `drafts.html`, `src/drafts/`, `src/pages/Welcome.*`, `src/pages/Overview.*`, `src/pages/Projects.*`, `vite.config.ts`, `index.md`                                                                                                                          | T03–T07    | 15 min | 5 min     |
| T09 | Revisão das ondas + conferência visual no navegador | reviewer  | (só leitura)                                                                                                                                                                                                                                               | T01–T08    | 25 min | 9 min     |

**Paralelismo:**

- **Onda 1:** T01 (Tech Lead) e T02 (clone). T01 só toca front de base; T02 só servidor, `types.ts` e `mock.ts`. Sem cruzamento.
- **Onda 2:** T03–T07 em 5 clones, cada um só nas suas páginas. `App.tsx`, `Layout.tsx`, `ui.tsx` e `styles.css` ficam congelados (só leitura); as rotas de todas as telas, inclusive Backlog e Roadmap, já nascem no T01 apontando para os arquivos que cada clone cria. Precisou de algo na base: pede ao Tech Lead, que edita. Cada clone chama `frontend-design` (e `dataviz` em T03, T04 e T07) antes do código, porta do draft C correspondente (`src/drafts/c/`, só leitura) e entrega o plano visual.
- **Onda 3:** T08 (Tech Lead), depois T09. Reviewer com **Sonnet** (nenhuma tarefa toca superfície de segurança; T02 só lê transcripts locais que já lia).

**Referências da bruta:** T01 como S08/T04 (moldura + componentes); T02 como S06/T01 (servidor + dados); T03 como S07/Sala de controle; T04–T07 como as telas da S07; T08 como limpeza da S07; T09 como S08/T05 mais a conferência no navegador.

**Fator:** 35%. Na S08 o real ficou em ~30% nos drafts, mas aqui é código de produção com testes e dados reais.

**Total estimado:** 131 min calibrado (370 min bruto). Relógio: ~60 min de agente (onda 1 ~21 min, onda 2 ~21 min, onda 3 ~15 min), mais o teste de Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-22 15:12:30 (horário de Brasília) — UTC 2026-10-22T18:12:30Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `5d176db0798838b9262b2517ddcc4f2fe13b23adeec6910913f842e4d7002824`
- **Versão do harness:** 0.8.2
