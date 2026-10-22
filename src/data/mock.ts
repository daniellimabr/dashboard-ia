import type { Agent, Chat, Data, Doc, Project, Sprint, Task, UsageDay } from "./types";

// Times are relative to load time so "running now" always looks live.
// The draft's clock reads 14:50; `at(h, m)` is that time of day, `days` back.
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const daysAgo = (d: number) => ago(d * 24 * 60);
const NOW_MIN = 14 * 60 + 50;
const at = (h: number, m: number, days = 0) => ago(days * 1440 + NOW_MIN - h * 60 - m);

const doneTask = (id: string, title: string, startMin: number, durMin: number): Task => ({
  id,
  title,
  done: true,
  startedAt: ago(startMin),
  endedAt: ago(startMin - durMin),
  review: "pass",
});

const plan = (start: number, duration: number, deps: string[] = []) => ({ start, duration, deps });

const projects: Project[] = [
  {
    id: "dashboard-ia",
    name: "Dashboard IA",
    lastActivityAt: at(14, 41),
    phase: { label: "Execução", tone: "run", live: true },
    nextStep: {
      title: "Nada para você agora",
      detail: "A S02 segue sozinha. Você será chamado para testar a entrega.",
      action: "Ver a sprint",
    },
    whereStopped:
      "A S01 entregou o primeiro rascunho navegável com dados de exemplo. A S02 redesenha o painel em 3 telas; a onda 2 está rodando.",
    alerts: [
      {
        tone: "bad",
        title: "Reviewer reprovou T02",
        detail: "1ª reprovação · faltou teste do tema escuro",
      },
    ],
    events: [
      { at: at(16, 40, 3), kind: "ok", text: "S01 entregue para teste" },
      { at: at(11, 32), kind: "ok", text: "Fora da sprint: hook post-edit ajustado" },
      { at: at(13, 58), kind: "ok", text: "T01 concluída e aprovada" },
      { at: at(14, 22), kind: "bad", text: "T02 reprovada pelo Reviewer (1/2)" },
      { at: at(14, 41), kind: "run", text: "2 clones começaram a onda 2" },
    ],
    backlog: `# Backlog — Dashboard IA

- **[alta]** Servidor local + SQLite + importador de eventos.
- **[alta]** Ligar telas aos dados reais (a cada 5 s).
- **[alta]** Consumo real em tokens e US$.
- **[média]** Documentos lidos dos repos, com link para abrir no VS Code.
- **[baixa]** Ações pelo painel (aprovar sprint, dar retorno).
`,
    roadmap: `# Roadmap — Dashboard IA

## Agora
- S02 — Design do front do painel.

## Próximo
- Servidor local + SQLite + importador de eventos.
- Telas ligadas a dados reais.

## Depois
- Versão online.
`,
  },
  {
    id: "main-harness",
    name: "Main Harness",
    lastActivityAt: at(14, 25),
    phase: { label: "Esperando você", tone: "warn" },
    nextStep: {
      title: "Testar a entrega da S05",
      detail: "Rode um projeto e confira se os eventos aparecem em ~/.main-harness/events.",
      action: "Abrir instruções de teste",
    },
    whereStopped:
      "O harness passou a gravar eventos em arquivo para o Dashboard IA. As 5 tarefas estão feitas e revisadas; falta só o seu teste.",
    alerts: [
      { tone: "warn", title: "Testar a entrega da S05", detail: "pronta desde 12:31" },
      { tone: "warn", title: "2 pedidos novos no inbox", detail: "do Dashboard IA" },
    ],
    events: [
      { at: at(12, 20), kind: "ok", text: "5/5 tarefas concluídas, 0 reprovações" },
      { at: at(12, 31), kind: "warn", text: "Entrega pronta, esperando seu teste" },
      { at: at(12, 40), kind: "warn", text: "2 pedidos novos no inbox" },
      { at: at(14, 25), kind: "run", text: "Fora da sprint: investigação do limite em andamento" },
    ],
    backlog: `# Backlog — Main Harness

- **[alta]** Registro central de projetos com ID fixo.
- **[média]** Comando \`hx status\` mais curto.
`,
    roadmap: `# Roadmap — Main Harness

## Agora
- S05 — Eventos em arquivo para o Dashboard IA.

## Próximo
- Registro central de projetos.
`,
  },
  {
    id: "financas-casa",
    name: "Finanças Casa",
    lastActivityAt: at(14, 35),
    phase: { label: "Plano", tone: "warn" },
    nextStep: {
      title: "Aprovar o sprint plan S03",
      detail: "4 tarefas, previsão de 40 min. Depois disso a sprint roda sozinha.",
      action: "Ler o plano",
    },
    whereStopped:
      "A S02 criou as categorias de gasto. A S03 vai importar o extrato do banco em CSV; o plano está pronto para você ler.",
    alerts: [
      { tone: "warn", title: "Aprovar sprint plan S03", detail: "4 tarefas · previsão 40 min" },
    ],
    events: [{ at: at(14, 35), kind: "warn", text: "Plano S03 escrito, esperando aprovação" }],
    backlog: `# Backlog — Finanças Casa

- **[alta]** Importar extrato em CSV.
- **[média]** Gráfico mensal por categoria.
- **[baixa]** Alerta de gasto acima da média.
`,
    roadmap: `# Roadmap — Finanças Casa

## Agora
- S03 — Importar extrato do banco.
`,
  },
  {
    id: "bot-telegram",
    name: "Bot Telegram",
    lastActivityAt: daysAgo(9),
    backlog: `# Backlog — Bot Telegram

- **[baixa]** Comando /resumo semanal.
`,
    roadmap: `# Roadmap — Bot Telegram

## Agora
- Nada em andamento.
`,
  },
  {
    id: "planilha-orcamento",
    name: "Planilha Orçamento",
    lastActivityAt: daysAgo(23),
    backlog: `# Backlog — Planilha Orçamento

- **[baixa]** Exportar para CSV.
`,
    roadmap: `# Roadmap — Planilha Orçamento

## Agora
- Nada em andamento.
`,
  },
];

