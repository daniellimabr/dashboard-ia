# S08 — Release Report

> Sprint fechada em 2026-10-22. Objetivo: 3 direções completas para o novo frontend, dentro do app e com os dados reais, para Daniel escolher. **Escolhida: direção C (Espaço de trabalho)**, refinada em 5 rodadas de ajuste.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Moldura dos drafts (seletor A/B/C e de tela) | tech-lead | 7 min | 11:07 | 13:06 | 4 min (fila: 12 min, revisão: 3 min) |
| ✅ | T02 | Direção A — Operação densa | clone | 20 min | 11:07 | 13:06 | 13 min (fila: 3 min, revisão: 3 min) |
| ✅ | T03 | Direção B — Editorial limpo | clone | 20 min | 11:07 | 13:06 | 13 min (fila: 2 min, revisão: 3 min) |
| ✅ | T04 | Direção C — Espaço de trabalho | clone | 20 min | 11:07 | 13:06 | 14 min (fila: 2 min, revisão: 3 min) |
| ✅ | T05 | Revisão da onda (lint, tipos, testes, critérios) | reviewer | 7 min | 13:02 | 13:06 | 4 min |
| ✅ | Ajuste 1 | 1 ajuste(s) |  |  | 13:32 | 13:56 | 25 min |
| ✅ | Ajuste 2 | 1 ajuste(s) |  |  | 13:56 | 14:17 | 21 min |
| ✅ | Ajuste 3 | 1 ajuste(s) |  |  | 14:17 | 14:30 | 13 min |
| ✅ | Ajuste 4 | 1 ajuste(s) |  |  | 14:30 | 14:37 | 7 min |
| ✅ | Ajuste 5 | 1 ajuste(s) |  |  | 14:37 | 14:53 | 15 min |
| ✅ | **Total** | 5 tarefas |  | 27 min | 2026-10-22 11:07 | 2026-10-22 13:06 | 19 min (pausas: 1 h 40 min) |

## Entrega

- **Moldura (T01):** `drafts.html` com seletor A/B/C e de tela; acha as direções sozinha (`import.meta.glob` de `src/drafts/*/index.tsx`) e usa o mesmo `DataProvider` do painel. O painel em `/` não mudou.
- **Direção A (T02):** console escuro azul-ardósia, números em mono, um projeto por linha densa.
- **Direção B (T03):** revista técnica clara, uma fonte só (Bricolage Grotesque), % gigante por projeto.
- **Direção C (T04) — escolhida:** menu lateral verde-pinho com projetos sempre à vista, conteúdo em painéis. Após os ajustes de Daniel:
  - **Menu lateral:** blocos Telas (Início, Sala de controle, Linha do tempo, Ociosos, Componentes), Itens do projeto (Chats, Sprints, Backlog, Roadmap, Documentos) e Projetos. O acordeão de cada projeto mostra as 5 sprints e os 5 chats sem sprint mais recentes, com status e reticências. Só a navegação rola; os limites 5 h/semanal e o tema ficam fixos no pé.
  - **Sala de controle:** Andamento, Plano no tempo, Agentes e Consumo numa linha de 4 cards da mesma altura. Plano no tempo no modelo do gantt atual, com linha de pausas (ocioso, espera de resposta, espera de limite). Lista de tarefas por onda com cor, horários, duração, contador, passos nomeados, agente e barra com o número dentro (`showValue`, opcional). Agentes com status, tarefas, custo, máximo de 4 e seta para expandir ("x/y ativos"). Consumo com título e tooltip US$/tokens.
  - **Linha do tempo:** no modelo do painel atual, com os agentes agrupados por sprint ou chat avulso.
  - **Geral:** barra de rolagem fina em tudo; sem rolagem horizontal da página; título da aba "Dashboard IA: <tela>".
- **Fora dos drafts:** o nome passou de "Painel IA" para **Dashboard IA** em todo o app, e o app ganhou ícone (`public/favicon.svg`).

## Indicadores

| Tarefa | Planejado | Real | Diferença |
|---|---|---|---|
| T01 | 7 min | 4 min (fila: 12 min, revisão: 3 min) | −3 min |
| T02 | 20 min | 13 min (fila: 3 min, revisão: 3 min) | −7 min |
| T03 | 20 min | 13 min (fila: 2 min, revisão: 3 min) | −7 min |
| T04 | 20 min | 14 min (fila: 2 min, revisão: 3 min) | −6 min |
| T05 | 7 min | 4 min | −3 min |
| **Total** | 1 h 14 min | 48 min (soma) | |

