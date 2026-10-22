import { useOutletContext } from "react-router";
import type { Project } from "../data/types";

/** Shared by every screen: active/idle split, the project picked in the menu, and "Trazer para ativos". */
export interface Board {
  active: Project[];
  idle: Project[];
  project?: Project; // the /p/:projectId project, else the one picked in the menu, else the first active
  promote: (id: string) => void;
}

export const useBoard = () => useOutletContext<Board>();
