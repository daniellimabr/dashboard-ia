# S02 — Design do front do painel

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.4.0
- **Status:** aguardando aprovação

## Objetivo

Daniel abre o painel (`npm run dev`) e encontra o desenho final combinado no rascunho: três telas (Bem-vindo de volta, Sala de controle, Linha do tempo) e a tela de Ociosos, no visual escuro da direção A, com dados de exemplo. A partir daqui o retorno vem do uso; servidor e banco ficam para a S03.

**Referência visual:** [S02-draft.html](S02-draft.html) (cópia do rascunho publicado em https://claude.ai/artifact/GMyEZVH7mP9eFbd8QLFPhv). A execução parte exatamente do rascunho: mesma estrutura, informações, cores e comportamento, sem reinterpretar. A revisão olha só a qualidade da apresentação das informações, o layout e o código.

## Escopo

1. **Base visual e navegação:** visual escuro único (fontes IBM Plex Sans Condensed e IBM Plex Mono, tokens do rascunho); menu fixo com as 3 telas + `Ociosos (n)`; limite da assinatura (5 h e semanal, % e quando renova) sempre visível no menu. Rotas: `/` Bem-vindo, `/controle`, `/tempo`, `/ociosos`; as abas de projeto da S01 (`/p/:id/...`) continuam e ganham o novo visual. A Visão geral da S01 sai.
2. **Modelo e dados de exemplo** (tipos no formato dos futuros eventos): último comando de Daniel (data/hora e chat); por projeto: fase, próximo passo, "onde parou", alertas/pendências, eventos desde o último comando, última atividade; por sprint: objetivo, início/fim, tempo previsto e corrido, gasto, reprovações; por tarefa: etapa (teste, código, lint, revisão, commit), reprovada ou não, plano (início relativo, duração prevista, dependências), onda; tarefas fora da sprint (de chats sem sprint: título, chat, agente, início/fim, rodando ou feita); agentes com % de contexto; consumo de 7 dias. Mock: 3 projetos ativos e 2 ociosos, como no rascunho.
3. **Bem-vindo de volta:** frase com o último comando (quando e em qual chat) e quantos projetos esperam por Daniel; uma coluna por projeto com Próximo passo (destacado, com botão), Onde parou, Desde o seu último comando (inclui tarefas fora da sprint), Documentos (plano, Release Report, ADR/PRD, handoff — links para a aba Documentos do projeto) e Topo do backlog.
4. **Sala de controle:** uma coluna por projeto com:
   - alertas/pendências;
   - **4 acordeões no mesmo estilo** (linha principal com título, subtítulo e resumo à direita), nesta ordem: Timeline → Horários → Fora da sprint → Itens da sprint. Timeline e Horários começam abertos;
   - **acordeão Timeline** (fechado mostra x/y feitas) com o mini-gantt das tarefas: posição pelo plano, dependências em linha tracejada, cor pela etapa (feita, rodando, reprovada, a fazer tracejada) com intensidade crescente pelo %, % escrito ao lado do número da tarefa, linha "agora";
   - **acordeão Horários** (fechado mostra início → fim · corrido) com a tabela Início, Fim, Corrido, Previsto;
   - **acordeão Fora da sprint** (só se houver): tarefas de chats sem sprint com ícone do agente, chat, início → fim · duração e etiqueta rodando/feita; sem % e fora do gantt;
   - **acordeão Itens da sprint** (linha principal com código, título e objetivo da sprint, x/y feitas, % geral e barra em gradiente verde-claro → verde). Aberto: barras de Duração corrida e Gasto da sprint, depois as tarefas — cada uma com etapas em etiquetas, início → fim · duração corrida e % na linha de cima, "previsto" separado à direita, barra de %, fundo na cor da sua onda, e um ícone do agente da tarefa (TL, C1, C2…, RV; clones identificados), aceso e pulsando quando o agente está executando agora;
   - agentes rodando (o que fazem, há quanto tempo, % de contexto);
   - consumo: US$ e tokens do dia, % do limite 5 h, mini-gráfico de 7 dias com tamanho fixo (sem esticar).
5. **Linha do tempo:** uma faixa por projeto, recolhível pelo nome do projeto, com barras por agente (Tech Lead, clones, Reviewer), listrado = rodando agora, contorno tracejado = fora da sprint, marcos (tarefa feita, reprovada, entregue/esperando), linha "agora"; seletor Hoje / 7 dias / Sprint funcionando sobre o mock.
6. **Ociosos:** regra — sem atividade há mais de 7 dias, ou o menos ativo quando há mais de 3 ativos; lista com última atividade e botão "Trazer para ativos" (estado só na sessão, sem salvar).

## Fora de escopo

Servidor, SQLite, dados reais, atualização automática, ações reais dos botões (Próximo passo, Trazer para ativos só mudam a tela), tema claro, novo desenho das abas de projeto além do visual (ver `docs/backlog.md` e `docs/roadmap.md`).

## Critérios de aceite

1. Menu com Bem-vindo de volta, Sala de controle, Linha do tempo e Ociosos (n); cada tela tem URL própria e recarregar mantém a tela; limite 5 h e semanal visíveis em todas.
2. Bem-vindo mostra o último comando (data/hora e chat) e, por projeto, os 5 blocos do escopo 3; links de documentos abrem a aba Documentos do projeto.
3. Sala de controle mostra, por projeto, os acordeões Timeline, Horários, Fora da sprint (quando houver) e Itens da sprint, nessa ordem, abrindo e fechando pelo teclado e pelo mouse; no mini-gantt: dependências, cor por etapa com intensidade por %, % por tarefa e "agora"; tarefas com cor de onda e ícone do agente (clone identificado, aceso quando executando), agentes com contexto e consumo com mini-gráfico sem distorção.
4. % de tarefa = etapas feitas ÷ 5; % da sprint = média das tarefas; tarefa reprovada mostra a etapa Revisão em vermelho.
5. Linha do tempo mostra barras por agente (fora da sprint com contorno tracejado), marcos e "agora"; cada faixa de projeto recolhe e abre; Hoje, 7 dias e Sprint mudam o período.
6. Ociosos segue a regra de 7 dias / máximo de 3 ativos; "Trazer para ativos" move o projeto para as telas principais.
7. Abas de projeto da S01 continuam funcionando no novo visual.
8. Em 360 px de largura não há rolagem horizontal na página (gantt e linha do tempo rolam dentro do próprio quadro).
9. `npm run build` e `npm test` passam. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (Vitest, TDD):** `src/lib/progress.ts` (% de tarefa por etapa, % da sprint, reprovada, onda da tarefa, posição no gantt a partir do plano); `src/lib/idle.ts` (regra dos 7 dias e máximo de 3 ativos, "trazer para ativos"); `src/lib/since.ts` (eventos desde o último comando); série de 7 dias.
- **Componentes (Vitest + Testing Library, jsdom):** `ProgressRow` (%, previsto separado, abre/fecha com `aria-expanded`); ícone de agente na tarefa (clone identificado, aceso só quando rodando); `Gantt` (uma linha por tarefa, % escrito, dependências desenhadas); ordem dos 4 acordeões e Fora da sprint sem %; cada tela renderiza com o mock e mostra o dado-chave do seu critério (crit. 2–6); rotas do menu (crit. 1).
- **Manual (Daniel):** os agentes não têm navegador; o Reviewer cobre por código e testes. Daniel confere o visual comparando com `S02-draft.html`, incluindo 360 px (crit. 3, 8).
- **Dados de teste:** só `src/data/mock.ts`; nada a limpar.
- Vitest roda pelo PowerShell (pasta com espaço).

## Tarefas

| Id  | Tarefa                                                                                                                                                                                                                   | Agente    | Arquivos                                                                                                                                                                                                                                                   | Depende de              | Estimativa |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------- |
| T01 | Base: visual escuro (tokens, fontes), menu com as 3 telas + Ociosos e limites, rotas (telas vazias), remoção da Visão geral, tipos e mock novos, `lib` (progress, idle, since), `ProgressRow`, `Spark` e stub de `Gantt` | tech-lead | `index.html`, `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`, `src/components/Layout.tsx`, `src/components/ProgressRow.*`, `src/components/Spark.tsx`, `src/components/Gantt.tsx` (stub), `src/data/*`, `src/lib/*`, `src/pages/Overview.*` (remover) | —                       | 40 min     |
| T02 | Tela Bem-vindo de volta                                                                                                                                                                                                  | clone     | `src/pages/Welcome.tsx`, `src/pages/Welcome.module.css`, `src/pages/Welcome.test.tsx`                                                                                                                                                                      | T01                     | 20 min     |
| T03 | Tela Sala de controle (colunas, alertas, tabela de horários, acordeão, agentes, consumo)                                                                                                                                 | clone     | `src/pages/Control.tsx`, `src/pages/Control.module.css`, `src/pages/Control.test.tsx`                                                                                                                                                                      | T01                     | 30 min     |
| T04 | Mini-gantt (componente usado pela Sala de controle)                                                                                                                                                                      | clone     | `src/components/Gantt.tsx`, `src/components/Gantt.module.css`, `src/components/Gantt.test.tsx`                                                                                                                                                             | T01                     | 25 min     |
| T05 | Tela Linha do tempo                                                                                                                                                                                                      | clone     | `src/pages/Timeline.tsx`, `src/pages/Timeline.module.css`, `src/pages/Timeline.test.tsx`                                                                                                                                                                   | T01                     | 25 min     |
| T06 | Tela Ociosos                                                                                                                                                                                                             | clone     | `src/pages/Idle.tsx`, `src/pages/Idle.module.css`, `src/pages/Idle.test.tsx`                                                                                                                                                                               | T01                     | 15 min     |
| T07 | Revisão: fidelidade ao rascunho; qualidade da apresentação, layout e código; lint/tipos/testes zerados                                                                                                                   | reviewer  | (só leitura)                                                                                                                                                                                                                                               | T02, T03, T04, T05, T06 | 20 min     |

**Paralelismo:** T01 primeiro (Tech Lead). Depois, T02–T06 em paralelo em clones, cada um só nos seus arquivos. O stub de `Gantt` (props já definidas) sai em T01, para T03 e T04 não se cruzarem: T03 só usa `<Gantt>`, T04 só o implementa. Arquivos compartilhados (`App.tsx`, `styles.css`, `src/data/*`, `src/lib/*`, `Layout`, `ProgressRow`, `Spark`) são do Tech Lead: clone que precisar de dado ou ajuste pede ao Tech Lead. Estimativas já reduzidas pelo ritmo real da S01.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-18 19:21:40 (horário de Brasília) — UTC 2026-10-18T22:21:40Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `979cf0ed7d57bcc6436836cd1cbcb90be9d6f26e45d9e22d2b7c49454d3f3b04`
- **Versão do harness:** 0.4.0