| Indicador | Valor |
|---|---|
| Relógio (previsto · corrido) | 27 min · 19 min (70%) |
| Pausas fora do corrido | 1 h 40 min (limite de uso, 11:11–12:57) |
| Trabalho · espera por Daniel | 9 min · 1 h 38 min |
| Tarefas feitas | 5/5 |
| Tokens (entrada / saída / cache escrito / lido) | 750 / 242.646 / 2.197.339 / 35.811.118 |
| Custo total | US$ 23,05 |
| Custo por agente | Tech Lead US$ 5,51 · clones US$ 16,36 · Reviewer US$ 1,18 |
| Retrabalho (ajustes de Daniel) | 5 rodadas · 1 h 21 min · US$ 14,15 (61% do custo) |
| Reprovações do Reviewer | 0 |
| Alertas de contexto · handoffs | 0 · 0 |

## Revisão

- **Onda 1 (Sonnet, T01–T04):** todas aprovadas de primeira; projeto inteiro 171/171 testes, lint e tipos zerados; tokens escopados em cada direção (sem `:root`). Única questão: B e C chamam o POST real de promover projeto; aceito (mesmo endpoint do painel, id com `encodeURIComponent`).
- **Ajustes 1–5 (mesmo Reviewer, via SendMessage):** todos aprovados; suíte final 187/187. Uma falha intermitente no `Control.test.tsx` na rodada 4 veio de um clone editando o arquivo ao mesmo tempo, não se repetiu.
- **Limite comum:** nenhuma revisão abriu o app no navegador. Os defeitos de layout (vazio sob os cards, vão ao lado dos limites, rolagem horizontal) só foram vistos por Daniel.

## Retorno de Daniel

1. **Escolha:** direção C, com ajustes na Sala de controle (cards, gantt, tarefas, agentes, consumo), Linha do tempo e Ociosos visíveis, e itens do projeto (Chats, Backlog, Roadmap, Documentos) no menu.
2. **Layout:** 4 cards numa linha da mesma altura; Plano no tempo no modelo do gantt atual; 5 chats sem sprint; rolagem fina; reticências.
3. **Linha do tempo** no modelo atual, agrupada por sprint ou chat; rolagem fina em tudo; limites sempre visíveis no menu.
4. **Agentes** com no máximo 4 (ativos primeiro); sem rolagem horizontal em 1920x1080.
5. **Nome Dashboard IA**, título da aba por tela, ícone, e "x/y ativos" com seta no card Agentes.
- **Para a S09** (no backlog): tema escuro como padrão; novo formato de Backlog e Roadmap; Consumo no projeto; dados que hoje são "exemplo" (esperas, custo e estado por agente).

## Retrospectiva

- **O que foi bem:**
  - **Drafts como decisão:** 3 direções completas em ~14 min de agente cada; Daniel escolheu na primeira olhada e o resto da sprint foi refinar a escolhida.
  - **Clones com contexto:** os mesmos 2 clones (Sala de controle e navegação) atenderam as 5 rodadas via SendMessage, sem reler o repo e sem conflito de arquivo. Pedidos de Daniel no meio da rodada entraram na mesma versão.
  - **Estimativa:** fator de 35% ainda acima do real (48 min de soma para 1 h 14 min); ~30% cabe para drafts.
- **O que pegou:**
  - **Retrabalho alto:** 5 rodadas, US$ 14,15 (61% do custo), contra 1 rodada na S07 e 3 na S06. Parte é natural (refinar a escolhida era o objetivo da S08), mas 3 das 5 rodadas trouxeram defeitos de layout que um olho no navegador pegaria antes: vazio sob os cards, vão e vazamento no menu, rolagem horizontal.
  - **Interpretação errada:** no ajuste 2, "Linha do tempo" virou o gráfico Plano no tempo, e custou a rodada 3. Quando Daniel cita uma tela pelo nome, usar o nome do menu, e perguntar em uma linha se houver dúvida.
  - **Limite de uso:** os 3 clones pararam às 11:11; a retomada automática (tarefa do Agendador) abriu o PowerShell às 12:50 mas não retomou nada. 1 h 40 min parados até Daniel escrever. Pedido já aberto no inbox.
  - **`hx task phase` em tarefa reaberta por ajuste** continua falhando ("T04 não está em andamento"), como na S07.
- **Pedidos ao harness (inbox):**
  - Retomada automática após limite de uso não funcionou no Windows (aberto durante a sprint).
  - Conferência visual no navegador (print em 1920x1080, claro e escuro) pelo Reviewer ou pelo clone em tarefas de tela (novo).
