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
const NjordMissionControl = lazy(() =>
  import("./features/missioncontrol/components/njordmissioncontrol").then((module) => ({
    default: module.NjordMissionControl
  }))
);
const NjordShell = lazy(() =>
  import("./features/missioncontrol/components/njordshell").then((module) => ({
    default: module.NjordShell
  }))
);
const MissionControlGate = lazy(() =>
  import("./features/missioncontrol/components/missioncontrolgate").then((module) => ({
    default: module.MissionControlGate
  }))
);
const MissionControlHome = lazy(() =>
  import("./features/missioncontrol/components/missioncontrolhome").then((module) => ({
    default: module.MissionControlHome
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

        {/* Operator: Lead sessions view — password-gated */}
        <Route
          path="/admin/sessions"
          element={
            <AdminGate>
              <SessionsView />
            </AdminGate>
          }
        />

        {/* Mission Control client registry home */}
        <Route
          path="/mission-control/clients"
          element={
            <AdminGate>
              <MissionControlHome />
            </AdminGate>
          }
        />

        {/* Aquatrace workspace — canonical URL; Njord is tab #1 (Chat) */}
        <Route
          path="/mission-control/aquatrace/workspace"
          element={
            <AdminGate>
              <MissionControlGate>
                <NjordShell />
              </MissionControlGate>
            </AdminGate>
          }
        />

        {/* Old case-study URL — redirect to canonical workspace */}
        <Route
          path="/mission-control/aquatrace-case-study"
          element={<Navigate to="/mission-control/aquatrace/workspace" replace />}
        />

        {/* Legacy direct chat route — backwards compat */}
        <Route
          path="/mission-control"
          element={
            <AdminGate>
              <MissionControlGate>
                <NjordMissionControl />
              </MissionControlGate>
            </AdminGate>
          }
        />
      </Routes>
    </Suspense>
  );
}