const s01Tasks: Task[] = [
  doneTask("T01", "Base: Vite/React/Vitest, tipos, dados de exemplo e layout", 3 * 1440, 85),
  doneTask("T02", "Tela Visão geral", 3 * 1440 - 90, 30),
  doneTask("T03", "Telas Chats", 3 * 1440 - 90, 35),
  doneTask("T04", "Telas Sprints", 3 * 1440 - 90, 32),
  doneTask("T05", "Telas Backlog/Roadmap e Documentos", 3 * 1440 - 130, 25),
  doneTask("T06", "Tela Consumo", 3 * 1440 - 130, 28),
  doneTask("T07", "ADR 0001 — arquitetura do painel", 3 * 1440, 20),
  doneTask("T08", "Revisão final", 3 * 1440 - 170, 20),
];

const s02Tasks: Task[] = [
  {
    ...doneTask("T01", "Base visual: tokens, fontes e menu das 3 telas", 0, 0),
    startedAt: at(13, 40),
    endedAt: at(13, 58),
    agent: "tech-lead",
    plan: plan(0, 30),
    wave: 1,
  },
  {
    id: "T02",
    title: "Tela Bem-vindo de volta",
    done: false,
    startedAt: at(13, 45),
    endedAt: at(14, 20),
    review: "fail",
    agent: "clone",
    steps: 3,
    plan: plan(30, 40, ["T01"]),
    wave: 2,
  },
  {
    id: "T03",
    title: "Sala de controle: colunas, alertas, agentes",
    done: false,
    startedAt: at(14, 38),
    agent: "clone",
    steps: 2,
    plan: plan(30, 40, ["T01"]),
    wave: 2,
  },
  {
    id: "T04",
    title: "Linha do tempo",
    done: false,
    startedAt: at(14, 41),
    agent: "clone",
    steps: 1,
    plan: plan(30, 40, ["T01"]),
    wave: 2,
  },
  {
    id: "T05",
    title: "Tela Ociosos e regra de saída",
    done: false,
    plan: plan(70, 20, ["T03"]),
    wave: 3,
  },
  {
    id: "T06",
    title: "Acordeões Resumo da sprint e Tarefas",
    done: false,
    plan: plan(70, 20, ["T03", "T04"]),
    wave: 3,
  },
  {
    id: "T07",
    title: "Revisão e teste visual",
    done: false,
    agent: "reviewer",
    plan: plan(90, 30, ["T02", "T05", "T06"]),
    wave: 4,
  },
];

const mhTask = (
  id: string,
  title: string,
  agent: Task["agent"],
  s: [number, number],
  e: [number, number],
  p: ReturnType<typeof plan>,
  wave: number,
): Task => ({
  id,
  title,
  done: true,
  review: "pass",
  startedAt: at(...s),
  endedAt: at(...e),
  agent,
  plan: p,
  wave,
});

