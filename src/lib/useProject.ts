import { useParams } from "react-router";
import { useData } from "./useData";

/** Project of the current /p/:projectId route, or undefined. */
export function useMaybeProject() {
  const id = useParams().projectId;
  return useData().data.projects.find((p) => p.id === id);
}

/** Project of the current /p/:projectId route; ProjectLayout guarantees it exists. */
export function useProject() {
  const project = useMaybeProject();
  if (!project) throw new Error("useProject outside a valid project route");
  return project;
}
