import { useState } from "react";
import {
  Accordion,
  Empty,
  Gantt,
  idleGaps,
  Meter,
  Panel,
  Pill,
  Tabs,
  TaskTable,
} from "../components/ui";
import s from "../components/ui.module.css";
import type { Task } from "../data/types";

const MIN = 60_000;
const plan = (start: number, duration: number) => ({ start, duration, deps: [] });
const DEMO_T0 = Date.now() - 30 * MIN; // demo sprint started 30 min before load
const ago = (m: number) => new Date(DEMO_T0 + m * MIN).toISOString();
const DEMO: Task[] = [
  {
    id: "T01",
    title: "Feita e aprovada",
    done: true,
    startedAt: ago(0),
    endedAt: ago(9),
    review: "pass",
    plan: plan(0, 10),
    wave: 1,
  },
  {
    id: "T02",
    title: "Reprovada na revisão",
    done: false,
    startedAt: ago(10),
    endedAt: ago(19),
    steps: 3,
    review: "fail",
    plan: plan(10, 12),
    wave: 2,
  },
  {
    id: "T03",
    title: "Rodando",
    done: false,
    startedAt: ago(24),
    steps: 1,
    plan: plan(10, 8),
    wave: 2,
  },
  { id: "T04", title: "A fazer", done: false, plan: plan(22, 6), wave: 3 },
];
const DEMO_IDLE = idleGaps(DEMO, DEMO_T0, DEMO_T0 + 30 * MIN);

export function Components() {
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  return (
    <>
      <div className={s.pageHead}>
        <h1>Componentes</h1>
        <p className={s.muted}>As peças com que as telas do painel são montadas.</p>
      </div>
      <div className={s.board}>
        <Panel title="Botões">
          <div className={s.row}>
            <button type="button" className={s.btn}>
              Aprovar sprint
            </button>
            <button type="button" className={s.btn} data-kind="ghost">
              Trazer para ativos
            </button>
            <button type="button" className={s.btn} disabled>
              Fechar sprint
            </button>
          </div>
        </Panel>
        <Panel title="Selos de estado">
          <div className={s.row}>
            <Pill tone="ok">feita</Pill>
            <Pill tone="run" live>
              Execução
            </Pill>
            <Pill tone="warn">aguardando teste</Pill>
            <Pill tone="bad">reprovada</Pill>
            <Pill>planejada</Pill>
          </div>
        </Panel>
        <Panel title="Cartão (painel)" aside={<Pill tone="run">ativa</Pill>}>
          <p>
            Todo conteúdo vive em painéis, com título à esquerda e estado à direita. O painel do
            projeto em foco ocupa a largura toda.
          </p>
        </Panel>
        <Panel title="Medidores">
          <div className={s.stack}>
            <Meter label="Medidor em 35%" pct={35} tone="run" />
            <Meter label="Medidor em 65%" pct={65} />
            <Meter label="Medidor em 90%" pct={90} />
            <Meter label="Medidor sem dado" />
            <Meter label="Medidor com valor na barra" pct={60} tone="run" showValue />
          </div>
        </Panel>
        <Panel title="Abas">
          <Tabs
            label="Sprints"
            items={[
              ["a", "S08 · ativa"],
              ["b", "S07 · fechada"],
              ["c", "S06 · fechada"],
            ]}
            value={tab}
            onChange={setTab}
          />
        </Panel>
        <Panel title="Estado vazio">
          <Empty title="Nenhum chat aberto">
            Abra um chat no projeto para ver os agentes aqui.
          </Empty>
        </Panel>
        <Panel title="Tabela" wide>
          <TaskTable tasks={DEMO} />
        </Panel>
        <Panel title="Acordeão">
          <Accordion
            open
            summary={
              <span className={s.accSum}>
                <b>S07</b>
                <span>Nomes dos chats</span>
              </span>
            }
          >
            <p className={s.muted}>Os detalhes da sprint aparecem ao abrir.</p>
          </Accordion>
        </Panel>
        <Panel title="Plano no tempo">
          <Gantt tasks={DEMO} start={ago(0)} waits={DEMO_IDLE} />
        </Panel>
      </div>
    </>
  );
}
