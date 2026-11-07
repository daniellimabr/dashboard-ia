# S15 — Release Report

> Entregue em 2026-11-07; Daniel confirmou em 2026-11-07 ("acho que agora ficou muito bom"), depois de 3 ajustes de retorno.

## Execução

Horários de Brasília (UTC−3). ✅ feita.

| Status | Id        | Tarefa                                         | Agente         | Planejado | Início           | Fim              | Duração                             |
| ------ | --------- | ---------------------------------------------- | -------------- | --------- | ---------------- | ---------------- | ----------------------------------- |
| ✅     | T01       | Participação por agente nas tarefas (dados)    | clone (sonnet) | 16 min    | 17:23            | 17:34            | 6 min (fila: 1 min, revisão: 4 min) |
| ✅     | T02       | Card Agentes: consumo em linha e chips de onda | clone (sonnet) | 24 min    | 17:34            | 18:12            | 6 min (fila: 1 min, revisão: 8 min) |
| ✅     | T03       | Tabela de tarefas: só os ícones dos agentes    | clone (sonnet) | 12 min    | 17:43            | 17:47            | 3 min (fila: 0 min, revisão: 2 min) |
| ✅     | Ajuste 1  | Custo do tipo de token sobreposto no card      | tech-lead      |           | 17:55            | 17:55            | 0 min                               |
| ✅     | Ajuste 2  | Custo por tipo também no card Consumo          | tech-lead      |           | 17:55            | 17:55            | 0 min                               |
| ✅     | Ajuste 3  | Agentes repetidos: agrupar por papel           | tech-lead      |           | 17:55            | 18:12            | 17 min                              |
| ✅     | **Total** | 3 tarefas                                      |                | 52 min    | 2026-11-07 17:23 | 2026-11-07 18:12 | 49 min                              |

## Entrega

O consumo passou a ser mostrado **por agente**, onde dá para medir. O card Agentes mostra, por papel, a barra da parte do gasto, os 4 tipos de token lado a lado (volume e US$ de cada um, na cor do tipo), o total (Σ tokens, US$, % das 5 h, % da semana) e os chips das tarefas na cor da onda. A tabela de tarefas deixou de mostrar consumo: traz só a coluna "Participaram", com o ícone de cada agente (`×N` quando houve mais de uma passada).

Nos ajustes: o custo de cada tipo de token ficou em linha própria, sem sobrepor o vizinho nem o limite do card; o card Consumo ganhou o US$ por tipo da sprint (o servidor devolve `Sprint.costByKind`); e o card Agentes agrupa por papel ("Clone ×3", "Reviewer ×3") com o contador "N/M ativos" contando os agentes reais. Lint e tipos com zero erros e zero avisos; 219 testes passando.

## Indicadores

| Indicador                                             | S15                                            | S14                                            |
| ----------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| Soma das tarefas (planejada · real)                   | 52 min · 16 min (31%)                          | 32 min · 9 min (28%)                           |
| Relógio (previsto · corrido)                          | 52 min · 50 min                                | 16 min · 11 min                                |
| Trabalho · espera por Daniel                          | 6 min · 43 min                                 | 3 min · 29 min                                 |
| Custo total                                           | US$ 4,09 (Sonnet)                              | US$ 1,64 (Sonnet)                              |
| Custo por tarefa                                      | T01 1,03 · T02 1,19 · T03 0,53                 | —                                              |
| Custo por agente                                      | Tech Lead 1,16 · executor 2,34 · reviewer 0,59 | Tech Lead 0,71 · executor 0,66 · reviewer 0,27 |
| Tokens (entrada / saída / cache escrito / cache lido) | 282 / 79 mil / 522 mil / 9,19 mi               | 122 / 27 mil / 224 mil / 3,62 mi               |
| Reprovações do Reviewer                               | 0                                              | 0                                              |
| Ajustes pedidos por Daniel                            | 3 em um retorno (17 min · US$ 1,47)            | 1 (15 min · US$ 0,15)                          |
| Alertas de contexto · handoffs                        | 1 · 1                                          | 0 · 0                                          |

## Revisão

- **Reviewer (Sonnet):** uma revisão por onda; as 3 tarefas passaram sem reprovação. Nos ajustes, o Reviewer reprovou nada e aprovou T02 de novo (`hx review pass T02`) com lint, tipos e suíte verdes.
- **Conferência visual:** não feita por mim (ninguém abriu o app); foi Daniel quem conferiu o painel e aprovou.
- **Flake isolado:** timeouts de `Usage`/`Sprints.test.tsx` e queda de worker de `server/http.test.ts` em uma rodada; a reexecução passou inteira.

## Retorno de Daniel

1. **Texto de custo quase sobreposto e fora do card:** corrigido (custo em linha própria, `min-width:0`, quebra de palavra). A troca para "ao lado" que eu mesmo tinha feito estreitou a coluna e causou o problema; o plano pedia linha de baixo.
2. **Custo por tipo também no card Consumo:** feito para a sprint; "hoje" e o gráfico de 7 dias ficam sem custo por tipo porque o dado diário não separa por tipo.
3. **Agentes repetidos (Reviewer multiplicado):** não era erro; o Tech Lead abre um agente novo por onda/tarefa. Daniel escolheu agrupar por papel, vale também para clones. Registrado em `docs/decisoes-daniel.md`.

## Retrospectiva

- **O que foi bem:** três tarefas em cadeia, sem conflito de arquivo e sem reprovação. Real em 31% do planejado (S14: 28%, S13: 18%), abaixo do fator de 40% pela terceira sprint seguida; vale reduzir o fator para tarefas de painel.
- **O que pegou:**
  - **Ajuste meu desfez o plano:** troquei "linha de baixo" por "ao lado" para ganhar espaço sem olhar a largura real da coluna; custou um ajuste. Mudança de layout contra o plano pede conferência da largura estreita (~90 px) antes do commit.
  - **Modelo mental dos dados:** "um agente por `agent_id`" gera uma linha por instância; o agrupamento por papel poderia ter vindo no plano, não no retorno.
  - **Clones fora das tarefas nos dados reais:** o harness grava `task.start`, `task.phase` e `review.result` como `tech-lead`, então a coluna "Participaram" e os chips não mostram clone nem Reviewer (a pergunta de Daniel no fim da sprint). O painel está certo; falta o dado.
  - **Espera por Daniel:** 43 min contra 6 min de trabalho.
  - **Contabilidade dos ajustes:** os 3 ajustes foram registrados no mesmo minuto (17:55), então 1 e 2 aparecem com 0 min e o 3 com os 17 min inteiros.
- **Pedidos ao harness (inbox):** já aberto na sprint (prioridade média) — "registrar o agente clone/Reviewer nos eventos task.start e task.phase", com os números acima (3 clones e 3 reviewers abertos, 0 ligados a tarefa). Nenhum pedido novo.
