# Spec 0001 — Backend: dados, eventos e API

- **Status:** implementada em parte na S03 (`GET /api/data` e `POST /promote`; ver §4.0); eventos do harness e regras de §4.1 na S04
- **Data:** 2026-10-18
- **Base:** ADR 0001 (eventos em arquivo → importador → `node:sqlite` → servidor local → React), `src/data/types.ts`, telas da S02.

## 1. Visão da esteira

```
Main Harness (hx, hooks)          Claude Code
  └─ ~/.harness/events/             └─ ~/.claude/projects/**/*.jsonl (transcripts)
       YYYY-MM-DD.jsonl                  │
  └─ ~/.harness/projects.json            │
            │                            │
            └──────────┬─────────────────┘
                       ▼
               importador (no servidor, a cada ~2 s: lê só as linhas novas, guarda offset)
                       ▼
               SQLite (node:sqlite, arquivo ~/.dashboard-ia/dashboard.db)
                       ▼
               servidor HTTP local (node:http, 127.0.0.1:5174, só JSON)
                       ▼
               front React (polling ~5 s; Vite faz proxy de /api em dev)
```

Princípios:

1. **O arquivo de eventos é o único contrato com o harness.** O banco é derivado: apagar o `.db` e reimportar reconstrói tudo (exceto histórico de transcripts já apagados pelo Claude Code; ver riscos).
2. **Importação idempotente.** Cada arquivo tem um offset em bytes gravado no banco (`import_cursor`). Linha inválida é registrada em `import_error` e pulada; não para a importação.
3. **Sem dependências novas.** `node:http`, `node:sqlite`, `node:fs`. Sem framework de servidor, sem ORM.
4. **Só local.** Escuta em `127.0.0.1`. Sem login (versão online fica para depois).

## 2. Eventos: o contrato do harness

Desde a S04 o formato é o **contrato v1 do Main Harness** (`C:\Main Harness\docs\contracts\events.md`, fonte `cli/src/events/schema.ts`). Este projeto não define mais tipos próprios; as extensões da S03 e o gerador de exemplo saíram.

- **Onde:** `~/.harness/events/YYYY-MM-DD.jsonl` (um arquivo por dia, só acréscimo). Troca com `DASHBOARD_EVENTS_DIR`. Projetos: `projects.json` na pasta acima de `events` (`id`, `name`, `path`).
- **Envelope:** `v`, `id` (ULID), `ts`, `harness`, `project`, `session`, `sprint`, `task`, `agent`, `type`, `data`. Chave de deduplicação: `id`.

### 2.1 Como cada tipo é aplicado (`server/events.ts`)

| Tipo                                              | Efeito no banco                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| qualquer evento com `session`                     | cria o `chat` (id = sessão; início = 1º evento) e o `agent` `<sessão>:<agent>` (início = 1º evento dele) |
| `session.end`                                     | fim do chat e dos agentes abertos dele                                                                   |
| `sprint.approved`                                 | `approved_at` e `plan_path` (= `data.plan`, lido depois só dentro de `<repo>/docs`)                      |
| `sprint.open`                                     | `status = active`, `started_at`, `task_count` (= `data.tasks`)                                           |
| `sprint.feedback` / `sprint.close`                | `feedback_rounds + 1` / `status = closed`                                                                |
| `task.start` / `task.phase` / `task.done`         | tarefa reaberta / `steps` pela fase (`testes`=0, `código`=1, `revisão`=3, `commit`=4) / pronta           |
| `review.result`                                   | `review`; `review_round` = quantas reprovações                                                           |
| `usage`                                           | linha em `usage` com id = `data.message_id` (o mesmo id do transcript: não conta em dobro)               |
| `alert.context`                                   | `context_pct` do agente (`tokens ÷ limit`; sem `agent` = Tech Lead)                                      |
| demais (`handoff`, `harness.*`, `sprint.metrics`) | só o log `event`                                                                                         |

Linha inválida (JSON, envelope sem `id`/`ts`/`project`/`type` ou `data` que não é objeto) vai para `import_error`. Evento com `v` desconhecido é ignorado e contado em `import_skip`. Nenhum dos dois para a importação. Mudou o formato do banco (`PRAGMA user_version`)? As tabelas são recriadas e os eventos reimportados; `promoted` é mantido.

