# S13 — Release Report

> Entregue em 2026-11-04; Daniel confirmou em 2026-11-05 ("tudo parece ok").

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                               | Agente         | Planejado  | Início           | Fim              | Duração                             |
| ------ | --------- | ---------------------------------------------------- | -------------- | ---------- | ---------------- | ---------------- | ----------------------------------- |
| ✅     | T01       | Limite: estimativa desde o último valor e no reset   | clone (sonnet) | 25 min     | 22:38            | 22:43            | 3 min (fila: 0 min, revisão: 1 min) |
| ✅     | T05       | ADR da calibração dos limites                        | clone (haiku)  | 6 min      | 22:39            | 22:43            | 1 min (fila: 3 min, revisão: 1 min) |
| ✅     | T02       | Servidor: consumo por tipo em sprint, tarefa, agente | clone (sonnet) | 28 min     | 22:44            | 22:51            | 5 min (fila: 1 min, revisão: 1 min) |
| ✅     | T03       | Sala de controle: %, US$ e tokens por tipo           | clone (sonnet) | 20 min     | 22:51            | 22:58            | 4 min (fila: 2 min, revisão: 1 min) |
| ✅     | T04       | Tela Consumo: tipos e acordeão por sprint            | clone (sonnet) | 20 min     | 22:51            | 22:58            | 5 min (fila: 1 min, revisão: 1 min) |
| ✅     | Ajuste 1  | 1 ajuste(s)                                          |                |            | 08:00            | 08:22            | 22 min                              |
| ✅     | **Total** | 5 tarefas                                            |                | 1 h 13 min | 2026-11-04 22:38 | 2026-11-04 22:58 | 20 min                              |

## Entrega

O limite do Claude deixou de travar e de passar de 100%: a estimativa soma o gasto desde a última leitura (marcada "estimado"), recomeça do zero depois do reset, vale também para a semana e mostra 100% quando há turno de limite. As constantes (US$ 30 na janela de 5 h, US$ 227 na semana) vêm da calibração registrada na ADR 0002. Sprint, tarefa e agente agora mostram %, US$ e tokens por tipo (entrada, saída, cache lido, cache escrito) na Sala de controle e na tela Consumo, que ganhou o acordeão "Por sprint". Suíte com 203 testes, zero erros e zero avisos de lint e tipos.

## Indicadores

| Indicador                                             | S13                                    | S12                       |
| ----------------------------------------------------- | -------------------------------------- | ------------------------- |
| Soma das tarefas (planejada · real)                   | 1 h 39 min · 18 min (18%)              | 55 min · 1 h 3 min (115%) |
| Relógio (previsto · corrido)                          | 1 h 13 min · 20 min                    | 20 min · 55 min           |
| Trabalho · espera por Daniel                          | 3 min · 9 h 33 min                     | 34 min · 8 h 4 min        |
| Custo total                                           | US$ 3,82 (Sonnet 3,82 · Haiku 0,00)    | US$ 5,12                  |
| Tokens (entrada / saída / cache escrito / cache lido) | 266 / 71 mil / 541 mil / 8,26 mi       | —                         |
| Reprovações do Reviewer                               | 0                                      | 1                         |
| Ajustes pedidos por Daniel                            | 2 no mesmo retorno (22 min · US$ 0,72) | 1 (8 min · US$ 0,59)      |
| Alertas de contexto · handoffs                        | 1 · 1                                  | 1 · 1                     |

## Revisão

- **Onda 1 (T01, T05), onda 2 (T02), onda 3 (T03, T04):** todas aprovadas na primeira revisão, sem reprovação. Achados opcionais do Reviewer, não feitos: unificar o `pct` de Usage com `formatPct`, constante compartilhada dos quatro tipos, `<th scope="row">` na tabela de Usage.
- **Ajustes após a entrega:** não passaram pelo Reviewer; cobertos por teste novo, lint e tipos.
- **Conferência visual:** feita por Daniel na tela real.

## Retorno de Daniel

1. **Botão da seta do card "Agentes" sumia ao expandir:** a condição escondia o botão quando a lista expandida cabia inteira. Corrigido (`b5d6948`), com teste que reproduz o caso.
2. **Tarefas sem entrada/saída/cache:** duas causas. No código, as tarefas do Tech Lead herdavam o uso do chat inteiro (todas iguais); agora usam a janela início–fim (`6b26fa2`). Na prática, o servidor em execução tinha subido antes da sprint e ainda rodava o código antigo; o `r` do console reinicia só a tela (Vite), não o servidor. Depois de reiniciar, funcionou.
3. **Na entrega:** "tudo parece ok, inclusive a seta no card agentes".

## Retrospectiva

- **O que foi bem:** cinco tarefas em três ondas, sem reprovação e sem conflito de arquivo. Real em 18% do planejado, bem abaixo do fator de 40% usado: tarefas de leitura e apresentação de dado já existente saem rápidas; vale baixar o fator para esse tipo.
- **O que pegou:**
  - **Servidor antigo na tela, de novo:** é a segunda sprint seguida em que parte do retorno foi servidor sem reiniciar (S12 e S13). Falta um aviso no painel quando o código em execução é mais velho que o último commit, e o `r` do `npm run dev` não reinicia o servidor.
  - **Teste não via o caso real:** o consumo da tarefa foi testado só com agente de clone; o caso do Tech Lead (agente = chat inteiro) escapou até o dado real. Sprint de dado novo pede um teste com dado real na revisão.
  - **Escopo da T03:** `TaskTable` fica em `ui.tsx`, fora da lista de arquivos; foi preciso liberar na hora.
  - **Espera por Daniel:** 9 h 33 min contra 3 min de trabalho, normal para entrega à noite.
- **Pedidos ao harness (inbox):** nenhum novo. O aviso de servidor desatualizado é do painel (dashboard-ia), não do harness.
