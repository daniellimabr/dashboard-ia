# S03 — Release Report

> Sprint fechada em 2026-10-19 08:29 (Brasília), sem ajustes pedidos.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id        | Tarefa                                                                                                                                                                                               | Agente          | Planejado  | Início           | Fim              | Duração                 |
| ------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------- | ---------------- | ---------------- | ----------------------- |
| ✅     | T01       | Banco e importador de eventos: esquema, cursor por arquivo, `import_error`, upsert dos tipos de evento                                                                                               | tech-lead       | 30 min     | 22:57            | 08:15            | 18 min (revisão: 5 min) |
| ✅     | T02       | Importador de consumo dos transcripts do Claude Code + tabela `price`                                                                                                                                | clone           | 20 min     | 22:57            | 08:15            | 18 min (revisão: 5 min) |
| ✅     | T03       | Gerador de eventos de exemplo a partir do mock (`npm run sample-events`)                                                                                                                             | clone           | 20 min     | 22:57            | 08:15            | 18 min (revisão: 5 min) |
| ✅     | T04       | Montar `Data` a partir do banco + servidor HTTP (`/api/data`, `promote`, loop do importador, limites estimados) + atualizar a spec 0001                                                              | tech-lead       | 30 min     | 08:02            | 08:15            | 13 min (revisão: 6 min) |
| ✅     | T05       | Front no servidor: `useData()` e provedor com busca a cada 5 s, aviso "sem conexão", promote via POST, proxy do Vite, `npm run dev` com os dois processos, telas e testes migrados do import do mock | clone           | 30 min     | 22:57            | 08:15            | 18 min (revisão: 7 min) |
| ✅     | T06       | Revisão da onda: lint/tipos/testes zerados, segurança (servidor só em 127.0.0.1, entrada externa dos JSONL), teste ponta a ponta com o gerador                                                       | reviewer (opus) | 15 min     | 08:15            | 08:15            | 0 min                   |
| ✅     | **Total** | 6 tarefas                                                                                                                                                                                            |                 | 1 h 15 min | 2026-10-18 22:57 | 2026-10-19 08:15 | 18 min (pausas: 9 h)    |

## Entrega

O painel deixou de ler o mock e passou a ler o servidor local. A esteira da spec 0001 roda inteira: arquivo de eventos → importador → SQLite → `GET /api/data` → telas, com busca a cada 5 s.

- **Banco e importador** (`server/db.ts`, `server/events.ts`). O banco usa `node:sqlite` e fica em `~/.dashboard-ia/dashboard.db`.
  - O importador guarda um cursor por arquivo e só importa linhas completas.
  - Ele percebe quando um arquivo foi regerado.
  - Linha inválida, inclusive com formato errado de fase, alertas ou eventos, vai para `import_error`.
  - Os eventos são aplicados com upsert e podem chegar em qualquer ordem.
- **Consumo real** (`server/usage.ts`, `server/importer.ts`). O consumo do Dashboard IA vem dos transcripts do Claude Code.
  - Cada mensagem é deduplicada pelo `message.id`.
  - O US$ sai da tabela `price`, que é editável.
  - Quando surge um projeto novo, o importador relê os transcripts.
- **Gerador de exemplo:** `npm run sample-events` escreve os JSONL dos 5 projetos a partir do mock.
- **Servidor** (`server/http.ts`, `server/main.ts`). Escuta só em `127.0.0.1:5174`.
  - Responde 403 para outro `Host` ou `Origin` (proteção contra DNS rebinding e contra POST vindo de outro site).
  - `POST /promote` grava no banco.
  - O limite de 5 h é estimado pelo gasto quando não há evento de limite.
- **Front** (`src/lib/useData.tsx`):
  - mostra "Carregando…" até chegar o primeiro dado;
  - quando o servidor cai, mostra "sem conexão desde HH:MM" e mantém os dados;
  - pausa a busca com a aba oculta;
  - `npm run dev` sobe o Vite e o servidor juntos.
- **Spec 0001 atualizada:** §2.4 traz as extensões do formato usadas pelo gerador e §4.0 descreve o que foi implementado (um endpoint só, `Data`).
- **Fora do plano:** o devDependency `@types/node`, só de tipos, necessário para checar o código do servidor.

Commits: `57fd785` (T01), `0cf7f7d` (T02), `26de4e1` (T03), `b0bb40a` (T04), `611634a` (T05).

## Indicadores

