import { Navigate, Route, Routes } from "react-router";
import { Layout, ProjectLayout } from "../components/Layout";
import { ControlDraft } from "./ControlDraft";
import { ChatsDraft, DocsDraft, SprintsDraft } from "./ProjectsDraftA";
import { BacklogDraft, RoadmapDraft, UsageDraft } from "./ProjectsDraftB";

// S06 drafts: separate entry (drafts.html) with fake data; the production app never loads this.
export function DraftRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="rascunho/controle" element={<ControlDraft />} />
        <Route path="p/:projectId" element={<ProjectLayout />}>
          <Route path="rascunho/chats" element={<ChatsDraft />} />
          <Route path="rascunho/sprints" element={<SprintsDraft />} />
          <Route path="rascunho/docs" element={<DocsDraft />} />
          <Route path="rascunho/backlog" element={<BacklogDraft />} />
          <Route path="rascunho/roadmap" element={<RoadmapDraft />} />
          <Route path="rascunho/usage" element={<UsageDraft />} />
        </Route>
        <Route path="*" element={<Navigate to="/rascunho/controle" replace />} />
      </Route>
    </Routes>
  );
}
