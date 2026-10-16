import type { Agent, Chat, Data, Doc, Project, Sprint, Task, UsageDay } from "./types";

// Times are relative to load time so "running now" always looks live.
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const daysAgo = (d: number) => ago(d * 24 * 60);

const doneTask = (id: string, title: string, startMin: number, durMin: number): Task => ({
  id,
  title,
  done: true,
  startedAt: ago(startMin),
  endedAt: ago(startMin - durMin),
  review: "pass",
});

const projects: Project[] = [
  {
    id: "dashboard-ia",
    name: "Dashboard IA",
    backlog: `# Backlog — Dashboard IA

- **[alta]** Servidor Node local + SQLite embutido com importador dos eventos do harness.
- **[alta]** Ligar as telas aos dados reais, com atualização a cada ~5 s.
- **[alta]** Consumo real: tokens dos transcripts e custo em US$.
- **[média]** Documentos lidos dos repos, com link para abrir no VS Code.
- **[baixa]** Ações pelo painel (aprovar sprint, dar retorno).
- **[baixa]** Versão online com login.
`,
    roadmap: `# Roadmap — Dashboard IA

## Agora
- S01 — Draft navegável do painel com dados de exemplo.

## Próximo
- Servidor local + SQLite + importador de eventos.
- Telas ligadas a dados reais.

## Depois
- Histórico completo de chats.
- Versão online.
`,
  },
  {
    id: "main-harness",
    name: "Main Harness",
    backlog: `# Backlog — Main Harness

- **[alta]** Registro central de projetos com ID fixo.
- **[alta]** Gravar eventos do harness em arquivo (JSONL).
- **[média]** Comando \`hx stats\` com resumo por sprint.
`,
    roadmap: `# Roadmap — Main Harness

## Agora
- S07 — Eventos em arquivo para o Dashboard IA.

## Próximo
- Registro central de projetos.
`,
  },
  {
    id: "loja-online",
    name: "Loja Online",
    backlog: `# Backlog — Loja Online

- **[média]** Cupom de desconto no checkout.
- **[baixa]** Página de favoritos.
`,
    roadmap: `# Roadmap — Loja Online

## Agora
- Nada em andamento.

## Próximo
- Cupons de desconto.
`,
  },
];

const s01Tasks: Task[] = [
  doneTask("T01", "Base: Vite/React/Vitest, tipos, dados de exemplo e layout", 150, 85),
  doneTask("T07", "ADR 0001 — arquitetura do painel", 150, 20),
  { id: "T02", title: "Tela Visão geral", done: false, startedAt: ago(40) },
  { id: "T03", title: "Telas Chats", done: false, startedAt: ago(38) },
  { id: "T04", title: "Telas Sprints", done: false, startedAt: ago(35) },
  { id: "T05", title: "Telas Backlog/Roadmap e Documentos", done: false },
  { id: "T06", title: "Tela Consumo", done: false },
  { id: "T08", title: "Revisão final", done: false },
];

const s06Tasks: Task[] = [
  doneTask("T01", "Colunas de início, fim e duração", 3 * 1440, 60),
  doneTask("T02", "Fase da tarefa na linha 🔄", 3 * 1440 - 65, 35),
];

const sprints: Sprint[] = [
  { id: "S01", projectId: "dashboard-ia", title: "Draft do front do painel", status: "active", startedAt: ago(150), tasks: s01Tasks },
  {
    id: "S05",
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
    id: "S06",
    projectId: "main-harness",
    title: "Lista de tarefas com horários",
    status: "closed",
    startedAt: daysAgo(3),
    closedAt: daysAgo(2),
    tasks: s06Tasks,
  },
];

const running = (id: string, kind: Agent["kind"], name: string, task: string | undefined, min: number): Agent => ({
  id,
  kind,
  name,
  task,
  startedAt: ago(min),
});