| Indicador                               | S01                    | S02                     | S03                     |
| --------------------------------------- | ---------------------- | ----------------------- | ----------------------- |
| Tarefas feitas                          | 8/8                    | 7/7                     | 6/6                     |
| Tempo de relógio (previsto · corrido)   | 3 h 15 min · 14 min    | 1 h 30 min · 18 min     | 1 h 15 min · 18 min     |
| Soma das tarefas (planejada · real)     | 7 h 15 min · 1 h 4 min | 2 h 55 min · 1 h 13 min | 2 h 25 min · 1 h 26 min |
| Custo total                             | US$ 4.28               | US$ 10.88               | US$ 8.72                |
| Retrabalho (ajustes pedidos por Daniel) | 0                      | 3                       | 0                       |
| Reprovações do Reviewer                 | 0                      | 0                       | 2                       |

| Tarefa | Planejado | Real                    | Diferença |
| ------ | --------- | ----------------------- | --------- |
| T01    | 30 min    | 18 min (revisão: 5 min) | −12 min   |
| T02    | 20 min    | 18 min (revisão: 5 min) | −2 min    |
| T03    | 20 min    | 18 min (revisão: 5 min) | −2 min    |
| T04    | 30 min    | 13 min (revisão: 6 min) | −17 min   |
| T05    | 30 min    | 18 min (revisão: 7 min) | −12 min   |
| T06    | 15 min    | 0 min                   | −15 min   |

- **Custo por agente:** Tech Lead US$ 5.31, clones US$ 2.40, Reviewer US$ 1.02.
- **Tokens:** 296 de entrada, 63.972 de saída, 750.319 de escrita em cache e 14.146.858 de leitura de cache.
- **Pausa de 9 h:** os 3 clones pararam às 22:59 porque o limite mensal de gasto da conta estourou. Retomaram às 07:58, quando o limite renovou, a partir do ponto em que pararam. O tempo corrido não conta a pausa.

## Revisão

O Reviewer (Opus) fez uma revisão para a onda inteira e uma re-revisão.

- **T01, reprovada na 1ª rodada:**
  - (alta) Campos em JSON (`alerts`, `phase`, `nextStep`, `project.event`) entravam sem checar o formato. Um evento malformado deixaria a tela em branco.
  - (média) Um arquivo regerado com tamanho igual ou maior não era relido.
  - Corrigida e aprovada na 2ª rodada.
- **T02, reprovada na 1ª rodada:**
  - (alta) O consumo de um projeto registrado depois de o servidor já ter lido os transcripts se perdia.
  - O import `./db` sem extensão também quebrava no Node puro. Ninguém tinha subido o servidor fora do Vitest, e isso só apareceu no teste ponta a ponta.
  - Corrigida e aprovada na 2ª rodada.
- **T03, T04 e T05:** aprovadas de primeira.
  - Única baixa: a T04 respondia 500 para URL malformada. Foi corrigida para 400.
- **Riscos registrados:**
  - O markdown dos documentos continua sem sanitização. Antes vinha do código e agora vem dos arquivos de eventos (fora do escopo, ver backlog).
  - O Ctrl+C do `npm run dev` no Windows não foi testado à mão.

## Retorno de Daniel

Daniel testou e respondeu "parece tudo ok". Nenhum ajuste pedido.

## Retrospectiva

- **O que foi bem:**
  - O contrato foi fixado antes de abrir os clones: tipos, esquema do banco e um resumo do formato dos eventos.
  - Com isso, T02, T03 e T05 rodaram em paralelo sem cruzar arquivos.
  - O teste de ida e volta (gerador → importador → `Data`) passou na primeira execução.
- **O que pegou:**
  - **Reprovações:** as duas da sprint eram falhas de entrada externa (formato e ordem de chegada). É o tipo de defeito que a revisão com Opus existe para pegar.
  - **Import sem extensão:** o `tsc` aceitou e o Node não. Só o teste ponta a ponta mostrou o erro. Fica para o projeto um teste que suba o `server/main.ts` de verdade.
  - **Previsão de relógio, ainda muito alta:** previsto 1 h 15 min, real 18 min (24%). Nas sprints anteriores foi parecido: S02 com 1 h 30 min previstos e 18 min reais (20%), S01 com 3 h 15 min previstos e 14 min reais (7%). O ajuste pela soma (ritmo da S02) não corrigiu o relógio.
  - **Linha da revisão:** a T06 aparece com 0 min porque o tempo de revisão já entra em cada tarefa ("revisão: N min"). Os 15 min planejados para ela inflam a soma planejada sem nada medido.
- **Pedidos ao harness:**
  - calibrar a previsão de relógio do sprint plan pelo histórico real;
  - não planejar a revisão da onda como tarefa, ou medi-la pelos registros do `hx review`.