### 2.2 O que vem dos repos (`server/repo.ts`)

Só arquivos dentro de `<repo>/docs` (caminho real conferido; `..`, absoluto e links para fora são recusados):

- sprint plan (`plan_path`): título, objetivo, tarefas (id, título, agente, dependências, planejado) e ondas (linha `**Paralelismo:**`/`**Ondas:**`);
- documentos: `docs/sprints/*-plan.md`, `*-release.md`, `docs/adr/*.md`, `docs/prd/*.md`;
- `docs/backlog.md` e `docs/roadmap.md`.

### 2.3 Lacunas (pedido ao harness de 2026-10-21)

Sem estes eventos o painel aproxima: `agent.start`/`agent.end` com id e tarefa (hoje: campo `agent`), título do chat (hoje: id da sessão), comando de Daniel (`UserPromptSubmit`; hoje: último `session.start`), `project.status` opcional (hoje: onde parou = último evento), fonte do limite da assinatura (hoje: estimado). `task.phase` já é gravado, mas falta no contrato.

## 3. Esquema SQLite

Implementado em `server/db.ts`, com `sprint.plan_path`, `sprint.task_count` e a tabela `import_skip` a mais. As colunas `backlog`, `roadmap`, `phase_json`, `alerts_json` e a tabela `doc` são da S03 e ficaram sem uso: backlog, documentos, fase e alertas agora saem dos repos e das regras de §4.1.

Datas como texto ISO UTC (ordenável). IDs de tarefa e sprint se repetem entre projetos, então a chave é composta.

```sql
CREATE TABLE project (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, repo_path TEXT,
  last_activity_at TEXT NOT NULL,
  where_stopped TEXT, next_step_json TEXT,       -- de project.status
  promoted INTEGER NOT NULL DEFAULT 0            -- "Trazer para ativos" (persistido)
);
CREATE TABLE sprint (
  project_id TEXT NOT NULL REFERENCES project(id), id TEXT NOT NULL,
  title TEXT NOT NULL, goal TEXT, status TEXT NOT NULL,  -- planned|active|closed
  planned_at TEXT, approved_at TEXT, started_at TEXT, delivered_at TEXT, closed_at TEXT,
  planned_min INTEGER, usd_estimate REAL, feedback_rounds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE task (
  project_id TEXT NOT NULL, sprint_id TEXT,      -- NULL = fora da sprint
  scope TEXT NOT NULL,                           -- sprint_id ou 'chat:<chat_id>'
  chat_id TEXT, id TEXT NOT NULL, title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0, steps INTEGER NOT NULL DEFAULT 0,
  review TEXT, review_round INTEGER NOT NULL DEFAULT 0,
  agent_kind TEXT, wave INTEGER, plan_start INTEGER, plan_duration INTEGER, plan_deps TEXT, -- deps em JSON
  started_at TEXT, ended_at TEXT,
  PRIMARY KEY (project_id, scope, id)
);
CREATE TABLE chat (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
  sprint_id TEXT, started_at TEXT NOT NULL, ended_at TEXT
);
CREATE TABLE agent (
  id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES chat(id),
  kind TEXT NOT NULL, name TEXT NOT NULL, task_id TEXT, doing TEXT,
  context_pct INTEGER, started_at TEXT NOT NULL, ended_at TEXT
);
CREATE TABLE usage (                             -- uma linha por mensagem do transcript
  id TEXT PRIMARY KEY,                           -- uuid da mensagem no transcript
  project_id TEXT NOT NULL, chat_id TEXT, agent_id TEXT, at TEXT NOT NULL, model TEXT NOT NULL,
  tokens_in INTEGER, tokens_out INTEGER, cache_read INTEGER, cache_write INTEGER
);
CREATE TABLE price (model TEXT PRIMARY KEY, in_per_mtok REAL, out_per_mtok REAL,
  cache_read_per_mtok REAL, cache_write_per_mtok REAL);
CREATE TABLE doc (
  project_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL,
  path TEXT NOT NULL, date TEXT, PRIMARY KEY (project_id, id)
);
CREATE TABLE event (                             -- log bruto, base de "Desde o seu último comando" e alertas
  rowid INTEGER PRIMARY KEY, project_id TEXT NOT NULL, at TEXT NOT NULL, type TEXT NOT NULL,
  chat_id TEXT, body TEXT NOT NULL, hash TEXT NOT NULL UNIQUE
);
CREATE TABLE limit_window (window TEXT PRIMARY KEY, pct INTEGER, resets_at TEXT, at TEXT);
CREATE TABLE import_cursor (file TEXT PRIMARY KEY, offset INTEGER NOT NULL, mtime TEXT);
CREATE TABLE import_error (file TEXT, offset INTEGER, line TEXT, error TEXT, at TEXT);

CREATE INDEX event_project_at ON event(project_id, at);
CREATE INDEX usage_project_at ON usage(project_id, at);
CREATE INDEX agent_open ON agent(chat_id) WHERE ended_at IS NULL;
CREATE INDEX chat_project ON chat(project_id, started_at);
CREATE INDEX task_sprint ON task(project_id, sprint_id);
```

