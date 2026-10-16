import { useParams } from "react-router";
import { data } from "../data/mock";

export const findProject = (id?: string) => data.projects.find((p) => p.id === id);

/** Project of the current /p/:projectId route; ProjectLayout guarantees it exists. */
export function useProject() {
  const project = findProject(useParams().projectId);
  if (!project) throw new Error("useProject outside a valid project route");
  return project;
}
