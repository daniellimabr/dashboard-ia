# S10 — Release Report

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                                              | Agente    | Planejado  | Início           | Fim              | Duração                              |
| ------ | --------- | ------------------------------------------------------------------- | --------- | ---------- | ---------------- | ---------------- | ------------------------------------ |
| ✅     | T01       | Ondas: ler plano em linha e em lista                                | clone     | 10 min     | 23:49            | 00:10            | 7 min (fila: 10 min, revisão: 4 min) |
| ✅     | T02       | Menu: sprint abre a Sala de controle; renova em                     | clone     | 15 min     | 23:49            | 00:10            | 10 min (fila: 7 min, revisão: 4 min) |
| ✅     | T03       | Base compacta: legenda do plano e tabela de tarefas                 | clone     | 30 min     | 23:49            | 00:10            | 12 min (fila: 4 min, revisão: 4 min) |
| ✅     | T04       | Sala de controle: sprint, limites, %, agentes                       | tech-lead | 30 min     | 00:06            | 00:24            | 14 min (fila: 0 min, revisão: 4 min) |
| ✅     | T05       | Revisão das ondas + conferência visual no navegador                 | reviewer  | 13 min     | 00:24            | 00:31            | 0 min (revisão: 7 min)               |
| ✅     | T06       | Só tema escuro: remover botão claro/escuro                          | clone     | 5 min      | 00:00            | 00:10            | 4 min (fila: 2 min, revisão: 4 min)  |
| ✅     | T07       | Progresso e ondas no 6thGear: fase "fila" e ondas em lista numerada | clone     | 10 min     | 00:10            | 00:24            | 5 min (fila: 5 min, revisão: 4 min)  |
| ✅     | **Total** | 7 tarefas                                                           |           | 1 h 13 min | 2026-10-22 23:49 | 2026-10-23 00:31 | 42 min                               |

## Entrega

- **Ondas (T01, T07):** o leitor do plano (`server/repo.ts`) aceita três formatos: linha única (`**Ondas:** onda 1 = ...`), lista `- **Onda N:** ...` (S09) e lista numerada `N. ...` sob `**Ondas:**` (6thGear). Os ids saem só da primeira frase, sem o que está entre parênteses, e vale a primeira onda que cita a tarefa.
- **Progresso (T07):** a fase `fila` conta como Teste, Código e Lint feitos (`server/events.ts`). No 6thGear as tarefas ficavam em 0% até a revisão.
- **Menu (T02):** na Sala de controle, a sprint do acordeão abre `/controle?p=<projeto>&s=<sprint>` e fica destacada. Nas outras telas, abre a página da sprint. O rodapé mostra "renova em hh:mm" nos dois limites, ou `1D-hh:mm` acima de 24 h (helper `src/lib/limits.ts`).
- **Base compacta (T03):** linhas mais baixas, cabeçalho de onda tingido, coluna "Fim previsto", duração em barra ("12/30 min", em alerta quando passa do plano) e legenda do Plano no tempo numa linha.
- **Sala de controle (T04):** lê `?p=&s=`. Faixa "Limites de uso" com %, contagem e hora, em destaque quando chega a 100%. Barra do Andamento = % da sprint. Agentes: mostra quantos cabem na altura do card, e a seta só aparece quando sobra agente.
- **Só tema escuro (T06):** botão de tema e tokens do tema claro removidos.

## Indicadores

| Tarefa    | Planejado  | Real                                 | Diferença |
| --------- | ---------- | ------------------------------------ | --------- |
| T01       | 10 min     | 7 min (fila: 10 min, revisão: 4 min) | −3 min    |
| T02       | 15 min     | 10 min (fila: 7 min, revisão: 4 min) | −5 min    |
| T03       | 30 min     | 13 min (fila: 4 min, revisão: 4 min) | −17 min   |
| T04       | 30 min     | 14 min (fila: 0 min, revisão: 4 min) | −16 min   |
| T05       | 13 min     | 0 min (revisão: 7 min)               | −13 min   |
| T06       | 5 min      | 4 min (fila: 2 min, revisão: 4 min)  | −1 min    |
| T07       | 10 min     | 5 min (fila: 5 min, revisão: 4 min)  | −5 min    |
| **Total** | 1 h 53 min | 52 min (soma)                        |           |

