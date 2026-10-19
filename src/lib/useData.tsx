import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import type { Data } from "../data/types";

const POLL_MS = 5000;

interface DataState {
  data: Data;
  offlineSince?: number; // time of the first failed fetch since the last success
  refresh: () => void;
}

const Ctx = createContext<DataState | null>(null);

/** Polls GET /api/data every 5 s while the tab is visible; `initial` (tests) skips fetching. */
export function DataProvider({ initial, children }: { initial?: Data; children: ReactNode }) {
  const [data, setData] = useState(initial);
  const [offlineSince, setOfflineSince] = useState<number>();

  const refresh = useCallback(() => {
    if (initial) return;
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Data>;
      })
      .then((d) => {
        setData(d);
        setOfflineSince(undefined);
      })
      .catch(() => setOfflineSince((s) => s ?? Date.now()));
  }, [initial]);

  useEffect(() => {
    if (initial) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (document.visibilityState === "hidden") return;
      refresh();
      timer = setInterval(refresh, POLL_MS);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [initial, refresh]);

  if (!data) return <p className="wrap">Carregando…</p>;
  return <Ctx value={{ data, offlineSince, refresh }}>{children}</Ctx>;
}

export function useData() {
  const ctx = use(Ctx);
  if (!ctx) throw new Error("useData outside DataProvider");
  return ctx;
}
