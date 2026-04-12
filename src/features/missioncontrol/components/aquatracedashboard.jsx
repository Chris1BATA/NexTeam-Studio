/**
 * AquatraceDashboard — Aquatrace Mission Control overview screen.
 *
 * The entry-point dashboard for the Aquatrace tenant.
 * Shows status cards and provides a primary button to launch
 * the Njord workspace directly.
 *
 * Route: /mission-control/aquatrace
 */

import { Link } from "react-router-dom";
import { NJORD_CONFIG, isCaseStudyMode } from "../config/njordconfig.js";

const S = {
  page: {
    minHeight: "100vh",
    background: "#060D18",
    color: "#E2E8F0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "32px 24px"
  },
  shell: {
    maxWidth: 1080,
    margin: "0 auto"
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16
  },
  headerLeft: {},
  eyebrow: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  eyebrowBadge: {
    background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 5,
    letterSpacing: 1
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: 30,
    fontWeight: 700,
    color: "#F8FAFC"
  },
  subtitle: {
    margin: 0,
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 520
  },
  launchBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 12,
    padding: "14px 24px",
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: 0.2,
    boxShadow: "0 2px 16px rgba(14,165,233,0.30)",
    whiteSpace: "nowrap",
    flexShrink: 0
  },
  caseStudyBanner: {
    background: "#1C1000",
    border: "1px solid #854D0E",
    borderRadius: 10,
    padding: "10px 16px",
    marginBottom: 28,
    fontSize: 13,
    color: "#FCD34D",
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 32
  },
  card: {
    background: "#0B1120",
    border: "1px solid #1E293B",
    borderRadius: 14,
    padding: "20px 20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#64748B"
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#F1F5F9"
  },
  cardMeta: {
    fontSize: 12,
    color: "#475569"
  },
  statusDot: (active) => ({
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: active ? "#22C55E" : "#EAB308",
    marginRight: 6
  }),
  njordCard: {
    background: "linear-gradient(135deg, #0C1929 0%, #0B1120 100%)",
    border: "1px solid #0EA5E9",
    borderRadius: 14,
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap"
  },
  njordCardLeft: {},
  njordCardTitle: {
    margin: "0 0 6px 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#F8FAFC",
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  njordCardBadge: {
    background: "linear-gradient(135deg,#0EA5E9,#0284C7)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 5,
    letterSpacing: 1
  },
  njordCardDesc: {
    margin: 0,
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 1.55,
    maxWidth: 440
  }
};

export function AquatraceDashboard() {
  const caseStudy = isCaseStudyMode();

  const statusCards = [
    {
      label: "Host Agent",
      value: NJORD_CONFIG.agentName,
      meta: "Active — ready to chat"
    },
    {
      label: "Tenant",
      value: NJORD_CONFIG.brandName,
      meta: `ID: ${NJORD_CONFIG.tenantId}`
    },
    {
      label: "Industry",
      value: "Water Services",
      meta: NJORD_CONFIG.industry
    },
    {
      label: "Mode",
      value: caseStudy ? "Case Study" : "Live",
      meta: caseStudy ? "Sandbox — no real sends" : "Production tenant"
    },
    {
      label: "Full-List Sends",
      value: NJORD_CONFIG.fullListSendEnabled ? "Enabled" : "Sandboxed",
      meta: caseStudy ? "Log-only in case-study mode" : "Live sends enabled"
    },
    {
      label: "Campaign Log",
      value: "Firestore",
      meta: `Collection: ${NJORD_CONFIG.campaignLogCollection}`
    }
  ];

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.eyebrow}>
              <span style={S.eyebrowBadge}>NJORD</span>
              Mission Control
            </div>
            <h1 style={S.title}>Aquatrace Dashboard</h1>
            <p style={S.subtitle}>
              Tenant overview for {NJORD_CONFIG.brandName}. Launch the Njord workspace to
              chat, manage campaigns, SOPs, blueprints, and onboarding.
            </p>
          </div>

          {/* Primary Njord entry point */}
          <Link to="/mission-control/aquatrace/workspace" style={S.launchBtn}>
            💬 Open Njord Workspace
          </Link>
        </div>

        {/* Case-study banner */}
        {caseStudy && (
          <div style={S.caseStudyBanner}>
            <span>⚠️</span>
            <span>
              <strong>Case-study mode active.</strong> All campaign sends are sandbox/log-only.
              No real emails will be delivered.
            </span>
          </div>
        )}

        {/* Status cards */}
        <div style={S.grid}>
          {statusCards.map((card) => (
            <div key={card.label} style={S.card}>
              <div style={S.cardLabel}>{card.label}</div>
              <div style={S.cardValue}>
                <span style={S.statusDot(card.label === "Host Agent")} />
                {card.value}
              </div>
              <div style={S.cardMeta}>{card.meta}</div>
            </div>
          ))}
        </div>

        {/* Njord launch card — second, unmissable entry point */}
        <div style={S.njordCard}>
          <div style={S.njordCardLeft}>
            <h2 style={S.njordCardTitle}>
              <span style={S.njordCardBadge}>NJORD</span>
              Njord AI Workspace
            </h2>
            <p style={S.njordCardDesc}>
              Chat with Njord, manage outreach campaigns, review session logs,
              edit SOPs, explore blueprints, and track onboarding progress —
              all in one place.
            </p>
          </div>
          <Link to="/mission-control/aquatrace/workspace" style={S.launchBtn}>
            Launch Njord →
          </Link>
        </div>
      </div>
    </div>
  );
}
