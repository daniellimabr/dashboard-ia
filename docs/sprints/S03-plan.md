# S03 — Backend local: servidor, banco e importador

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.4.0
- **Status:** aguardando aprovação

## Objetivo

Daniel roda `npm run dev` e as telas passam a ler do servidor local, não do mock. Os dados percorrem a esteira inteira da [spec 0001](../specs/0001-backend-dados-e-api.md): arquivo de eventos → importador → SQLite → servidor → telas, com atualização a cada 5 s.

O harness ainda não grava eventos, então a sprint usa um gerador de eventos de exemplo, feito a partir do mock. A exceção é o **consumo**: tokens e US$ do projeto Dashboard IA vêm dos transcripts reais do Claude Code.

## Escopo

1. **Banco** (`node:sqlite`, sem dependência nova), em `~/.dashboard-ia/dashboard.db`.
   - Esquema da spec 0001, seção 3, só com as tabelas usadas nesta sprint.
   - Recriável: apagar o arquivo e reimportar reconstrói tudo.
2. **Importador de eventos.**
   - Lê `*.jsonl` da pasta de eventos. A pasta padrão é `~/.main-harness/events`, trocável por `DASHBOARD_EVENTS_DIR`.
   - Guarda o offset por arquivo e importa só até o último `\n`.
   - Linha inválida vai para `import_error` e não para a importação. Reimportar não duplica.
   - Aplica os tipos da seção 2.2, com upsert por chave, em qualquer ordem.
3. **Importador de consumo.**
   - Lê `message.usage` dos transcripts em `~/.claude/projects/**/*.jsonl`.
   - Descobre o projeto pelo `cwd` do transcript, casado com o `repoPath` registrado.
   - O US$ sai da tabela `price` (editável), com valores iniciais no código.
4. **Gerador de eventos de exemplo:** `npm run sample-events` escreve, a partir de `src/data/mock.ts`, os JSONL dos 5 projetos, com horários relativos ao momento da geração.
   - O Dashboard IA é registrado com `repoPath` = este repo, para casar com os transcripts reais.
   - Inclui eventos de `limit`, `task.phase` e `project.status`.
5. **Servidor HTTP** (`node:http`, `127.0.0.1:5174`, roda TypeScript direto no Node 24, sem build).
   - `GET /api/data` devolve o `Data` de `src/data/types.ts` montado do banco (ver Decisões).
   - `POST /api/projects/:id/promote` grava `promoted` no banco.
   - O importador roda a cada ~2 s dentro do servidor.
   - Erros saem como `{ "error": "..." }`, com status 400, 404 ou 500.
6. **Front ligado ao servidor:**
   - As telas e o menu leem `Data` de um contexto (`useData()`), não mais do import direto do mock.
   - A busca é a cada 5 s e pausa com a aba oculta.
   - Servidor fora: a tela mantém o último dado e mostra "sem conexão desde HH:MM". Antes do primeiro dado, mostra "Carregando…".
   - "Trazer para ativos" chama o POST e refaz a busca.
   - O Vite faz proxy de `/api`, e `npm run dev` sobe o Vite e o servidor juntos, com um script Node curto, sem dependência nova.
   - Os testes continuam com o mock, entregue pelo mesmo contexto.
7. **Limite da assinatura:** vem do último evento `limit`.
   - Sem evento de 5 h, o servidor estima pelo gasto (`usd 5 h ÷ h5Usd`) e o menu mostra "estimado".
   - Sem evento semanal, o menu mostra "sem dado".

## Comportamento esperado (para o teste de Daniel)

- `npm run sample-events` e depois `npm run dev`: as 4 telas e as abas de projeto aparecem iguais às da S02, agora vindas do servidor.
- O consumo do Dashboard IA (tokens e US$ do dia e dos últimos 7 dias) mostra números reais desta máquina, diferentes dos do mock.
- **Atualização ao vivo:** acrescentar uma linha de evento no JSONL de um projeto (ex.: `task.done`) faz a mudança aparecer na tela em até ~7 s, sem recarregar.
- **Servidor caído:** parar o servidor faz aparecer "sem conexão desde HH:MM", e os dados continuam na tela. Ao voltar, o aviso some.
- "Trazer para ativos" continua após recarregar a página, porque agora é salvo no banco.
- Apagar `dashboard.db` e reiniciar reconstrói tudo igual.

## Fora de escopo