const s05Tasks: Task[] = [
  mhTask("T01", "Formato dos eventos (ADR 0007)", "tech-lead", [10, 5], [10, 20], plan(0, 20), 1),
  mhTask(
    "T02",
    "Gravar eventos de tarefa e sprint",
    "clone",
    [10, 30],
    [11, 50],
    plan(20, 40, ["T01"]),
    2,
  ),
  mhTask(
    "T03",
    "Gravar eventos de agentes e consumo",
    "clone",
    [10, 32],
    [11, 40],
    plan(20, 40, ["T01"]),
    2,
  ),
  mhTask(
    "T04",
    "Rotação dos arquivos de eventos",
    "tech-lead",
    [11, 45],
    [12, 0],
    plan(60, 20, ["T02", "T03"]),
    3,
  ),
  mhTask("T05", "Revisão", "reviewer", [12, 0], [12, 20], plan(80, 30, ["T04"]), 4),
];

const fcTasks: Task[] = [
  { id: "T01", title: "Leitor de CSV do banco", done: false, plan: plan(0, 15), wave: 1 },
  {
    id: "T02",
    title: "Associar lançamentos às categorias",
    done: false,
    plan: plan(15, 15, ["T01"]),
    wave: 2,
  },
  { id: "T03", title: "Tela de importação", done: false, plan: plan(15, 10, ["T01"]), wave: 2 },
  {
    id: "T04",
    title: "Revisão",
    done: false,
    agent: "reviewer",
    plan: plan(30, 10, ["T02", "T03"]),
    wave: 3,
  },
];

const sprints: Sprint[] = [
  {
    id: "S01",
    projectId: "dashboard-ia",
    title: "Draft do front do painel",
    status: "closed",
    startedAt: at(13, 0, 3),
    closedAt: at(17, 10, 2),
    tasks: s01Tasks,
  },
  {
    id: "S02",
    projectId: "dashboard-ia",
    title: "Layout da tela principal",
    goal: "Fechar o design do front em 3 telas (Bem-vindo, Sala de controle, Linha do tempo), com dados de exemplo.",
    status: "active",
    approvedAt: at(13, 35),
    startedAt: at(13, 40),
    plannedMin: 220,
    usd: 3.1,
    tasks: s02Tasks,
  },
  {
    id: "S03",
    projectId: "main-harness",
    title: "Comando hx run",
    status: "closed",
    startedAt: daysAgo(9),
    closedAt: daysAgo(8),
    tasks: [
      doneTask("T01", "Filtro de saída do hx run", 9 * 1440, 70),
      doneTask("T02", "Resumo de falhas", 9 * 1440 - 80, 45),
      { ...doneTask("T03", "Testes no Windows", 9 * 1440 - 130, 50), review: "fail" },
    ],
  },
  {
    id: "S04",
    projectId: "main-harness",
    title: "Registro central de projetos",
    status: "closed",
    startedAt: daysAgo(4),
    closedAt: daysAgo(4),
    tasks: [
      doneTask("T01", "Registro com ID fixo", 4 * 1440, 60),
      doneTask("T02", "Comando hx projects", 4 * 1440 - 65, 35),
    ],
  },
  {
    id: "S05",
    projectId: "main-harness",
    title: "Eventos em arquivo",
    goal: "Gravar todos os eventos do harness em arquivo, para o Dashboard IA ler.",
    status: "active",
    approvedAt: at(10, 0),
    startedAt: at(10, 5),
    deliveredAt: at(12, 31),
    plannedMin: 150,
    usd: 5.62,
    tasks: s05Tasks,
  },
  {
    id: "S03",
    projectId: "financas-casa",
    title: "Importar extrato do banco",
    goal: "Importar o extrato do banco em CSV e já classificar os gastos.",
    status: "planned",
    plannedMin: 40,
    usd: 0.84,
    tasks: fcTasks,
  },
  {
    id: "S04",
    projectId: "bot-telegram",
    title: "Respostas com botões",
    status: "closed",
    startedAt: daysAgo(10),
    closedAt: daysAgo(9),
    tasks: [doneTask("T01", "Teclado inline", 10 * 1440, 40)],
  },
];

const agent = (
  id: string,
  kind: Agent["kind"],
  name: string,
  startedAt: string,
  extra: Partial<Agent> = {},
): Agent => ({
  id,
  kind,
  name,
  startedAt,
  ...extra,
});

