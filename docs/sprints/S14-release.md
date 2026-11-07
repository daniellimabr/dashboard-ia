# S14 — Release Report

> Entregue em 2026-11-07; Daniel confirmou em 2026-11-07 ("sim", fechar, depois de aprovar os ajustes visuais).

## Execução

Horários de Brasília (UTC−3). ✅ feita.

| Status | Id        | Tarefa                          | Agente         | Planejado | Início           | Fim              | Duração                             |
| ------ | --------- | ------------------------------- | -------------- | --------- | ---------------- | ---------------- | ----------------------------------- |
| ✅     | T01       | Alerta de plano fora do padrão  | clone (sonnet) | 16 min    | 14:00            | 14:11            | 4 min (fila: 1 min, revisão: 6 min) |
| ✅     | T02       | Aviso de servidor desatualizado | clone (sonnet) | 16 min    | 14:00            | 14:11            | 4 min (fila: 1 min, revisão: 6 min) |
| ✅     | Ajuste 1  | Coluna Consumo espremida        | tech-lead      |           | 14:19            | 14:34            | 15 min                              |
| ✅     | **Total** | 2 tarefas                       |                | 32 min    | 2026-11-07 14:00 | 2026-11-07 14:11 | 11 min                              |

## Entrega

O painel deixa de falhar em silêncio. Um plano da sprint sem tarefas ou sem minutos planejados gera o alerta "Plano fora do padrão do harness" no Andamento do projeto (tarefas do Reviewer não contam como "sem minutos"). Quando o último commit é mais novo que a subida do servidor, a barra lateral mostra "Servidor desatualizado: reinicie". A leitura do git é guardada por 5 s e, se falhar, não aparece aviso. No ajuste, a coluna Tarefa da tabela "Tarefas da sprint" passou a ter no máximo 440 px e a coluna Consumo no mínimo 270 px, para o consumo não ficar espremido com descrições longas. Suíte com zero erros e zero avisos de lint e tipos.

## Indicadores

| Indicador                                             | S14                                            | S13                                    |
| ----------------------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| Soma das tarefas (planejada · real)                   | 32 min · 9 min (28%)                           | 1 h 39 min · 18 min (18%)              |
| Relógio (previsto · corrido)                          | 16 min · 11 min                                | 1 h 13 min · 20 min                    |
| Trabalho · espera por Daniel                          | 3 min · 29 min                                 | 3 min · 9 h 33 min                     |
| Custo total                                           | US$ 1,64 (Sonnet)                              | US$ 3,82                               |
| Custo por agente                                      | Tech Lead 0,71 · executor 0,66 · reviewer 0,27 | —                                      |
| Tokens (entrada / saída / cache escrito / cache lido) | 122 / 27 mil / 224 mil / 3,62 mi               | 266 / 71 mil / 541 mil / 8,26 mi       |
| Reprovações do Reviewer                               | 0                                              | 0                                      |
| Ajustes pedidos por Daniel                            | 1 (15 min · US$ 0,15)                          | 2 no mesmo retorno (22 min · US$ 0,72) |
| Alertas de contexto · handoffs                        | 0 · 0                                          | 1 · 1                                  |

## Revisão

- **Onda 1 (T01, T02):** aprovadas na primeira revisão. Achados corrigidos antes do commit: comparação do agente `reviewer` sem distinguir maiúsculas (alerta falso) e `git` rodando a cada requisição (agora com cache de 5 s). Sem achados de segurança.
- **Achado de maior peso (T01):** o Reviewer conferiu o painel contra os planos reais S52–S54 do financeiro e o alerta **não dispara neles**. Os planos têm tabela com `Id` e `Planejado`, e o leitor extrai 4, 6 e 6 tarefas com minutos. O diagnóstico do plano estava errado nesse ponto; a causa real é o agente `tech-lead` em todos os eventos. Não houve mudança de escopo; Daniel foi avisado.
- **Não feito (baixa):** teste direto da falha do `git` em `lastCommitAt` (só o handler com `commitAt` injetado é testado); regex de agente falha quando o texto tem vírgula ("clone (sonnet), caminhos de erro", pré-existente, T03 da S52).
- **Ajuste após a entrega:** só CSS e uma classe; não passou pelo Reviewer. Coberto por suíte, lint e tipos.
- **Conferência visual:** feita por Daniel ("ajustes visuais ok").

## Retorno de Daniel

1. **Consumo espremido na tabela de tarefas (financeiro):** corrigido (`be6d5ff`), aprovado visualmente.
2. **Consumo por tarefa não aparece:** consequência de todos os eventos do financeiro virem como `tech-lead`; o painel só liga consumo à tarefa quando o clone tem agente próprio. Fica para a S15, com a revisão de como exibir o consumo (backlog).

## Retrospectiva

- **O que foi bem:** duas tarefas em paralelo, sem conflito de arquivo e sem reprovação. Real em 28% do planejado, abaixo do fator de 40%: segunda sprint seguida em que tarefa de painel pequena sai bem mais rápida; vale reduzir o fator para esse tipo.
- **O que pegou:**
  - **Diagnóstico sem conferir o dado real:** o plano da S14 partiu do cabeçalho `#` do financeiro sem rodar o leitor nos planos reais. O Reviewer pegou, mas só no fim. Sprint de painel que reage a dado de outro projeto pede conferência com o arquivo real já no planejamento.
  - **T01 sem teste vermelho comprovado no T02:** o clone escreveu o teste antes, mas não rodou em RED. Barato, sem consequência aqui.
  - **Espera por Daniel:** 29 min contra 3 min de trabalho, sprint curta e acompanhada.
- **Pedidos ao harness (inbox):** nenhum novo. O pedido já aberto (plano padrão validado na aprovação; clones com agente próprio nos eventos) continua sendo a correção do financeiro e do consumo por tarefa.