Notas:

- `task.scope`: `T01` se repete entre sprints e `A1` entre chats; o escopo separa os dois casos numa chave só.
- `usage.id` vem do transcript → reimportar não duplica. Gasto por dia é `GROUP BY date(at)`; não há tabela `usage_day` (evita duas verdades).
- `event` guarda tudo, inclusive tipos que o importador ainda não entende (compatibilidade para frente).

## 4. Contratos da API

### 4.0 O que a S03 implementou

- **`GET /api/data`** devolve o `Data` de `src/data/types.ts` inteiro, montado em `server/data.ts` (cerca de 280 KB com os dois projetos reais, pelo markdown dos documentos). Desde a S04, fase, alertas, próximo passo, eventos de texto, entrega e `lastCommand` saem do servidor (§4.1); ociosos e o filtro "desde o último comando" continuam no front. Os endpoints por tela de §4.2–4.4 ficam para quando o tamanho ou a velocidade pedirem.
- **`POST /api/projects/:id/promote`** → `204`, ou `404` se o projeto não existe.
- **Só local:** pedido com `Host` fora de `localhost`/`127.0.0.1` ou com `Origin` de outro site recebe `403`. Isso cobre DNS rebinding e POST vindo de outra página.
- **Limites:** usa o último `limit` ainda não vencido. Sem evento de 5 h, o servidor estima `pct = US$ das últimas 5 h ÷ h5Usd` (`h5Usd` fixo em 17) e marca `estimated`. Sem evento semanal, `week` não vem e o menu mostra "sem dado".
- **`usd`:** sai da tabela `price` (valores iniciais em `server/usage.ts`). O US$ da sprint soma o consumo do projeto entre `started_at` e `closed_at` (ou agora).
- **Importador:** roda no servidor a cada 2 s (`server/main.ts`). Pasta de eventos em `DASHBOARD_EVENTS_DIR` e banco em `DASHBOARD_DB`.

Base `http://127.0.0.1:5174/api`. Só JSON, UTF-8. Erros: `{ "error": "texto" }` com 400/404/500. Todas as datas em ISO UTC; o front formata.

### 4.1 O que é calculado onde

| Valor                                                     | Onde                                                    | Por quê                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `usd` (por dia, sprint, desde o comando)                  | servidor                                                | depende da tabela `price`                                                                                   |
| `phase`, `alerts`, `nextStep` padrão                      | servidor                                                | regras sobre estado (abaixo)                                                                                |
| `idle` / `active` (`splitIdle`)                           | servidor                                                | `promoted` agora é persistido; mesma regra de `src/lib/idle.ts` (7 dias, máx. 3, promovidos fora do limite) |
| `since` (eventos + gasto desde o último comando)          | servidor                                                | consulta no `event` e `usage`; front só exibe                                                               |
| `steps`, `done`, `review` da tarefa                       | servidor (importador)                                   | derivados de `task.*`                                                                                       |
| `progress` (`taskPct`, `sprintPct`, `currentWave`), Gantt | **front**                                               | puro, barato, já testado em `src/lib/progress.ts`                                                           |
| durações "corrido", "há N min", "renova em"               | **front**                                               | dependem do relógio (`useNow`), mudam a cada segundo                                                        |
| filtros da linha do tempo (lanes, marcos)                 | servidor monta lanes/marcos do período; front posiciona |                                                                                                             |