const chats: Chat[] = [
  {
    id: "c-dash-2",
    projectId: "dashboard-ia",
    title: "Executar sprint S02",
    startedAt: at(13, 40),
    sprintId: "S02",
    tasks: s02Tasks,
    agents: [
      agent("a1", "tech-lead", "Tech Lead", at(13, 40), {
        doing: "coordena a onda 2",
        contextPct: 38,
      }),
      agent("a2", "reviewer", "Reviewer", at(14, 10), {
        task: "T02",
        doing: "revisão da T02",
        endedAt: at(14, 22),
      }),
      agent("a3", "clone", "Clone 1", at(14, 38), {
        task: "T03",
        doing: "T03 cards",
        contextPct: 21,
      }),
      agent("a4", "clone", "Clone 2", at(14, 41), {
        task: "T04",
        doing: "T04 linha do tempo",
        contextPct: 15,
      }),
    ],
  },
  {
    id: "c-dash-hook",
    projectId: "dashboard-ia",
    title: "hook lento",
    startedAt: at(11, 20),
    endedAt: at(11, 32),
    agents: [agent("a5", "tech-lead", "Tech Lead", at(11, 20), { endedAt: at(11, 32) })],
    tasks: [
      {
        id: "A1",
        title: "Ajustar hook post-edit (lento no Windows)",
        done: true,
        agent: "tech-lead",
        startedAt: at(11, 20),
        endedAt: at(11, 32),
      },
    ],
  },
  {
    id: "c-dash-1",
    projectId: "dashboard-ia",
    title: "Executar sprint S01",
    startedAt: at(13, 0, 3),
    endedAt: at(17, 16, 2),
    sprintId: "S01",
    tasks: s01Tasks,
    agents: [
      agent("a6", "tech-lead", "Tech Lead", at(13, 0, 3), { endedAt: at(17, 16, 2) }),
      agent("a7", "clone", "Clone 1", at(14, 30, 3), { task: "T02", endedAt: at(15, 0, 3) }),
    ],
  },
  {
    id: "c-mh-5",
    projectId: "main-harness",
    title: "Executar sprint S05",
    startedAt: at(10, 5),
    endedAt: at(12, 30),
    sprintId: "S05",
    tasks: s05Tasks,
    agents: [
      agent("a8", "tech-lead", "Tech Lead", at(10, 5), { endedAt: at(12, 30) }),
      agent("a9", "clone", "Clone 1", at(10, 30), { task: "T02", endedAt: at(11, 50) }),
      agent("a10", "clone", "Clone 2", at(10, 32), { task: "T03", endedAt: at(11, 40) }),
      agent("a11", "reviewer", "Reviewer", at(12, 0), { task: "T05", endedAt: at(12, 20) }),
    ],
  },
  {
    id: "c-mh-handoff",
    projectId: "main-harness",
    title: "dúvida handoff",
    startedAt: at(13, 2),
    endedAt: at(13, 9),
    agents: [agent("a12", "tech-lead", "Tech Lead", at(13, 2), { endedAt: at(13, 9) })],
    tasks: [
      {
        id: "A1",
        title: "Responder dúvida sobre hx handoff",
        done: true,
        agent: "tech-lead",
        startedAt: at(13, 2),
        endedAt: at(13, 9),
      },
    ],
  },
  {
    id: "c-mh-limit",
    projectId: "main-harness",
    title: "limite assinatura",
    startedAt: at(14, 25),
    agents: [
      agent("a13", "tech-lead", "Tech Lead", at(14, 25), {
        doing: "fora da sprint: limite da assinatura",
        contextPct: 12,
      }),
    ],
    tasks: [
      {
        id: "A2",
        title: "Investigar a fonte do % do limite da assinatura",
        done: false,
        agent: "tech-lead",
        startedAt: at(14, 25),
      },
    ],
  },
  {
    id: "c-fc-3",
    projectId: "financas-casa",
    title: "Plano da S03",
    startedAt: at(14, 20),
    endedAt: at(14, 35),
    sprintId: "S03",
    agents: [agent("a14", "tech-lead", "Tech Lead", at(14, 20), { endedAt: at(14, 35) })],
    tasks: [],
  },
  {
    id: "c-bot-4",
    projectId: "bot-telegram",
    title: "Executar sprint S04",
    startedAt: daysAgo(10),
    endedAt: daysAgo(9),
    sprintId: "S04",
    agents: [agent("a15", "tech-lead", "Tech Lead", daysAgo(10), { endedAt: daysAgo(9) })],
    tasks: [],
  },
];

// Last 7 days match the draft's sparklines; the 7 before are plausible filler.
const lastWeek: Record<string, number[]> = {
  "dashboard-ia": [0.4, 1.2, 0.9, 2.1, 0.3, 4.28, 3.1],
  "main-harness": [2.2, 3.0, 1.1, 0, 2.8, 4.9, 5.62],
  "financas-casa": [0, 0, 0.6, 0, 0, 0, 0.84],
  "bot-telegram": [0, 0, 0, 0, 0, 0, 0],
  "planilha-orcamento": [0, 0, 0, 0, 0, 0, 0],
};
const usage: UsageDay[] = Object.entries(lastWeek).flatMap(([projectId, week]) =>
  [...week.map((v) => Math.round(v * 70) / 100), ...week].map((usd, i) => ({
    projectId,
    date: daysAgo(13 - i).slice(0, 10),
    tokens: Math.round(usd * 612_000),
    usd,
  })),
);

