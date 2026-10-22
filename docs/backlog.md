# Backlog — Dashboard IA

Pedidos do projeto. Um item por linha: `- [prioridade] data [status: SNN] — texto`. Sem status = backlog; `[planejado: SNN]` quando entra num sprint plan; `[concluído: SNN]` quando a sprint fecha.

## Itens

- [alta] 2026-10-21 [concluído: S07] — Implementar as telas escolhidas nos drafts da S06 (`drafts.html`); apagar `drafts.html` e `src/drafts` ao final:
  - **Sala de controle:** variante B (sprints recentes como abas na janela da sprint, com id + situação).
  - **Chats:** lista (variante B), mas com acabamento bem melhor que o draft.
  - **Sprints:** variante B (acordeão; a ativa aberta com as tarefas).
  - **Documentos:** variante A (ADRs e PRDs agrupados por tipo).
  - **Backlog:** tabela (A) primeiro e kanban (B) abaixo.
  - **Roadmap:** variante A dentro de uma linha do tempo; cada etapa abre (acordeão) a lista de sprints; clicar na sprint abre o plano se não estiver concluída, ou o Release Report se estiver 100%.
  - **Consumo:** no sentido da variante A, em acordeão: dia › sprints.

- [alta] 2026-10-16 — Redesenho da tela principal: mostrar o máximo de informação de cada projeto; aprofundar o layout (drafts) antes da comunicação com agentes/projetos.
- [alta] 2026-10-18 [concluído: S05] — Navegação pelos projetos (candidato à S05): entrar em cada projeto (chats, sprints, backlog/roadmap, documentos, consumo) a partir das telas principais e navegar pelos documentos dos projetos por aqui; hoje há só o menu provisório "Projetos" e os links do Bem-vindo.
- [alta] 2026-10-16 [concluído: S06] — Investigação: a fonte mais confiável para o % do limite da assinatura (5 h e semanal).
- [média] 2026-10-16 — Link para abrir no VS Code os documentos lidos dos repos (a leitura saiu na S04).
- [média] 2026-10-16 — Guardar o histórico de chats no SQLite (o Claude Code apaga transcripts antigos).
- [baixa] 2026-10-16 — Ações pelo painel (aprovar sprint, dar retorno, abrir chat).
- [baixa] 2026-10-16 — Versão online: enviador de eventos + servidor na nuvem + login.

## Pedidos ao harness (inbox do Main Harness)

- 2026-10-16 — Registro central de projetos com ID fixo (alta) — atendido (`projects.json`).
- 2026-10-16 — Gravar eventos do harness em arquivo para o Dashboard IA (alta) — atendido (contrato v1).
- 2026-10-21 — Eventos que faltam para a Sala de controle: `agent.start`/`agent.end`, título do chat, comando de Daniel, `project.status`, fonte do limite; `task.phase` no contrato (alta, completa o B032).