Regras de `phase` (servidor): sprint `planned` sem `approved_at` → `Plano`/`warn`; `delivered_at` sem `closed_at` → `Esperando você`/`warn`; `active` → `Execução`/`run` (`live` se há agente aberto); senão sem `phase`.
`alerts`: tarefa com `review = fail` e não pronta (`bad`, "Reviewer reprovou TNN", "Nª reprovação · note"); sprint entregue (`warn`, "Testar a entrega da SNN"); plano esperando aprovação (`warn`).
`nextStep`: o padrão derivado de `phase` (Corrigir a TNN / Acompanhar a SNN / Testar a entrega / Aprovar o plano). Sprint **entregue** = tarefas prontas ≥ `sprint.open.data.tasks`. **Plano esperando** = `docs/sprints/SNN-plan.md` mais novo que a última sprint e sem `sprint.approved`. `live` = atividade do projeto nos últimos 30 min. `whereStopped` = último evento de texto. `lastCommand` = último `session.start`.

### 4.2 `GET /api/board`

Bem-vindo, Sala de controle, menu (limites, aba Ociosos) e Ociosos. Uma chamada só: as três telas mostram as mesmas colunas.

Resposta (`Board`, montada com os tipos de `types.ts`):

```json
{
  "now": "2026-10-18T14:50:00Z",
  "lastCommand": {
    "at": "2026-10-18T13:39:00Z",
    "chatId": "c-8a2",
    "chatTitle": "Executar sprint S03",
    "projectId": "dashboard-ia"
  },
  "limits": {
    "h5": { "pct": 62, "resetsAt": "2026-10-18T15:40:00Z" },
    "week": { "pct": 41, "resetsAt": "2026-10-22T09:00:00Z" },
    "h5Usd": 17
  },
  "active": [
    {
      "project": {
        "id": "dashboard-ia",
        "name": "Dashboard IA",
        "lastActivityAt": "...",
        "phase": { "label": "Execução", "tone": "run", "live": true },
        "nextStep": { "title": "Nada para você agora", "detail": "...", "action": "Ver a sprint" },
        "whereStopped": "...",
        "alerts": [
          {
            "tone": "bad",
            "title": "Reviewer reprovou T02",
            "detail": "1ª reprovação · faltou teste"
          }
        ]
      },
      "since": {
        "events": [{ "at": "...", "kind": "ok", "text": "T01 concluída e aprovada" }],
        "usd": 3.1,
        "tokens": 1897000
      },
      "sprint": {
        "id": "S03",
        "title": "Backend",
        "goal": "...",
        "status": "active",
        "startedAt": "...",
        "deliveredAt": null,
        "plannedMin": 180,
        "usd": 3.1,
        "tasks": [
          {
            "id": "T01",
            "title": "Importador",
            "done": true,
            "review": "pass",
            "agent": "tech-lead",
            "steps": 5,
            "wave": 1,
            "plan": { "start": 0, "duration": 40, "deps": [] },
            "startedAt": "...",
            "endedAt": "..."
          }
        ]
      },
      "adhoc": [
        {
          "chatTitle": "hook lento",
          "task": {
            "id": "A1",
            "title": "Ajustar hook",
            "done": true,
            "agent": "tech-lead",
            "startedAt": "...",
            "endedAt": "..."
          }
        }
      ],
      "agents": [
        {
          "id": "a-91c",
          "kind": "clone",
          "name": "Clone 1",
          "task": "T02",
          "doing": "T02 rotas",
          "contextPct": 21,
          "startedAt": "..."
        }
      ],
      "usage7d": [{ "date": "2026-10-12", "tokens": 245000, "usd": 0.4 }],
      "docs": {
        "sprint-plan": { "id": "S03-plan", "title": "S03 — Backend", "date": "..." },
        "release-report": null,
        "adr": { "...": "..." },
        "prd": null,
        "handoff": null
      },
      "backlogTop": ["Servidor local + SQLite", "Ligar telas aos dados reais", "Consumo real"]
    }
  ],
  "idle": [
    {
      "id": "bot-telegram",
      "name": "Bot Telegram",
      "lastActivityAt": "...",
      "lastSprint": { "id": "S04", "status": "closed" },
      "usdWeek": 0
    }
  ]
}
```