const doc = (
  id: string,
  projectId: string,
  kind: Doc["kind"],
  title: string,
  date: string,
  body: string,
): Doc => ({
  id,
  projectId,
  kind,
  title,
  date,
  markdown: `# ${title}\n\n${body}\n`,
});

const docs: Doc[] = [
  doc(
    "S02-plan",
    "dashboard-ia",
    "sprint-plan",
    "S02 — Layout da tela principal",
    at(13, 30),
    "## Objetivo\nFechar o design do front em 3 telas, com dados de exemplo.",
  ),
  doc(
    "S01-report",
    "dashboard-ia",
    "release-report",
    "S01 — Draft do front do painel",
    at(17, 10, 2),
    "- **Tarefas:** 8/8 entregues.\n\n## Retrospectiva\nO rascunho navegável ajudou a decidir o desenho.",
  ),
  {
    id: "S01-plan",
    projectId: "dashboard-ia",
    kind: "sprint-plan",
    title: "S01 — Draft do front do painel",
    date: at(12, 0, 3),
    markdown: `# S01 — Draft do front do painel

## Objetivo
Site local navegável com todas as telas principais e dados de exemplo.

## Tarefas
| Id | Tarefa | Agente |
|---|---|---|
| T01 | Base | tech-lead |
| T02 | Visão geral | clone |
| T03 | Chats | clone |
`,
  },
  doc(
    "adr-0001",
    "dashboard-ia",
    "adr",
    "ADR 0001 — Arquitetura do painel",
    at(12, 0, 3),
    "**Decisão:** eventos em arquivo → importador → SQLite embutido do Node → servidor local → React.\n\n- Sem banco externo.\n- Tudo local.",
  ),
  doc(
    "prd-0001",
    "dashboard-ia",
    "prd",
    "PRD 0001 — Painel de acompanhamento",
    at(11, 0, 3),
    "## Problema\nDaniel não vê, num lugar só, o que a IA está fazendo em cada projeto.\n\n## Critérios de aceite\n1. Ver agentes rodando agora.\n2. Ver consumo por projeto.",
  ),
  doc(
    "S05-plan",
    "main-harness",
    "sprint-plan",
    "S05 — Eventos em arquivo",
    at(18, 0, 1),
    "## Objetivo\nGravar todos os eventos do harness em arquivo, para o Dashboard IA ler.",
  ),
  doc(
    "S04-report",
    "main-harness",
    "release-report",
    "S04 — Registro central de projetos",
    daysAgo(4),
    "- **Tarefas:** 2/2 entregues.\n\n## Retrospectiva\nO ID fixo simplificou o painel.",
  ),
  doc(
    "adr-0007",
    "main-harness",
    "adr",
    "ADR 0007 — Formato dos eventos (JSONL)",
    at(18, 30, 1),
    "**Decisão:** um evento por linha, em JSONL, rotacionado por dia.",
  ),
  doc(
    "handoff-T03",
    "main-harness",
    "handoff",
    "Handoff T03 — contexto cheio, retomado",
    at(11, 10),
    "## Estado\nEventos de agentes gravados; falta consumo.",
  ),
  doc(
    "S03-plan",
    "financas-casa",
    "sprint-plan",
    "S03 — Importar extrato do banco",
    at(14, 35),
    "## Objetivo\nImportar o extrato do banco em CSV e já classificar os gastos.",
  ),
  doc(
    "S02-report-fc",
    "financas-casa",
    "release-report",
    "S02 — Categorias de gasto",
    daysAgo(7),
    "- **Tarefas:** 3/3 entregues.",
  ),
  doc(
    "prd-0001-fc",
    "financas-casa",
    "prd",
    "PRD 0001 — Controle de gastos",
    daysAgo(16),
    "## Problema\nGastos da casa espalhados em vários lugares.",
  ),
];

export const data: Data = {
  lastCommand: { at: at(17, 16, 2), chatId: "c-dash-1" },
  limits: {
    h5: { pct: 62, resetsAt: ago(-100) },
    week: { pct: 41, resetsAt: ago(-(3 * 1440 + 18 * 60 + 10)) },
    h5Usd: 17,
  },
  projects,
  chats,
  sprints,
  usage,
  docs,
};
