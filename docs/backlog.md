# Backlog — Dashboard IA

Pedidos do projeto. Um item por linha: `- [prioridade] data [status: SNN] — texto`. Sem status = backlog; `[planejado: SNN]` quando entra num sprint plan; `[concluído: SNN]` quando a sprint fecha.

## Itens

- [alta] 2026-11-07 [planejado: S15] — Repensar como o painel exibe o consumo (por agente, não por tarefa; tarefa sem clone próprio nos eventos fica sem consumo). Pauta da S15, com Daniel.
  - Ideia de Daniel (2026-11-07): trocar a coluna "Consumo" da tabela de tarefas por um ícone por agente que participou, com 4 números pequenos (entrada, saída, cache lido, cache escrito); fora do ícone, soma de tokens, % das 5 h e % da semana. Pediu 3 modelos de apresentação.
  - Repensar o card "Agentes" por inteiro: hoje não mostra em quais tarefas cada agente participou nem quantas vezes.
- [alta] 2026-11-07 [S14] — Tabela "Tarefas da sprint": com descrições longas (caso do financeiro) a coluna Consumo fica espremida e os rótulos (Entrada/Saída/Cache lido/Cache escrito) se sobrepõem. Dar espaço à coluna (limitar/truncar a descrição, ou rótulos em coluna).
- [alta] 2026-10-21 [concluído: S07] — Implementar as telas escolhidas nos drafts da S06 (`drafts.html`); apagar `drafts.html` e `src/drafts` ao final:
  - **Sala de controle:** variante B (sprints recentes como abas na janela da sprint, com id + situação).
  - **Chats:** lista (variante B), mas com acabamento bem melhor que o draft.
  - **Sprints:** variante B (acordeão; a ativa aberta com as tarefas).
  - **Documentos:** variante A (ADRs e PRDs agrupados por tipo).
  - **Backlog:** tabela (A) primeiro e kanban (B) abaixo.
  - **Roadmap:** variante A dentro de uma linha do tempo; cada etapa abre (acordeão) a lista de sprints; clicar na sprint abre o plano se não estiver concluída, ou o Release Report se estiver 100%.
  - **Consumo:** no sentido da variante A, em acordeão: dia › sprints.

- [alta] 2026-10-22 [concluído: S09] — Revamp total do frontend: visual, navegação e layout, tela principal e componentes base (drafts de 3 direções na S08, aplicação na S09).
- [alta] 2026-10-22 [concluído: S09] — S09: aplicar a direção C escolhida na S08 (`drafts.html` › C) em todas as telas e apagar `drafts.html` e `src/drafts`:
  - **Tema escuro como padrão** (hoje o draft abre no claro).
  - **Backlog e Roadmap:** novo formato de exibição (o draft só mostra o markdown).
  - **Consumo** como item do projeto (ficou fora do draft).
  - **Dados que faltam** (hoje "exemplo" no draft): espera por resposta de Daniel, espera de limite de sessão, custo/tokens por agente, estado do agente vindo do harness, id do agente na tarefa, tarefas tocadas por agente.
  - A faixa de notas do draft e o seletor A/B/C não entram na versão final.
- [alta] 2026-10-16 [concluído: S09] — Redesenho da tela principal: mostrar o máximo de informação de cada projeto; aprofundar o layout (drafts) antes da comunicação com agentes/projetos.
- [alta] 2026-10-18 [concluído: S05] — Navegação pelos projetos (candidato à S05): entrar em cada projeto (chats, sprints, backlog/roadmap, documentos, consumo) a partir das telas principais e navegar pelos documentos dos projetos por aqui; hoje há só o menu provisório "Projetos" e os links do Bem-vindo.
- [alta] 2026-10-16 [concluído: S06] — Investigação: a fonte mais confiável para o % do limite da assinatura (5 h e semanal).
- [média] 2026-10-16 [descartado: 2026-10-28] — Link para abrir no VS Code os documentos lidos dos repos (a leitura saiu na S04). Ler no painel basta.
- [média] 2026-10-16 [planejado: S12] — Guardar o histórico de chats no SQLite (o Claude Code apaga transcripts antigos).
- [baixa] 2026-10-16 — Ações pelo painel (aprovar sprint, dar retorno, abrir chat).
- [baixa] 2026-10-28 — Otimizar a estrutura dos documentos (planos, ADRs, PRDs, Release Reports) para leitura na web, no painel.
- [baixa] 2026-10-16 — Versão online: enviador de eventos + servidor na nuvem + login.
- [alta] 2026-10-27 [planejado: S11] — (do Main Harness) Modelo por tarefa: mostrar em cada tarefa da sprint o modelo que a executou (Opus, Sonnet, Gemini) e o agente (tech-lead, clone, gemini, reviewer). Fonte: campo `model` nos eventos `task.*` (harness v0.10.0, S11; ver `docs/contracts/events.md` do harness) e `worker.start/end`.
- [alta] 2026-10-27 [planejado: S11] — (do Main Harness) Tokens por modelo em cada sprint: entrada, saída, cache e US$ estimado por modelo, com o Gemini à parte ("fora do Claude", US$ 0). Fonte: eventos `usage` (já trazem `model`, sprint e tarefa).

- [alta] 2026-11-04 [planejado: S13] — Bug: perto do limite semanal o painel trava antes de 100%; depois que o limite volta mostra ~150%. Estimar pelo gasto desde o último valor e desde o reset; recalibrar (5 h ≈ US$ 30, semana ≈ US$ 227).
- [alta] 2026-11-04 [planejado: S13] — Consumo em %, US$ e tokens por tipo (entrada, saída, cache lido, cache escrito) por sprint, tarefa e agente, na Sala de controle e na tela Consumo, com acordeão "Por sprint".
- [alta] 2026-11-07 [planejado: S14] — Projeto financeiro no painel: tarefas só aparecem quando começam, consumo não contabilizado, "Plano no tempo" vazio e "Andamento" sem informação (leitor de plano não entende o formato do financeiro; tarefas do Tech Lead sem consumo).
- [média] 2026-11-05 [planejado: S14] — Aviso no painel quando o servidor em execução é mais velho que o último commit (retro S13).

## Pedidos ao harness (inbox do Main Harness)

- 2026-10-16 — Registro central de projetos com ID fixo (alta) — atendido (`projects.json`).
- 2026-10-16 — Gravar eventos do harness em arquivo para o Dashboard IA (alta) — atendido (contrato v1).
- 2026-10-21 — Eventos que faltam para a Sala de controle: `agent.start`/`agent.end`, título do chat, comando de Daniel, `project.status`, fonte do limite; `task.phase` no contrato (alta, completa o B032).
- 2026-10-22 — Roadmap atualizado no fechamento da sprint (alta).
- 2026-10-22 — Reviewer com um nome só nos eventos (média).
- 2026-10-22 — `hx task phase` em tarefa reaberta por ajuste (média).