- `project`: sem `backlog`, `roadmap` e `events` (vão só em `GET /api/projects/:id`); na S03, esses campos ficam opcionais em `types.ts`.
- `lastCommand`: além de `at`, o servidor resolve o chat (`chatId`, `chatTitle`, `projectId`); `Data.lastCommand` ganha esses campos.
- `sprint`: a ativa; se não houver, a planejada; senão `null`.
- `agents`: só os abertos (`ended_at IS NULL`), equivale a `runningAgents`.
- `docs`: o mais recente de cada `kind` (equivale a `latest()` do Bem-vindo).
- `backlogTop`: 3 primeiros itens de `docs/backlog.md` do repo (o servidor lê o arquivo; mesma regra de `backlogTop`).
- Tamanho esperado: < 50 KB com 3 projetos ativos. Polling de 5 s é aceitável.

### 4.3 `GET /api/timeline?range=today|7d|sprint`

```json
{
  "range": "today",
  "start": "2026-10-18T10:00:00Z",
  "end": "2026-10-18T15:00:00Z",
  "lanes": [
    {
      "projectId": "dashboard-ia",
      "sprint": { "id": "S03", "done": 3, "total": 7 },
      "usdToday": 3.1,
      "bars": [
        {
          "id": "a-91c",
          "kind": "clone",
          "label": "Clone 1",
          "adhoc": false,
          "from": "...",
          "to": null
        }
      ],
      "marks": [
        { "tone": "ok", "at": "...", "text": "T01 ✓" },
        { "tone": "warn", "at": "...", "text": "entregue, esperando teste" }
      ]
    }
  ]
}
```

- `today` = dia de calendário local da máquina (resolve o `shortcut` atual de "últimas 24 h"); `7d` = agora − 7 dias; `sprint` = menor `started_at` das sprints ativas.
- `to: null` = barra aberta (rodando); o front estica até `now`.
- Só projetos ativos (mesma divisão do `/api/board`). Ticks do eixo continuam no front.

### 4.4 Abas do projeto

| Método e rota                         | Resposta                                                                     | Aba                                             |
| ------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| `GET /api/projects/:id`               | `Project` (sem `events`) + `backlog` e `roadmap` em markdown (lidos do repo) | cabeçalho, Backlog e Roadmap                    |
| `GET /api/projects/:id/chats`         | `Chat[]` (com `agents` e `tasks`), mais novo primeiro                        | Chats                                           |
| `GET /api/projects/:id/sprints`       | `Sprint[]` (com `tasks`, `usd` real)                                         | Sprints                                         |
| `GET /api/projects/:id/docs`          | `Omit<Doc,"markdown">[]`                                                     | Documentos (lista)                              |
| `GET /api/projects/:id/docs/:docId`   | `Doc` com `markdown` lido do arquivo no momento                              | Documentos (leitura)                            |
| `GET /api/projects/:id/usage?days=30` | `UsageDay[]`                                                                 | Consumo                                         |
| `GET /api/usage?days=30`              | `UsageDay[]` de todos os projetos                                            | Consumo geral (`usageByProject` segue no front) |
| `POST /api/projects/:id/promote`      | `204`; marca `promoted = 1`                                                  | Ociosos → "Trazer para ativos"                  |
| `DELETE /api/projects/:id/promote`    | `204`; desfaz                                                                | (futuro, se precisar)                           |

Exemplo `GET /api/projects/dashboard-ia/usage?days=2`:

```json
[
  { "projectId": "dashboard-ia", "date": "2026-10-17", "tokens": 2620000, "usd": 4.28 },
  { "projectId": "dashboard-ia", "date": "2026-10-18", "tokens": 1897000, "usd": 3.1 }
]
```

`docId` é validado contra a tabela `doc`; o caminho lido é sempre `repo_path + doc.path` resolvido e conferido para ficar dentro do repo (sem `..`).

## 5. Telas × endpoints

