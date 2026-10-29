# S12 — Release Report

> Entregue e aprovada por Daniel em 2026-10-29.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                      | Agente         | Planejado | Início           | Fim              | Duração                               |
| ------ | --------- | ------------------------------------------- | -------------- | --------- | ---------------- | ---------------- | ------------------------------------- |
| ✅     | T01       | Gráfico com horário real e grupo "Sem onda" | clone (sonnet) | 20 min    | 23:25            | 00:20            | 27 min (fila: 20 min, revisão: 9 min) |
| ✅     | T02       | Ondas com letra no plano (`(3b)`)           | gemini         | 10 min    | 23:25            | 00:20            | 3 min (fila: 44 min, revisão: 9 min)  |
| ✅     | T03       | Tirar a barra "ctx" dos agentes             | clone (sonnet) | 5 min     | 23:25            | 00:20            | 8 min (fila: 39 min, revisão: 9 min)  |
| ✅     | T04       | Banco: preservar linhas ao subir a versão   | clone (opus)   | 20 min    | 23:25            | 00:20            | 26 min (fila: 21 min, revisão: 9 min) |
| ✅     | Ajuste 1  | 1 ajuste(s)                                 |                |           | 08:01            | 08:09            | 8 min                                 |
| ✅     | **Total** | 4 tarefas                                   |                | 20 min    | 2026-10-28 23:25 | 2026-10-29 00:20 | 55 min                                |

## Entrega

O gráfico "Plano no tempo" da Sala de controle usa o horário real das tarefas (barra do início ao fim reais; tarefa a fazer tracejada, empurrada para depois de "agora"). Tarefas sem onda ficam no grupo "Sem onda". O leitor de plano entende ondas com letra (`(3b)`) e numera pela ordem de aparição. A barra "ctx" saiu dos agentes. O banco agora mantém as linhas ao subir a versão (tabelas reconstruídas dentro de uma transação) e corrige o início das sprints já gravadas. Após o retorno de Daniel, o eixo do gráfico mostra a data acima da hora quando a sprint passa de um dia, e as tabelas e dicas também. Suíte com 184 testes, zero erros e zero avisos de lint e tipos.

## Indicadores

| Indicador                           | S12                                | S11                       |
| ----------------------------------- | ---------------------------------- | ------------------------- |
| Soma das tarefas (planejada · real) | 55 min · 1 h 3 min (115%)          | 1 h 35 min · 30 min (32%) |
| Relógio (previsto · corrido)        | 20 min · 55 min                    | 1 h 10 min · 34 min       |
| Trabalho · espera por Daniel        | 34 min · 8 h 4 min                 | —                         |
| Custo total                         | US$ 5,12 (Sonnet 3,04 · Opus 2,08) | US$ 4,58                  |
| Reprovações do Reviewer             | 1                                  | 1                         |
| Ajustes pedidos por Daniel          | 1 (8 min · US$ 0,59)               | 1 (4 min · US$ 0,23)      |
| Alertas de contexto · handoffs      | 1 · 1                              | 0 · 0                     |

## Revisão

- **Onda 1 (T01–T04):** T01 reprovada uma vez: no banco real o `started_at` da sprint estava errado (guardava a última reabertura, não a primeira), e o eixo crescia numa sprint já entregue. Corrigido com a versão 9 do banco (refaz o início pelo primeiro `sprint.open`) e o eixo fixo no fim da sprint; aprovada na re-revisão. T02, T03 e T04 aprovadas. Achado baixo na T03 (coluna vazia de 64 px) corrigido.
- **Ajuste após a entrega:** não passou pelo Reviewer; coberto por teste novo, lint e tipos.
- **Conferência visual:** a tela foi vista por Daniel (print do eixo com datas sobrepostas, que levou ao formato data em cima e hora embaixo).

## Retorno de Daniel

1. **T08 e T09 do 6thGear sem onda:** o servidor em execução tinha subido antes da sprint e ainda lia o plano com o código antigo, que não entende `(3b)`. Nada a corrigir no código; basta reiniciar. O plano real do 6thGear ganhou `(3c)` e agora tem 7 ondas (o critério "onda N de 6" ficou desatualizado).
2. **Dia na timeline:** exibir a data quando as tarefas passam de um dia. Feito; depois do print, a hora ficou embaixo da data. A página Timeline (Hoje/Sprint) mostra o dia na mesma linha da hora.
3. **Na entrega:** "aprovado".

## Retrospectiva

- **O que foi bem:** quatro tarefas em um só turno, três delas em paralelo sem conflito de arquivo. A revisão pegou o erro mais caro (início da sprint errado no banco real) antes de Daniel ver. Migração agora preserva dados, com testes de troca de versão, rollback e backfill.
- **O que pegou:**
  - **Estimativa:** real em 115% do planejado, o oposto das sprints S10 e S11 (46% e 32%). Tarefas de banco e de gráfico com dado real custam mais; o fator de 60% não vale para elas.
  - **Plano com Gemini:** a T02 foi planejada para o `gemini`, desligado pela ADR 0014. Tive de executar eu mesmo. O template do plano ainda aceita esse agente.
  - **Servidor antigo na tela:** o retorno 1 foi só servidor sem reiniciar. Falta um aviso no painel quando o código em execução é mais velho que o commit.
  - **Espera por Daniel:** 8 h 4 min contra 34 min de trabalho, normal para entrega à noite.
  - **Mock desatualizado:** remover um campo (`contextPct`) exigiu editar `mock.ts`, fora da lista de arquivos da tarefa.
- **Pedidos ao harness (inbox):**
  - Template e validação do `sprint-plan` recusarem o agente `gemini` (ADR 0014): 1 de 4 tarefas da S12 foi planejada para um agente desligado.
