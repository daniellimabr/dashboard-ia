import { Navigate, Route, Routes } from "react-router";
import { Layout, ProjectLayout } from "./components/Layout";
import { Chats } from "./pages/Chats";
import { Docs } from "./pages/Docs";
import { Overview } from "./pages/Overview";
import { Plan } from "./pages/Plan";
import { Sprints } from "./pages/Sprints";
import { Usage } from "./pages/Usage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="p/:projectId" element={<ProjectLayout />}>
          <Route index element={<Navigate to="chats" replace />} />
          <Route path="chats/:chatId?" element={<Chats />} />
          <Route path="sprints/:sprintId?" element={<Sprints />} />
          <Route path="plan" element={<Plan />} />
          <Route path="docs/:docId?" element={<Docs />} />
          <Route path="usage" element={<Usage />} />
        </Route>
        <Route path="*" element={<h1>Página não encontrada</h1>} />
      </Route>
    </Routes>
  );
}