const chats: Chat[] = [
  {
    id: "c-dash-1",
    projectId: "dashboard-ia",
    title: "Executar sprint S01",
    startedAt: ago(155),
    sprintId: "S01",
    tasks: s01Tasks,
    agents: [
      running("a1", "tech-lead", "Tech Lead", undefined, 155),
      { ...running("a2", "clone", "Clone T07", "T07", 150), endedAt: ago(130) },
      running("a3", "clone", "Clone T02", "T02", 40),
      running("a4", "clone", "Clone T03", "T03", 38),
      running("a5", "clone", "Clone T04", "T04", 35),
    ],
  },
  {
    id: "c-dash-0",
    projectId: "dashboard-ia",
    title: "Conversa sobre o painel e plano da S01",
    startedAt: ago(26 * 60),
    endedAt: ago(24 * 60),
    agents: [{ ...running("a6", "tech-lead", "Tech Lead", undefined, 26 * 60), endedAt: ago(24 * 60) }],
    tasks: [],
  },
  {
    id: "c-harness-6",
    projectId: "main-harness",
    title: "Executar sprint S06",
    startedAt: daysAgo(3),
    endedAt: daysAgo(2),
    sprintId: "S06",
    tasks: s06Tasks,
    agents: [
      { ...running("a7", "tech-lead", "Tech Lead", undefined, 3 * 1440), endedAt: ago(2 * 1440) },
      { ...running("a8", "reviewer", "Reviewer", "T01, T02", 3 * 1440 - 100), endedAt: ago(3 * 1440 - 120) },
    ],
  },
  {
    id: "c-harness-7",
    projectId: "main-harness",
    title: "Investigar gravação de eventos",
    startedAt: ago(25),
    agents: [running("a9", "tech-lead", "Tech Lead", undefined, 25)],
    tasks: [],
  },
  {
    id: "c-loja-1",
    projectId: "loja-online",
    title: "Corrigir cálculo de frete",
    startedAt: daysAgo(5),
    endedAt: daysAgo(5),
    agents: [{ ...running("a10", "tech-lead", "Tech Lead", undefined, 5 * 1440), endedAt: ago(5 * 1440 - 40) }],
    tasks: [doneTask("T01", "Frete grátis acima de R$ 200", 5 * 1440, 30)],
  },
];

// 14 days of deterministic, plausible spend per project.
const weights: Record<string, number> = { "dashboard-ia": 1, "main-harness": 1.6, "loja-online": 0.3 };
const usage: UsageDay[] = Object.entries(weights).flatMap(([projectId, w]) =>
  Array.from({ length: 14 }, (_, i) => {
    const tokens = Math.round(w * (400_000 + ((i * 7919 + projectId.length * 104_729) % 900_000)));
    return { projectId, date: daysAgo(13 - i).slice(0, 10), tokens, usd: Math.round(tokens * 0.0009) / 100 };
  }),
);

const docs: Doc[] = [
  {
    id: "S01-plan",
    projectId: "dashboard-ia",
    kind: "sprint-plan",
    title: "S01 — Draft do front do painel",
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
  {
    id: "adr-0001",
    projectId: "dashboard-ia",
    kind: "adr",
    title: "ADR 0001 — Arquitetura do painel",
    markdown: `# ADR 0001 — Arquitetura do painel

**Decisão:** eventos em arquivo → importador → SQLite embutido do Node → servidor local → React.

- Sem banco externo.
- Tudo local.
`,
  },
  {
    id: "prd-0001",
    projectId: "dashboard-ia",
    kind: "prd",
    title: "PRD 0001 — Painel de acompanhamento",
    markdown: `# PRD 0001 — Painel de acompanhamento

## Problema
Daniel não vê, num lugar só, o que a IA está fazendo em cada projeto.

## Critérios de aceite
1. Ver agentes rodando agora.
2. Ver consumo por projeto.
`,
  },
  {
    id: "S06-report",
    projectId: "main-harness",
    kind: "release-report",
    title: "Release Report — S06",
    markdown: `# Release Report — S06

- **Tarefas:** 2/2 entregues.
- **Duração:** 1 h 35 min (planejado 1 h 30 min).

## Retrospectiva
A fase na linha 🔄 ajudou a acompanhar a sprint.
`,
  },
];

export const data: Data = { projects, chats, sprints, usage, docs };
