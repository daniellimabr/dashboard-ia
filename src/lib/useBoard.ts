import { useOutletContext } from "react-router";
import type { Project } from "../data/types";

/** Active/idle split shared by the main screens; "Trazer para ativos" lives only in this session. */
export interface Board {
  active: Project[];
  idle: Project[];
  promote: (id: string) => void;
}

export const useBoard = () => useOutletContext<Board>();
