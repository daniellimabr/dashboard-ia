import { Navigate, Route, Routes } from "react-router";
import { Layout, ProjectLayout } from "./components/Layout";
import { Backlog } from "./pages/Backlog";
import { Chats } from "./pages/Chats";
import { Components } from "./pages/Components";
import { Control } from "./pages/Control";
import { Docs } from "./pages/Docs";
import { Home } from "./pages/Home";
import { Idle } from "./pages/Idle";
import { Roadmap } from "./pages/Roadmap";
import { Sprints } from "./pages/Sprints";
import { Timeline } from "./pages/Timeline";
import { Usage } from "./pages/Usage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="controle" element={<Control />} />
        <Route path="tempo" element={<Timeline />} />
        <Route path="ociosos" element={<Idle />} />
        <Route path="componentes" element={<Components />} />
        <Route path="p/:projectId" element={<ProjectLayout />}>
          <Route index element={<Navigate to="chats" replace />} />
          <Route path="chats/:chatId?" element={<Chats />} />
          <Route path="sprints/:sprintId?" element={<Sprints />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="docs/:docId?" element={<Docs />} />
          <Route path="usage" element={<Usage />} />
        </Route>
        <Route path="*" element={<h1>Página não encontrada</h1>} />
      </Route>
    </Routes>
  );
}
