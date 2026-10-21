# S04 — Release Report

> Sprint fechada em 2026-10-21 (6/6 tarefas, 1 ajuste).

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                                                                                                                                             | Agente          | Planejado | Início           | Fim              | Duração                |
| ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | --------- | ---------------- | ---------------- | ---------------------- |
| ✅     | T01       | Importador no formato do harness: eventos v1, `projects.json`, agentes por sessão, `usage` por `message_id`; remover o gerador de exemplo e o teste de ida e volta | tech-lead       | 15 min    | 07:29            | 07:36            | 8 min (revisão: 5 min) |
| ✅     | T02       | Leitura dos repos: plano (tarefas e ondas), lista de documentos, backlog e roadmap, só dentro de `<repo>/docs`                                                     | clone           | 13 min    | 07:29            | 07:36            | 8 min (revisão: 5 min) |
| ✅     | T03       | Estado derivado no `Data`: fase, alertas, próximo passo, eventos de texto, entrega, `lastCommand`; plano e documentos vindos da T02                                | tech-lead       | 18 min    | 07:53            | 07:56            | 4 min                  |
| ✅     | T04       | Sanitizar o markdown com DOMPurify e tirar o script `sample-events`                                                                                                | clone           | 5 min     | 07:29            | 07:36            | 8 min (revisão: 5 min) |
| ✅     | T05       | Pedido ao harness (lacunas) + spec 0001, backlog e roadmap atualizados                                                                                             | tech-lead       | 5 min     | 07:38            | 07:47            | 8 min (revisão: 2 min) |
| ✅     | T06       | Revisão: lint, tipos e testes zerados; segurança (leitura de arquivos dos repos, markdown, entrada externa); ponta a ponta com dados reais                         | reviewer (opus) | 8 min     | 07:40            | 07:47            | 7 min                  |
| ✅     | Ajuste 1  | 1 ajuste(s)                                                                                                                                                        |                 |           | 07:53            | 07:59            | 6 min                  |
| ✅     | **Total** | 6 tarefas                                                                                                                                                          |                 | 46 min    | 2026-10-21 07:29 | 2026-10-21 07:56 | 28 min                 |

## Entrega

Ao rodar `npm run dev`, o painel mostra os dados **reais** do Dashboard IA e do Main Harness: sprints, tarefas, revisões, documentos e consumo. Não precisa preparar nada antes.

- **Importador no contrato v1 do harness** (T01):
  - lê `~/.harness/events/*.jsonl` e os projetos de `~/.harness/projects.json`;
  - deduz chats e agentes pela sessão;
  - grava `usage` pelo `message_id`, sem contar em dobro com os transcripts;
  - manda linha inválida para `import_error` e conta o evento de `v` desconhecido em `import_skip`;
  - o gerador de exemplo saiu.
- **Leitura dos repos** (T02): planos (título, objetivo, tarefas, ondas), documentos, backlog e roadmap. Lê só dentro de `<repo>/docs` e recusa `..`, caminho absoluto e links para fora.
- **Estado calculado no servidor** (T03): fase, alertas, próximo passo, eventos em texto ("T02 concluída", "T01 reprovada (1/2)"), entrega da sprint e último comando.
- **Markdown limpo com DOMPurify** (T04).
- **Pedidos ao harness, spec 0001, backlog e roadmap** (T05).
  - Pedido de 2026-10-21 com os eventos que faltam: `agent.start`/`agent.end`, título do chat, comando de Daniel, `project.status`, fonte do limite e `task.phase` no contrato.
  - Pedido sobre o evento `usage`, que grava os tokens de saída a menos.
- **Ajuste 1** (retorno de Daniel), em duas partes:
  - chat ou agente sem evento de fim e parado há 30 min aparece encerrado na última atividade. O motivo: 8 sessões reais nunca gravaram `session.end`, o que deixava agentes "rodando" há mais de 3000 min;
  - o Reviewer lançado como subagente (`main-harness:reviewer`) agora aparece como Reviewer.

Commits: `e0e4d54` (T01), `5b441a8` (T02), `48931c4` (T03), `98392c0` (T04), `09b0268` (T05), `f48e1c6` (ajuste 1).

## Indicadores

