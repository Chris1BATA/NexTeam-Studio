import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const AgentArchitectShell = lazy(() =>
  import("./features/agentArchitect/components/AgentArchitectShell").then((module) => ({
    default: module.AgentArchitectShell
  }))
);
const SuccessScreen = lazy(() => import("./features/agentArchitect/components/SuccessScreen"));
const SessionsView = lazy(() =>
  import("./features/admin/components/sessionsview").then((module) => ({
    default: module.SessionsView
  }))
);
const AdminGate = lazy(() =>
  import("./features/admin/components/admingate").then((module) => ({
    default: module.AdminGate
  }))
);

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A14",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      Loading…
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/agent-architect" replace />} />
        <Route path="/agent-architect" element={<AgentArchitectShell />} />
        <Route path="/success" element={<SuccessScreen />} />
        <Route
          path="/admin/sessions"
          element={
            <AdminGate>
              <SessionsView />
            </AdminGate>
          }
        />
      </Routes>
    </Suspense>
  );
}