| Indicador                                       | Valor                                                     |
| ----------------------------------------------- | --------------------------------------------------------- |
| Relógio (previsto · corrido)                    | 1 h 13 min · 42 min (58%)                                 |
| Pausas fora do corrido                          | 0 min                                                     |
| Trabalho · espera por Daniel                    | 30 min · 11 h 2 min (teste da entrega no dia seguinte)    |
| Tarefas feitas                                  | 7/7 (5 do plano + 2 pedidas por Daniel no meio da sprint) |
| Tokens (entrada / saída / cache escrito / lido) | 378 / 98.310 / 458.285 / 14.276.288                       |
| Custo total                                     | US$ 7,18                                                  |
| Custo por agente                                | Tech Lead US$ 3,71 · clones US$ 2,82 · Reviewer US$ 0,65  |
| Retrabalho (ajustes de Daniel)                  | 0                                                         |
| Reprovações do Reviewer                         | 0                                                         |
| Alertas de contexto · handoffs                  | 0 · 0                                                     |

## Revisão

- **Onda 1 + T06:** T01, T02, T03 e T06 aprovadas de primeira. Dois achados menores entraram na T04: a página da sprint não passava o início da sprint para o "Fim previsto", e a barra de duração tinha `aria-valuenow` acima de 100.
- **Onda 2 (T04, T07):** aprovadas. O Reviewer conferiu, com um teste temporário, que o plano real do 6thGear S02 é lido com ondas, e apagou o teste depois.
- **T05, conferência visual:** o Reviewer não tinha navegador nesta sessão e achou o Vite fora do ar. O Tech Lead subiu o Vite e tirou os prints em Chrome headless, 1920x1080, nas salas do Dashboard IA S10 e do 6thGear S02. Ficou confirmado: ondas nas duas salas, cards da primeira linha com a mesma altura, cerca de 10 tarefas sem rolar, seta de agentes só onde sobra agente, `4D-07:31` no semanal e nenhuma rolagem horizontal.
- **Defeito menor aberto:** na barra de duração, o traço do fim da barra passa atrás de um dígito ("17/6|0 min"). Uma tentativa com contorno no texto não resolveu e foi desfeita.

## Retorno de Daniel

1. **No meio da sprint (23:54):** remover o botão de tema e manter só o escuro (virou a T06). Contagem acima de 24 h no formato `1D-hh:mm` (entrou na T02).
2. **No meio da sprint (00:06):** o % ficava sempre em 0 e as etapas não acendiam. Depois, que a Sala de controle do 6thGear não mostrava ondas (virou a T07). Foram duas causas diferentes da S09: a fase `fila` era ignorada e o plano usa lista numerada.
3. **Na entrega:** aprovado sem ajustes.

## Retrospectiva

- **O que foi bem:**
  - **Custo e tempo:** US$ 7,18 contra US$ 23,13 na S09 (−69%), e 42 min de relógio contra 1 h 11 min. As tarefas eram menores e houve 0 alertas de contexto, contra 2 na S09.
  - **Mudanças no meio da sprint sem retrabalho:** dois pedidos de Daniel entraram como tarefas novas (T06, T07) com o plano reaprovado. Nenhum ajuste na entrega e 0 reprovações.
  - **Paralelismo:** 3 clones na onda 1, e o T06 começou assim que o T02 liberou o `Layout.tsx`. Nenhum conflito de arquivo.
- **O que pegou:**
  - **Estimativa:** a soma real foi 52 min contra 1 h 53 min planejados (46%). O fator de 50% veio da S09, que tinha porte de telas inteiras; aqui foram ajustes em telas que já existiam. Para ajuste de tela, planejar perto de 15 min.
  - **Fixture que muda outro teste:** a fixture nova da T01 (S03) virou "plano esperando aprovação" e quebrou `server/data.test.ts`. A correção foi renomear a fixture para S00. Teste que lê plano real de sprint ainda aberta também é frágil, então ficou só a S09, que já está fechada.
  - **Conferência visual sem navegador:** o Reviewer não conseguiu abrir o app, e o Tech Lead fez os prints. Na S09 o mesmo Reviewer tinha usado Chrome headless.
  - **Reaprovação do plano:** `hx sprint approve` recusou duas vezes ("plano mudou depois da aprovação"). Só funcionou depois de apagar a seção Aprovação à mão.
  - **Servidor parado:** o Vite e a API caíram ou mudaram de porta durante a sprint, e a 5174 ficou com dois processos (o Vite do 6thGear em `::1` e a API em `127.0.0.1`).
- **Pedidos ao harness (inbox):**
  - Clones marcarem as fases `testes`, `código` e `lint` (aberto durante a sprint). Sem isso, as etapas saltam de 0 para 3.
  - `hx sprint approve` substituir a seção Aprovação quando o plano muda no meio da sprint (novo).
  - Dar ao Reviewer um jeito garantido de tirar prints, por exemplo um comando `hx shot <url>` com Chrome headless (novo).
