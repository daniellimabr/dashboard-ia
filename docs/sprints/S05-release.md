# S05 — Release Report

> Sprint fechada em 2026-10-21 (3/3 tarefas, 0 ajustes).

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                                                                                           | Agente    | Planejado | Início           | Fim              | Duração                |
| ------ | --------- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---------------- | ---------------- | ---------------------- |
| ✅     | T01       | Abrir documentos: codificar o id nos links; links relativos `.md` entre documentos abrem no painel               | tech-lead | 10 min    | 17:53            | 18:07            | 7 min (revisão: 8 min) |
| ✅     | T02       | Página Projetos no lugar do menu provisório; atalhos de projeto e sprint na Sala de controle e na Linha do tempo | clone     | 13 min    | 17:53            | 18:07            | 8 min (revisão: 6 min) |
| ✅     | T03       | Revisão: lint, tipos e testes zerados; Ponytail; ponta a ponta com dados reais                                   | reviewer  | 5 min     | 18:02            | 18:07            | 5 min                  |
| ✅     | **Total** | 3 tarefas                                                                                                        |           | 18 min    | 2026-10-21 17:53 | 2026-10-21 18:07 | 15 min                 |

## Entrega

Daniel entra em qualquer projeto pelas telas principais e lê todos os documentos pelo painel, sem cair em "Página não encontrada".

- **Abrir documentos** (T01):
  - o id do documento (`<projeto>:docs/<caminho>`, com barra) agora vai codificado nos links da aba Documentos e do Bem-vindo. Antes, a rota `docs/:docId?` não casava;
  - um link relativo para `.md` dentro de um documento abre o documento certo no painel, sem recarregar a página;
  - um link para fora de `docs/`, para um arquivo que não existe ou com `%` inválido vira o texto "(não encontrado)", sem quebrar a tela;
  - o `Markdown` ganhou a prop `link`, que reescreve os links. O HTML continua passando pelo DOMPurify, e o texto do aviso é escapado.
- **Página Projetos** (T02), em `/projetos`, no lugar do menu provisório:
  - um cartão por projeto, com fase e sprint atual (a ativa ou, sem ela, a planejada);
  - atalhos para Chats, Sprints, Backlog e Roadmap, Documentos e Consumo.
- **Atalhos nas telas principais** (T02): na Sala de controle e na Linha do tempo, o nome do projeto e o id da sprint são links.

Commits: `652ced0` (T01), `d53f884` (T02).

## Indicadores

| Tarefa    | Planejado | Real                   | Diferença |
| --------- | --------- | ---------------------- | --------- |
| T01       | 10 min    | 7 min (revisão: 8 min) | −3 min    |
| T02       | 13 min    | 8 min (revisão: 6 min) | −5 min    |
| T03       | 5 min     | 5 min                  | +0 min    |
| **Total** | 28 min    | 20 min (soma)          |           |

| Indicador                                    | Valor                                                   |
| -------------------------------------------- | ------------------------------------------------------- |
| Relógio (previsto · corrido)                 | 18 min · 15 min (83%)                                   |
| Trabalho · espera por Daniel                 | 10 min · 10 min                                         |
| Soma das tarefas (planejada · real)          | 28 min · 20 min (71%)                                   |
| Tarefas feitas                               | 3/3                                                     |
| Tokens (entrada / saída / escrita / leitura) | 128 / 24.153 / 189.099 / 3.846.469                      |
| Custo total                                  | US$ 2,21                                                |
| Custo por agente                             | Tech Lead US$ 1,02 · clone US$ 0,96 · Reviewer US$ 0,23 |
| Retrabalho (ajustes de Daniel)               | 0                                                       |
| Reprovações do Reviewer                      | 0                                                       |
| Alertas de contexto · handoffs               | 0 · 0                                                   |

## Revisão

Um Reviewer (Sonnet) revisou a onda 1 inteira e fez a T03 na mesma chamada. Aprovou T01, T02 e T03 sem reprovações.

- Lint, tipos e testes do projeto inteiro: zerados. Foram 27 arquivos e 133 testes.
- Segurança: nenhum achado alto ou médio. Um achado baixo: um `%` inválido num link derrubava a tela do documento. Corrigido antes do commit, com teste.
- Ponta a ponta com dados reais (37 documentos dos dois projetos):
  - F5 numa rota de documento responde 200;
  - todos os links para ADR resolvem;
  - os links "não encontrado" apontam para pastas que o painel não indexa (`docs/specs`, `inbox/`), como o plano previa.
- Ele avisou que o comentário e o texto da T01 descreviam o id sem o prefixo `docs/`. O comentário e o teste foram corrigidos, e a resolução passou a usar o caminho real.
- Dívida: o estilo inline na Linha do tempo (cabeçalho com seta + link) deve ir para o `Timeline.module.css`.

Os dois ajustes que vieram depois da aprovação (o `%` inválido e o id com `docs/`) entraram sem nova revisão. Foram pequenos, com teste, e o lint ficou zerado.

## Retorno de Daniel

Daniel testou e aprovou sem ajustes.

## Retrospectiva

- **O que foi bem:**
  - **Plano pequeno e certeiro:** 3 tarefas, relógio de 15 min para 18 previstos (83%). Na S04 foram 61%, e na S02–S03, 20–24%. A calibração de 50% está convergindo.
  - **Custo:** US$ 2,21, contra US$ 7,37 na S04. Revisão em Sonnet (sem superfície de segurança) custou US$ 0,23.
  - **Zero reprovações e zero ajustes**, pela segunda sprint seguida sem reprovação.
  - **Paralelismo sem conflito:** T01 e T02 não tinham arquivos em comum. A única interferência foi o `tsc` do projeto acusar erro na T02 ainda em andamento, o que era esperado.
- **O que pegou:**
  - **Formato real do id:** o plano e o teste da T01 supunham `<projeto>:sprints/...`, mas o real é `<projeto>:docs/sprints/...`. Só o ponta a ponta com dados reais mostrou. Daqui em diante, montar as fixtures dos testes a partir de um id real.
  - **Clique no navegador:** os atalhos novos foram conferidos só pelos testes; o clique ficou para Daniel.
- **Pedidos ao harness:** nenhum novo. A sprint não mostrou lacuna do harness.
