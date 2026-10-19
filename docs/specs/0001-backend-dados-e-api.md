# Spec 0001 — Backend: dados, eventos e API

- **Status:** implementada em parte na S03 (`GET /api/data` e `POST /promote`; ver §4.0)
- **Data:** 2026-10-18
- **Base:** ADR 0001 (eventos em arquivo → importador → `node:sqlite` → servidor local → React), `src/data/types.ts`, telas da S02.

## 1. Visão da esteira

```
Main Harness (hx, hooks)          Claude Code
  └─ ~/.main-harness/events/        └─ ~/.claude/projects/**/*.jsonl (transcripts)
       <projectId>.jsonl                 │
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

## 2. Catálogo de eventos

### 2.1 Envelope (toda linha)

| Campo     | Tipo                  | Obrigatório | Nota                                                                                 |
| --------- | --------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `v`       | number                | sim         | versão do formato, começa em `1`                                                     |
| `ts`      | string ISO 8601 (UTC) | sim         | momento do fato                                                                      |
| `project` | string                | sim         | ID fixo do projeto (registro central)                                                |
| `type`    | string                | sim         | um dos tipos abaixo                                                                  |
| `chat`    | string                | não         | ID da sessão do Claude Code (`session_id`), quando o fato acontece dentro de um chat |
| demais    | —                     | —           | campos do tipo                                                                       |

Chave de deduplicação: `(project, ts, type, sha1 da linha)`. Reimportar o mesmo arquivo não duplica.

### 2.2 Tipos

Legenda da coluna **Emite hoje?**: `não` = vira pedido ao harness (o pedido "Gravar eventos em arquivo" já está no inbox; esta tabela é o detalhamento dele). `CC` = vem dos transcripts do Claude Code, não do harness.

| Tipo               | Campos                                                                                                                                         | Quem dispara                                                       | Emite hoje?                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `project.register` | `name`, `repoPath`                                                                                                                             | `hx init` / registro central                                       | não (pedido "ID fixo")                   |
| `sprint.plan`      | `sprint`, `title`, `goal?`, `plannedMin?`, `usdEstimate?`, `tasks[]` (`id`, `title`, `wave`, `agent?`, `plan{start,duration,deps}`), `docPath` | skill `sprint-plan`                                                | não                                      |
| `sprint.approve`   | `sprint`                                                                                                                                       | `hx sprint approve`                                                | não                                      |
| `sprint.open`      | `sprint`                                                                                                                                       | `hx sprint open`                                                   | não                                      |
| `sprint.delivered` | `sprint`                                                                                                                                       | última `hx task done` da sprint (todas prontas)                    | não                                      |
| `sprint.feedback`  | `sprint`, `round`, `text?`                                                                                                                     | `hx sprint feedback`                                               | não                                      |
| `sprint.close`     | `sprint`                                                                                                                                       | `hx sprint close`                                                  | não                                      |
| `task.start`       | `sprint?`, `task`, `title?`, `agent?` (id do agente)                                                                                           | `hx task start`                                                    | não                                      |
| `task.phase`       | `sprint?`, `task`, `step` (`test`\|`code`\|`lint`\|`review`\|`commit`)                                                                         | hook/`hx` a cada etapa do TDD                                      | não (precisa de gatilho novo no harness) |
| `task.done`        | `sprint?`, `task`, `commit?`                                                                                                                   | `hx task done`                                                     | não                                      |
| `task.review`      | `sprint?`, `task`, `result` (`pass`\|`fail`), `round`, `note?`                                                                                 | `hx review pass\|fail`                                             | não                                      |
| `chat.start`       | `title`, `sprint?`                                                                                                                             | hook `SessionStart`                                                | não                                      |
| `chat.end`         | —                                                                                                                                              | hook `SessionEnd`/`Stop`                                           | não                                      |
| `agent.start`      | `agent`, `kind` (`tech-lead`\|`clone`\|`reviewer`), `name`, `task?`, `doing?`                                                                  | hook `SubagentStart` (+ `chat.start` cria o Tech Lead)             | não                                      |
| `agent.context`    | `agent`, `pct`                                                                                                                                 | hook de contexto (alertas 230K/250K) ou a cada turno               | não                                      |
| `agent.end`        | `agent`                                                                                                                                        | hook `SubagentStop`                                                | não                                      |
| `command`          | — (só `ts` e `chat`)                                                                                                                           | hook `UserPromptSubmit` na sessão principal                        | não                                      |
| `doc.write`        | `kind` (`sprint-plan`\|`release-report`\|`adr`\|`prd`\|`handoff`), `id`, `title`, `path`                                                       | skills `sprint-plan`, `release-report`, `adr`, `prd`, `hx handoff` | não                                      |
| `project.status`   | `whereStopped`, `nextStep?{title,detail,action}`                                                                                               | Tech Lead ao fechar tarefa/sprint (texto curto)                    | não (novo; ver perguntas)                |
| `limit`            | `window` (`5h`\|`week`), `pct`, `resetsAt`                                                                                                     | fonte desconhecida                                                 | não (fonte em investigação)              |
| `usage`            | `chat`, `agent?`, `model`, `tokensIn`, `tokensOut`, `cacheRead`, `cacheWrite`                                                                  | importador lê `message.usage` dos transcripts                      | CC                                       |

`usd` **não** vem no evento: o servidor calcula com uma tabela de preços editável (`price`), para poder corrigir preço sem reimportar.

### 2.3 Exemplos (uma linha cada; quebrados aqui só para leitura)

```json
{"v":1,"ts":"2026-10-15T12:00:00Z","project":"dashboard-ia","type":"project.register","name":"Dashboard IA","repoPath":"C:/Dashboard IA"}
{"v":1,"ts":"2026-10-18T13:30:00Z","project":"dashboard-ia","chat":"c-7f1","type":"sprint.plan","sprint":"S03","title":"Backend","goal":"Servidor + SQLite + importador","plannedMin":180,"usdEstimate":4.2,"docPath":"docs/sprints/S03-plan.md","tasks":[{"id":"T01","title":"Importador","wave":1,"agent":"tech-lead","plan":{"start":0,"duration":40,"deps":[]}}]}
{"v":1,"ts":"2026-10-18T13:35:00Z","project":"dashboard-ia","type":"sprint.approve","sprint":"S03"}
{"v":1,"ts":"2026-10-18T13:40:00Z","project":"dashboard-ia","chat":"c-8a2","type":"sprint.open","sprint":"S03"}
{"v":1,"ts":"2026-10-18T15:10:00Z","project":"dashboard-ia","chat":"c-8a2","type":"sprint.delivered","sprint":"S03"}
{"v":1,"ts":"2026-10-18T16:00:00Z","project":"dashboard-ia","chat":"c-8a2","type":"sprint.feedback","sprint":"S03","round":1,"text":"timeline sem marcos"}
{"v":1,"ts":"2026-10-18T17:00:00Z","project":"dashboard-ia","chat":"c-8a2","type":"sprint.close","sprint":"S03"}
{"v":1,"ts":"2026-10-18T13:41:00Z","project":"dashboard-ia","chat":"c-8a2","type":"task.start","sprint":"S03","task":"T01","agent":"a-tl-8a2"}
{"v":1,"ts":"2026-10-18T13:50:00Z","project":"dashboard-ia","chat":"c-8a2","type":"task.phase","sprint":"S03","task":"T01","step":"code"}
{"v":1,"ts":"2026-10-18T14:20:00Z","project":"dashboard-ia","chat":"c-8a2","type":"task.done","sprint":"S03","task":"T01","commit":"a1b2c3d"}
{"v":1,"ts":"2026-10-18T14:30:00Z","project":"dashboard-ia","chat":"c-8a2","type":"task.review","sprint":"S03","task":"T01","result":"fail","round":1,"note":"faltou teste de linha inválida"}
{"v":1,"ts":"2026-10-18T13:40:00Z","project":"dashboard-ia","chat":"c-8a2","type":"chat.start","title":"Executar sprint S03","sprint":"S03"}
{"v":1,"ts":"2026-10-18T17:05:00Z","project":"dashboard-ia","chat":"c-8a2","type":"chat.end"}
{"v":1,"ts":"2026-10-18T13:45:00Z","project":"dashboard-ia","chat":"c-8a2","type":"agent.start","agent":"a-91c","kind":"clone","name":"Clone 1","task":"T02","doing":"T02 rotas da API"}
{"v":1,"ts":"2026-10-18T14:05:00Z","project":"dashboard-ia","chat":"c-8a2","type":"agent.context","agent":"a-91c","pct":21}
{"v":1,"ts":"2026-10-18T14:15:00Z","project":"dashboard-ia","chat":"c-8a2","type":"agent.end","agent":"a-91c"}
{"v":1,"ts":"2026-10-18T13:39:00Z","project":"dashboard-ia","chat":"c-8a2","type":"command"}
{"v":1,"ts":"2026-10-18T13:30:00Z","project":"dashboard-ia","chat":"c-7f1","type":"doc.write","kind":"sprint-plan","id":"S03-plan","title":"S03 — Backend","path":"docs/sprints/S03-plan.md"}
{"v":1,"ts":"2026-10-18T15:10:00Z","project":"dashboard-ia","type":"project.status","whereStopped":"A S03 entregou o servidor; falta seu teste.","nextStep":{"title":"Testar a S03","detail":"Abra o painel e confira os dados reais.","action":"Ver a sprint"}}
{"v":1,"ts":"2026-10-18T14:00:00Z","project":"*","type":"limit","window":"5h","pct":62,"resetsAt":"2026-10-18T15:40:00Z"}
```

`usage` (gerado pelo importador a partir do transcript, não escrito em arquivo):

```json
{
  "ts": "2026-10-18T14:02:11Z",
  "project": "dashboard-ia",
  "chat": "c-8a2",
  "agent": "a-91c",
  "model": "claude-opus-5-5",
  "tokensIn": 1200,
  "tokensOut": 850,
  "cacheRead": 48000,
  "cacheWrite": 0
}
```

Projeto do transcript: pelo `cwd` gravado no transcript, casado com `project.repoPath`. Agente: subagente tem transcript próprio (`agent-*.jsonl`); casa pelo `session_id` + `agent.start`.

### 2.4 Extensões da S03 (usadas pelo gerador de exemplo)

O harness ainda não grava eventos. A S03 usa `npm run sample-events` (`scripts/sample-events.ts`), que converte `src/data/mock.ts` em JSONL. Para as telas ficarem iguais às da S02, o formato ganhou:

| Tipo / campo                               | Uso                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `project.register`: `backlog?`, `roadmap?` | markdown das abas Backlog e Roadmap                                             |
| `project.status`: `phase?`, `alerts?`      | a fase e os alertas vêm prontos (as regras de §4.1 ainda não rodam no servidor) |
| `project.event` (novo): `kind`, `text`     | linha de "Desde o seu último comando" (`Project.events`)                        |
| `doc.write`: `markdown?`, `date?`          | conteúdo do documento (padrão de `date`: `ts`)                                  |
| `task.start` / `sprint.plan`: `agent`      | é o **tipo** do agente (`tech-lead`\|`clone`\|`reviewer`), não o ID             |
| `task.phase`: `step`                       | `steps` = posição em `test, code, lint, review, commit` (0–4)                   |
| `usage` no arquivo de eventos: `id` + §2.2 | consumo dos projetos de exemplo; o Dashboard IA usa os transcripts reais        |

Regras do importador (`server/events.ts`): linha sem `v: 1`, `ts` válido, `project` ou `type` vai para `import_error`; tarefa sem `sprint` e sem `chat` também. `project.status` e `limit` mais antigos que o já importado são ignorados. `project: "*"` não cria projeto.

## 3. Esquema SQLite

Implementado em `server/db.ts`, com estas colunas a mais: `project.backlog`, `project.roadmap`, `project.phase_json`, `project.alerts_json` e `doc.markdown` (ver §2.4).

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

- **`GET /api/data`** devolve o `Data` de `src/data/types.ts` inteiro (cerca de 27 KB com 5 projetos), montado em `server/data.ts`. As regras de fase, alertas, ociosos e "desde o último comando" continuam no front, que já as testa. Os endpoints por tela de §4.2–4.4 ficam para quando o tamanho ou a velocidade pedirem.
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
`nextStep`: o de `project.status` se for mais novo que o último evento de sprint; senão o padrão derivado de `phase`.

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
