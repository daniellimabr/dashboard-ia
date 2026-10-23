# S00 — Ondas numeradas

## Tarefas

| Id  | Tarefa   | Agente    | Depende de |
| --- | -------- | --------- | ---------- |
| T01 | Primeira | tech-lead | —          |
| T02 | Segunda  | clone     | —          |
| T03 | Terceira | clone     | —          |
| T04 | Quarta   | clone     | T03        |
| T06 | Sexta    | clone     | —          |
| T07 | Sétima   | clone     | T02        |
| T08 | Oitava   | reviewer  | —          |

<!-- as written in 6thGear: no blank line after **Ondas:** -->
**Ondas:**
1. T01, T02, T03 em paralelo.
2. T04, T06 e T07 em paralelo (T07 só precisa da T02).
O Reviewer revisa uma vez por onda.

## Riscos

1. T08 não tem onda: esta lista fica fora do bloco de ondas.
