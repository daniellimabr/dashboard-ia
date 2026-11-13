# S14 — Avisos do painel: plano fora do padrão e servidor desatualizado

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.15.0
- **Status:** aguardando aprovação

## Objetivo

O painel deixa de falhar em silêncio: quando o plano de um projeto não está no padrão do harness (caso do financeiro) ou quando o servidor em execução é mais velho que o último commit, mostra um aviso claro.

## Diagnóstico (retorno de Daniel, 2026-11-07)

Pedido: "tarefas só aparecem quando começam, não contabiliza consumo, plano no tempo vazio, andamento sem informação" no financeiro. Causa: os planos S52–S54 do financeiro estão **fora do padrão do harness** (cabeçalho `#`, sem `Depende de`/`Planejado`, ondas em prosa) e os eventos trazem `tech-lead` em todos os agentes. **Decisão de Daniel:** o painel não se adapta; o projeto e o harness é que devem seguir o padrão (ver `docs/decisoes-daniel.md`). Pedido ao harness já aberto no inbox (plano padrão validado na aprovação; clones com agente próprio nos eventos). Correção no financeiro é feita lá, pelo Tech Lead daquele projeto.

O que cabe ao painel: não esconder o problema. Hoje plano ilegível vira "0 tarefas" sem explicação. E, pela retro da S13, parte do retorno veio de servidor antigo.

## Escopo

1. **Aviso de plano fora do padrão (T01):** quando o arquivo do plano da sprint existe mas o leitor extrai 0 tarefas, ou tarefas sem minutos planejados, o projeto mostra um alerta (`alerts`, já exibido no "Andamento") do tipo "Plano fora do padrão do harness: 0 tarefas lidas em S54-plan.md" / "N tarefas sem minutos planejados". Nenhuma mudança de leitura do plano.
2. **Aviso de servidor desatualizado (T02):** o servidor informa a hora em que subiu e a hora do último commit do repo do painel; se o commit é mais novo, o painel mostra "Servidor desatualizado: reinicie" na barra lateral.

## Fora de escopo

- Tolerar outros formatos de plano e estimar consumo do Tech Lead (descartado por Daniel).
- Alterar o financeiro ou o harness (pedido via inbox).
- Reiniciar o servidor automaticamente.

## Critérios de aceite

1. Plano com tabela `#` (fixture do financeiro) → alerta "plano fora do padrão" no projeto; plano no padrão → sem alerta.
2. Servidor mais velho que o último commit → aviso visível; caso contrário ou falha ao ler o git → sem aviso.
3. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** `server/repo.test.ts`/`server/data.test.ts` com fixture no formato do financeiro (novo `S00-hash-plan.md`): alerta presente; fixtures atuais: ausente. Conferir com o `S54-plan.md` real.
- **T02:** `server/http.test.ts`, `src/components/Layout.test.tsx`: aviso com commit mais novo; sem aviso nos demais casos.
- **Manual (Daniel):** financeiro mostra o alerta; servidor reiniciado, sem aviso de servidor.

## Tarefas

| Id  | Tarefa                          | Agente         | Arquivos                                                                                                                                      | Depende de | Bruta  | Planejado |
| --- | ------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Alerta de plano fora do padrão  | clone (sonnet) | `server/repo.ts`, `server/repo.test.ts`, `server/data.ts`, `server/data.test.ts`, `server/fixtures/repo/docs/sprints/S00-hash-plan.md` (novo) | —          | 40 min | 16 min    |
| T02 | Aviso de servidor desatualizado | clone (sonnet) | `server/http.ts`, `server/http.test.ts`, `server/main.ts`, `src/data/types.ts`, `src/components/Layout.tsx`, `src/components/Layout.test.tsx` | —          | 40 min | 16 min    |

**Ondas:** (1) T01, T02

- T01 e T02 não cruzam arquivos (T01 usa o `alerts` existente, sem tocar `types.ts`). T02 chama `frontend-design` antes do código.
- **Reviewer** (Sonnet) revisa ao fim da onda, com conferência contra o `S54-plan.md` real do financeiro. Handoffs listam os casos de erro (plano ausente, sem tabela, git indisponível).

**Fator:** ~40%. **Total estimado:** 32 min calibrado (80 min bruto).

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-07 13:59:09 (horário de Brasília) — UTC 2026-11-07T16:59:09Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `e3c8201b79639253fdd127887094483c2bbb33415c573a01ed9ea6920b11e0c7`
- **Versão do harness:** 0.15.0