- Eventos reais do harness: dependem dos pedidos no inbox do harness.
- Navegação pelos projetos e documentos: S04, item do backlog.
- Leitura de backlog, roadmap e documentos direto dos repos: o gerador grava o markdown do mock nos eventos `doc.write`.
- Sanitização do markdown.
- Endpoints separados por tela (`/api/board`, `/api/timeline`, abas): ver Decisões.
- Versão online.

## Decisões

- **Um endpoint só, `GET /api/data`, no formato `Data` que o front já usa.**
  - O que muda: as regras de fase, alertas, ociosos e "desde o último comando" ficam onde estão hoje (front, já testadas) e não são reescritas no servidor.
  - A spec 0001 é atualizada nesse ponto (T04). Os endpoints por tela voltam quando o tamanho ou a velocidade pedirem.
  - Tamanho esperado: menos de 200 KB com 5 projetos, num servidor local.
- **TypeScript direto no Node 24** (remoção de tipos nativa): o servidor usa só sintaxe apagável, sem `enum` nem `namespace`.
- **Testes do servidor no Vitest**, com `// @vitest-environment node`, banco em memória (`:memory:`) e pastas temporárias.

## Tarefas

| ID  | Tarefa                                                                                                                                                                                               | Agente          | Arquivos                                                                                                                                                                                                                                    | Depende de | Estimativa |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| T01 | Banco e importador de eventos: esquema, cursor por arquivo, `import_error`, upsert dos tipos de evento                                                                                               | tech-lead       | `server/db.ts`, `server/events.ts`, `server/events.test.ts`                                                                                                                                                                                 | —          | 30 min     |
| T02 | Importador de consumo dos transcripts do Claude Code + tabela `price`                                                                                                                                | clone           | `server/usage.ts`, `server/usage.test.ts`, `server/fixtures/transcript.jsonl`                                                                                                                                                               | —          | 20 min     |
| T03 | Gerador de eventos de exemplo a partir do mock (`npm run sample-events`)                                                                                                                             | clone           | `scripts/sample-events.ts`, `scripts/sample-events.test.ts`                                                                                                                                                                                 | —          | 20 min     |
| T04 | Montar `Data` a partir do banco + servidor HTTP (`/api/data`, `promote`, loop do importador, limites estimados) + atualizar a spec 0001                                                              | tech-lead       | `server/data.ts`, `server/data.test.ts`, `server/http.ts`, `server/http.test.ts`, `server/main.ts`, `docs/specs/0001-backend-dados-e-api.md`                                                                                                | T01, T02   | 30 min     |
| T05 | Front no servidor: `useData()` e provedor com busca a cada 5 s, aviso "sem conexão", promote via POST, proxy do Vite, `npm run dev` com os dois processos, telas e testes migrados do import do mock | clone           | `src/lib/useData.tsx`, `src/main.tsx`, `src/test-utils.tsx`, `src/components/Layout.tsx`, `src/pages/*.tsx` (sem testes), `src/lib/useProject.ts`, `src/App.test.tsx`, `vite.config.ts`, `package.json`, `scripts/dev.ts`, `src/styles.css` | —          | 30 min     |
| T06 | Revisão da onda: lint/tipos/testes zerados, segurança (servidor só em 127.0.0.1, entrada externa dos JSONL), teste ponta a ponta com o gerador                                                       | reviewer (opus) | (só leitura)                                                                                                                                                                                                                                | T01–T05    | 15 min     |

**Paralelismo:**

- **Onda 1:** T01 (Tech Lead), T02, T03 e T05 em clones, sem arquivos cruzados.
  - T02 e T03 seguem o formato de eventos da spec 0001, que é o contrato entre eles.
  - T05 usa o tipo `Data` existente e não depende do servidor pronto: testa com o mock e um `fetch` simulado.
  - `package.json` é só da T05. A T03 pede a ela o script `sample-events`, e eu junto as duas ao commitar.
- **Onda 2:** T04 (Tech Lead), que liga banco, consumo e HTTP.
- **Revisão:** T06 com Opus, porque o servidor lê entrada externa (JSONL e transcripts).

**Estimativa:** soma de 2 h 25 min e relógio previsto de cerca de 1 h 15 min, já ajustados pelo ritmo da S02 (real = 42% do planejado na soma).

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-18 20:25:11 (horário de Brasília) — UTC 2026-10-18T23:25:11Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `7602da58d08586b0aa06268201ea6bb186006f0848471638d6e48dc6f746fdef`
- **Versão do harness:** 0.4.0