| Tarefa    | Planejado | Real                   | Diferença |
| --------- | --------- | ---------------------- | --------- |
| T01       | 15 min    | 8 min (revisão: 5 min) | −7 min    |
| T02       | 13 min    | 8 min (revisão: 5 min) | −5 min    |
| T03       | 18 min    | 4 min\*                | −15 min   |
| T04       | 5 min     | 8 min (revisão: 5 min) | +3 min    |
| T05       | 5 min     | 8 min (revisão: 2 min) | +3 min    |
| T06       | 8 min     | 7 min                  | −1 min    |
| **Total** | 1 h 4 min | 41 min (soma)          |           |

\* A T03 levou 6 min na primeira passada (07:34–07:40) e mais 4 min no ajuste. O `hx` guardou só a reabertura, então o real é ~10 min.

| Indicador                                    | Valor                                                    |
| -------------------------------------------- | -------------------------------------------------------- |
| Relógio (previsto · corrido)                 | 46 min · 28 min (61%)                                    |
| Soma das tarefas (planejada · real)          | 1 h 4 min · 41 min                                       |
| Tarefas feitas                               | 6/6                                                      |
| Tokens (entrada / saída / escrita / leitura) | 292 / 61.323 / 506.064 / 15.056.644                      |
| Custo total                                  | US$ 7,37                                                 |
| Custo por agente                             | Tech Lead US$ 4,87 · clones US$ 0,76 · Reviewer US$ 1,75 |
| Retrabalho (ajustes de Daniel)               | 1 rodada · 6 min · US$ 1,45                              |
| Reprovações do Reviewer                      | 0                                                        |
| Alertas de contexto · handoffs               | 0 · 0                                                    |

## Revisão

Um único Reviewer (Opus) acompanhou a sprint toda, sempre continuado por mensagem, sem abrir outro:

- **Onda 1** (T01, T02, T04): aprovada.
- **Onda 2** (T03): aprovada. As duas sugestões dele entraram antes do commit: o comentário `shortcut:` do "ao vivo" e o plural de "ajustes".
- **T05 + T06**: aprovadas. No ponta a ponta, com uma cópia dos eventos reais em pasta temporária:
  - S01–S04 do Dashboard IA e S00–S04 do Main Harness aparecem com os títulos dos planos e 28 documentos;
  - a atualização ao vivo chega em ~1,5 s no servidor;
  - um plano com `docs/../package.json` ou com caminho absoluto foi recusado;
  - os eventos reais deram 0 `import_error`.
- **Ajuste 1**: aprovado.

Segurança: nenhum achado alto ou médio. Um achado médio era do harness, não do painel: o `usage` grava a saída do primeiro trecho da resposta. Em 274 mensagens, o evento tem 2.594 tokens de saída e o transcript tem 322.532. Virou pedido. O painel mostra o valor certo porque o transcript sobrescreve o evento.

## Retorno de Daniel

1. Agentes "rodando" há mais de 3000 min poluíam a Sala de controle e a Linha do tempo. A causa eram sessões sem `session.end`, que acontece quando o VS Code fecha de repente. Daniel perguntou se o certo não seria o fim vir num evento. Resposta:
   - para os agentes, sim: o evento já foi pedido ao harness;
   - para o chat que fecha de repente, nenhum evento chega, então a regra dos 30 min fica como rede de segurança.

   Corrigido no ajuste 1.

## Retrospectiva

- **O que foi bem:**
  - **Contratos definidos antes dos clones:** a API do `repo.ts` foi fixada no handoff. T01, T02 e T04 rodaram em paralelo, e a T03 consumiu o `repo.ts` sem retrabalho.
  - **Zero reprovações.** Na S03 foram 2, as duas por entrada externa. Os testes com a fixture de linhas reais (inválida, `v: 2`, `usage` repetido) já cobriram esses casos.
  - **Previsão de relógio:** previsto 46 min, real 28 min (61%). Antes ficava em 20–24% (S02 e S03). A calibração pela média das sprints anteriores funcionou.
- **O que pegou:**
  - **Dados reais só no fim:** o defeito dos chats "eternos" só apareceu quando Daniel olhou a tela. Os testes usavam sessões que sempre terminam. Daqui em diante, a conferência com dados reais passa a olhar também o que ficou aberto.
  - **Duração da tarefa reaberta:** o `hx task start` de uma tarefa reaberta apagou a primeira passada da T03 (6 min). Os indicadores mostram 4 min.
- **Pedidos ao harness:**
  - eventos que faltam (2026-10-21, alta);
  - `usage` com os tokens de saída finais (2026-10-21, média);
  - somar as passadas de uma tarefa reaberta (abaixo).
