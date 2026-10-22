import s from "../components/ui.module.css";
import { Empty, mainSprint, Panel } from "../components/ui";
import { useBoard } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";

const D = 86_400_000;

export function IdleList() {
  const { data } = useData();
  const { idle, promote } = useBoard();
  const now = useNow();
  if (!idle.length)
    return (
      <Empty title="Nenhum projeto ocioso">Projetos parados há mais de 7 dias aparecem aqui.</Empty>
    );
  return (
    <ul className={s.idleList}>
      {idle.map((x) => (
        <li key={x.id}>
          <span>{x.name}</span>
          <span className={s.muted}>
            {mainSprint(data, x.id)?.id ?? "sem sprint"} · parado há{" "}
            {Math.floor((now - Date.parse(x.lastActivityAt)) / D)} dias
          </span>
          <button type="button" className={s.btn} data-kind="ghost" onClick={() => promote(x.id)}>
            Trazer para ativos
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Idle() {
  const { idle } = useBoard();
  return (
    <>
      <div className={s.pageHead}>
        <h1>Ociosos</h1>
        <p className={s.muted}>
          Projetos sem atividade há mais de 7 dias, ou além dos 3 mais ativos, saem da lista de
          ativos. Traga um de volta quando for retomar.
        </p>
      </div>
      <Panel title={`Ociosos (${idle.length})`} wide>
        <IdleList />
      </Panel>
    </>
  );
}
