# S00 — Ondas em lista

## Tarefas

| Id  | Tarefa   | Agente    | Depende de |
| --- | -------- | --------- | ---------- |
| T01 | Primeira | tech-lead | —          |
| T02 | Segunda  | clone     | —          |
| T03 | Terceira | clone     | —          |
| T04 | Quarta   | clone     | T03        |
| T05 | Quinta   | reviewer  | T01–T04    |

- **Onda 1:** T01 (Tech Lead) e T02 (clone). Contrato fixo entre T02 e T04.
- **Onda 2:** T03–T04 em clones, depois de T02. Nada cruza.
- **Onda 3:** T05, Reviewer.
