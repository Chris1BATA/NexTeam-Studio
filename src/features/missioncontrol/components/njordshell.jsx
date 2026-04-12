/**
 * NjordShell — tabbed nav wrapper for the full Aquatrace Mission Control suite.
 * Tabs: Chat · Session Log · SOP Library · SOP Editor · Blueprint Library · Onboarding
 */

import { useState } from "react";
import { NjordMissionControl } from "./NjordMissionControl";
import { NjordSessionLog } from "./NjordSessionLog";
import { SOPLibrary } from "./SOPLibrary";
import { SOPEditor } from "./SOPEditor";
import { BlueprintLibrary } from "./BlueprintLibrary";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { NJORD_CONFIG, isCaseStudyMode } from "../config/njordConfig";

const TABS = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "session-log", label: "Session Log", icon: "📋" },
  { id: "sop-library", label: "SOPs", icon: "📄" },
  { id: "blueprint-library", label: "Blueprints", icon: "🗂" },
  { id: "onboarding", label: "Onboarding", icon: "✅" }
];

const S = {
  shell: {
    minHeight: "100vh",
    background: "#060D18",
    color: "#E2E8F0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "flex",
    flexDirection: "column"
  },
  nav: {
    background: "#0B1120",
    borderBottom: "1px solid #1E293B",
    display: "flex",
    alignItems: "center",
    gap: 0,
    padding: "0 16px",
    flexWrap: "nowrap",
    overflowX: "auto"
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px 12px 0",
    marginRight: 16,
    borderRight: "1px solid #1E293B"
  },
  brandBadge: {
    background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 5,
    letterSpacing: 1
  },
  brandName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#94A3B8",
    whiteSpace: "nowrap"
  },
  caseStudyDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#EAB308",
    flexShrink: 0
  },
  tab: {
    padding: "14px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: "#64748B",
    borderBottom: "2px solid transparent",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "color 0.15s"
  },
  tabActive: {
    color: "#7DD3FC",
    borderBottomColor: "#0EA5E9"
  },
  content: {
    flex: 1
  }
};

export function NjordShell() {
  const [activeTab, setActiveTab] = useState("chat");
  const [sopEditorMode, setSopEditorMode] = useState(null); // null | "create" | { sop }

  function handleCreateNew() {
    setActiveTab("sop-editor");
    setSopEditorMode("create");
  }

  function handleSopSaved() {
    setActiveTab("sop-library");
    setSopEditorMode(null);
  }

  const displayTabs = [
    ...TABS,
    ...(sopEditorMode !== null ? [{ id: "sop-editor", label: "SOP Editor", icon: "✏️" }] : [])
  ];

  return (
    <div style={S.shell}>
      <nav style={S.nav}>
        <div style={S.brand}>
          <span style={S.brandBadge}>NJORD</span>
          <span style={S.brandName}>{NJORD_CONFIG.brandName} Mission Control</span>
          {isCaseStudyMode() && <span style={S.caseStudyDot} title="Case-study mode" />}
        </div>

        {displayTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              ...S.tab,
              ...(activeTab === tab.id ? S.tabActive : {})
            }}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== "sop-editor") setSopEditorMode(null);
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div style={S.content}>
        {activeTab === "chat" && <NjordMissionControl />}
        {activeTab === "session-log" && <NjordSessionLog />}
        {activeTab === "sop-library" && <SOPLibrary onCreateNew={handleCreateNew} />}
        {activeTab === "sop-editor" && (
          <SOPEditor
            existingSOP={sopEditorMode !== "create" ? sopEditorMode : null}
            onSaved={handleSopSaved}
            onCancel={() => { setActiveTab("sop-library"); setSopEditorMode(null); }}
          />
        )}
        {activeTab === "blueprint-library" && <BlueprintLibrary />}
        {activeTab === "onboarding" && <OnboardingChecklist />}
      </div>
    </div>
  );
}
