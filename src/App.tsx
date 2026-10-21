import { Navigate, Route, Routes } from "react-router";
import { Layout, ProjectLayout } from "./components/Layout";
import { ControlDraft } from "./drafts/ControlDraft";
import { ChatsDraft, DocsDraft, SprintsDraft } from "./drafts/ProjectsDraftA";
import { BacklogDraft, RoadmapDraft, UsageDraft } from "./drafts/ProjectsDraftB";
import { Chats } from "./pages/Chats";
import { Control } from "./pages/Control";
import { Docs } from "./pages/Docs";
import { Idle } from "./pages/Idle";
import { Plan } from "./pages/Plan";
import { Projects } from "./pages/Projects";
import { Sprints } from "./pages/Sprints";
import { Timeline } from "./pages/Timeline";
import { Usage } from "./pages/Usage";
import { Welcome } from "./pages/Welcome";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Welcome />} />
        <Route path="controle" element={<Control />} />
        <Route path="tempo" element={<Timeline />} />
        <Route path="ociosos" element={<Idle />} />
        <Route path="projetos" element={<Projects />} />
        <Route path="p/:projectId" element={<ProjectLayout />}>
          <Route index element={<Navigate to="chats" replace />} />
          <Route path="chats/:chatId?" element={<Chats />} />
          <Route path="sprints/:sprintId?" element={<Sprints />} />
          <Route path="plan" element={<Plan />} />
          <Route path="docs/:docId?" element={<Docs />} />
          <Route path="usage" element={<Usage />} />
          <Route path="rascunho/chats" element={<ChatsDraft />} />
          <Route path="rascunho/sprints" element={<SprintsDraft />} />
          <Route path="rascunho/docs" element={<DocsDraft />} />
          <Route path="rascunho/backlog" element={<BacklogDraft />} />
          <Route path="rascunho/roadmap" element={<RoadmapDraft />} />
          <Route path="rascunho/usage" element={<UsageDraft />} />
        </Route>
        <Route path="rascunho/controle" element={<ControlDraft />} />
        <Route path="*" element={<h1>Página não encontrada</h1>} />
      </Route>
    </Routes>
  );
}