| Tela                                               | Endpoint(s)                                                                | Quando atualiza                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Menu (limites, aba "Ociosos (N)")                  | `GET /api/board`                                                           | a cada 5 s (mesma chamada do layout; o resultado vai pelo `Outlet` como hoje faz `useBoard`) |
| Bem-vindo de volta                                 | `GET /api/board` (`lastCommand`, `active[].project/since/docs/backlogTop`) | 5 s                                                                                          |
| Sala de controle                                   | `GET /api/board` (`active[].sprint/adhoc/agents/usage7d`, `limits.h5Usd`)  | 5 s; relógio local a cada 1 s para durações                                                  |
| Linha do tempo                                     | `GET /api/timeline?range=…`                                                | 5 s e ao trocar o período                                                                    |
| Ociosos                                            | `GET /api/board` (`idle`) + `POST /promote`                                | 5 s; após o POST, refaz o board na hora                                                      |
| Projeto › Chats / Sprints / Docs / Consumo / Plano | `GET /api/projects/:id/...`                                                | ao abrir a aba; 5 s só em Chats e Sprints (as outras mudam pouco)                            |

Troca no front: `src/data/mock.ts` continua para os testes; um `useApi(path)` simples (fetch + `setInterval`, pausa com a aba oculta) substitui `data` nas telas. Se o servidor cair, a tela mantém o último dado e mostra "sem conexão desde HH:MM".

## 6. Perguntas em aberto

1. **Limite da assinatura (`limit`)**: de onde vem o % da janela de 5 h e da semanal? Não há fonte conhecida (há investigação aberta no harness). Até lá: estimar o 5 h por gasto (`usd / h5Usd`) e esconder o semanal? Recomendo estimar e marcar "estimado".
2. **`whereStopped` e `nextStep`**: texto escrito pela IA (`project.status`) ou derivado? Recomendo: derivado por padrão, sobrescrito por `project.status` quando o Tech Lead emitir.
3. **`task.phase`**: o harness hoje não sabe em que etapa do TDD a tarefa está. Alternativas: novo comando `hx task phase TNN code` chamado pelo Tech Lead, ou inferir (commit = `commit`, `hx review` = `review`). Recomendo o comando (simples e explícito).
4. **Tarefas fora da sprint** (A1, A2): quem cria? Proposta: `hx task start A1 --title "..."` sem sprint ativa vira tarefa do chat.
5. **ID do agente**: o Claude Code dá `agent_id` no `SubagentStart`? Se não, o harness gera e repassa no handoff.
6. **Porta e início**: servidor sobe junto com `npm run dev` ou separado? Recomendo `npm run dev` iniciar os dois com um script Node curto, sem dependência nova.
7. **Rotação dos arquivos**: se o harness rotacionar por dia (`<projeto>-YYYY-MM-DD.jsonl`), o cursor por arquivo já cobre; só precisa ser combinado.

## 7. Riscos

| Risco                                                              | Efeito                   | Mitigação                                                                                                         |
| ------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Formato do transcript do Claude Code muda (não é contrato público) | consumo para de contar   | importador tolerante, campos faltando viram `import_error`; teste com amostra real fixada                         |
| Claude Code apaga transcripts antes da importação                  | buraco no consumo        | importador roda sempre que o servidor está de pé; histórico fica no SQLite                                        |
| Eventos fora de ordem ou faltando (`task.done` sem `task.start`)   | estado incoerente        | importador faz _upsert_ por chave e aceita qualquer ordem; não falha                                              |
| `node:sqlite` muda API (experimental)                              | quebra no update do Node | acesso ao banco isolado num arquivo `server/db.ts`; sinal de reverter já no ADR 0001                              |
| Escrita concorrente do harness no meio da linha                    | linha cortada            | só importa até o último `\n`; resto fica para a próxima leitura                                                   |
| Leitura de arquivo pelo `docId`                                    | ler fora do repo         | validar contra a tabela e conferir caminho resolvido (ver 4.4)                                                    |
| Preço por modelo desatualizado                                     | US$ errado               | tabela `price` editável; recalcula sem reimportar                                                                 |
| Dependência do harness (dois pedidos no inbox)                     | S03 sem dados reais      | S03 começa com um gerador de eventos de exemplo (JSONL a partir do `mock.ts`) para testar a esteira ponta a ponta |
