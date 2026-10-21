# S01 — Primeira `sprint` de teste

- **Projeto:** fixture

## Objetivo

Testar o leitor de planos
em duas linhas.

Segundo parágrafo, fora do objetivo.

## Tarefas

| Id  | Tarefa                | Agente          | Arquivos     | Depende de | Bruta  | Planejado |
| --- | --------------------- | --------------- | ------------ | ---------- | ------ | --------- |
| T01 | Base do `server/a.ts` | tech-lead       | `server/a`   | —          | 30 min | 15 min    |
| T02 | Segunda               | clone           | `server/b`   | T01        | 20 min | 1 h 5 min |
| T03 | Terceira              | clone           | `server/c`   | T01, T02   | 20 min | 2 h       |
| T04 | Revisão               | reviewer (opus) | (só leitura) | T01–T03    | 10 min |           |

**Paralelismo:** onda 1 = T01 (Tech Lead) e T02 em clone. Onda 2 = T03. Revisão = T04 com Opus.
