import { Navigate, Route, Routes } from "react-router-dom";
import { AgentArchitectShell } from "./features/agentArchitect/components/AgentArchitectShell";
import SuccessScreen from "./features/agentArchitect/components/SuccessScreen";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/agent-architect" replace />} />
      <Route path="/agent-architect" element={<AgentArchitectShell />} />
      <Route path="/success" element={<SuccessScreen />} />
    </Routes>
  );
}
