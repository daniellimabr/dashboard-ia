import { data } from "../data/mock";
import { formatUsd } from "../lib/format";
import { useBoard } from "../lib/useBoard";
import { useNow } from "../lib/useNow";
import s from "./Idle.module.css";

const DAY = 86_400_000;

export function Idle() {
  const { idle, promote } = useBoard();
  const now = useNow();
  const weekStart = new Date(now - 6 * DAY).toISOString().slice(0, 10);
  return (
    <div className={s.idle}>
      <h1 className={s.title}>Ociosos</h1>
      <p className={s.note}>
        Projetos sem atividade há mais de 7 dias saem das telas principais. Quando um projeto novo
        chega e já há 3 ativos, o menos ativo vem para cá. Para trazer de volta, basta um clique.
      </p>
      {idle.length === 0 && <p className="muted">Nenhum projeto ocioso.</p>}
      {idle.map((p) => {
        const sprint = data.sprints.filter((x) => x.projectId === p.id).at(-1);
        const days = Math.floor((now - Date.parse(p.lastActivityAt)) / DAY);
        const usd = data.usage
          .filter((u) => u.projectId === p.id && u.date >= weekStart)
          .reduce((sum, u) => sum + u.usd, 0);
        return (
          <div key={p.id} className={s.it}>
            <div>
              <h2>{p.name}</h2>
              <small>
                {sprint
                  ? `${sprint.id} ${sprint.status === "closed" ? "fechada" : "aberta"}`
                  : "sem sprint"}{" "}
                · última atividade há {days} {days === 1 ? "dia" : "dias"}
              </small>
            </div>
            <span className={`muted num ${s.usd}`}>{formatUsd(usd)} na semana</span>
            <button type="button" onClick={() => promote(p.id)}>
              Trazer para ativos
            </button>
          </div>
        );
      })}
    </div>
  );
}
