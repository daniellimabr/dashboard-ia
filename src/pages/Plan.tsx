import { Markdown } from "../components/Markdown";
import { useProject } from "../lib/useProject";

export function Plan() {
  const project = useProject();
  return (
    <div className="grid">
      <section className="card">
        <Markdown source={project.backlog} />
      </section>
      <section className="card">
        <Markdown source={project.roadmap} />
      </section>
    </div>
  );
}
