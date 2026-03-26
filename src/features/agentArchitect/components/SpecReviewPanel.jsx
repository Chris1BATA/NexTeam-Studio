const reviewStyles = {
  card: {
    width: "100%",
    maxWidth: "900px",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  eyebrow: {
    color: "#4F46E5",
    fontSize: "14px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: 0
  },
  title: {
    margin: 0,
    fontSize: "36px",
    color: "#111827"
  },
  section: {
    border: "1px solid #E5E7EB",
    borderRadius: "16px",
    padding: "20px",
    background: "#F9FAFB"
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    color: "#4F46E5",
    fontSize: "18px"
  },
  text: {
    margin: 0,
    color: "#374151",
    lineHeight: 1.6
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px"
  },
  badge: {
    background: "#EEF2FF",
    color: "#4338CA",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "14px",
    fontWeight: 600
  },
  priority: {
    display: "inline-block",
    background: "#4F46E5",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "10px 16px",
    fontSize: "16px",
    fontWeight: 700
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "8px"
  },
  primaryButton: {
    border: "none",
    background: "#4F46E5",
    color: "#ffffff",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer"
  },
  secondaryButton: {
    border: "1px solid #D1D5DB",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 600,
    cursor: "pointer"
  }
};

function formatAgentLabel(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SpecReviewPanel({ agentSpec }) {
  const {
    businessName = "Your Business",
    trade = "Field Service",
    serviceArea = "Not provided",
    agentMission = "Your custom agent will be configured based on your business needs.",
    recommendedAgents = [],
    priorityAgent = "To be decided",
    agentName = "New Agent"
  } = agentSpec || {};

  const safeBusinessName = businessName || "Your Business";
  const safeTrade = trade || "Field Service";
  const safeServiceArea = serviceArea || "Not provided";
  const safeAgentMission = agentMission || "Your custom agent will be configured based on your business needs.";
  const safeRecommendedAgents = Array.isArray(recommendedAgents) ? recommendedAgents.filter(Boolean) : [];
  const safePriorityAgent =
    !priorityAgent || priorityAgent === "not_selected" ? "To be decided" : priorityAgent;
  const safeAgentName = agentName || "New Agent";

  return (
    <div style={reviewStyles.card}>
      <p style={reviewStyles.eyebrow}>Your Agent is Ready</p>
      <h1 style={reviewStyles.title}>{safeAgentName}</h1>

      <section style={reviewStyles.section}>
        <h2 style={reviewStyles.sectionTitle}>Business summary</h2>
        <p style={reviewStyles.text}>
          {safeBusinessName} is a {safeTrade} business serving {safeServiceArea}.
        </p>
      </section>

      <section style={reviewStyles.section}>
        <h2 style={reviewStyles.sectionTitle}>What this agent does</h2>
        <p style={reviewStyles.text}>{safeAgentMission}</p>
      </section>

      {safeRecommendedAgents.length ? (
        <section style={reviewStyles.section}>
          <h2 style={reviewStyles.sectionTitle}>Recommended agents</h2>
          <div style={reviewStyles.badgeRow}>
            {safeRecommendedAgents.map((agent) => (
              <span key={agent} style={reviewStyles.badge}>
                {formatAgentLabel(agent)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section style={reviewStyles.section}>
        <h2 style={reviewStyles.sectionTitle}>Starting with</h2>
        <span style={reviewStyles.priority}>
          {safePriorityAgent === "To be decided" ? safePriorityAgent : formatAgentLabel(safePriorityAgent)}
        </span>
      </section>

      <div style={reviewStyles.actions}>
        <button type="button" style={reviewStyles.primaryButton} onClick={() => console.log("Build My Agent")}>
          Build My Agent
        </button>
        <button type="button" style={reviewStyles.secondaryButton} onClick={() => window.location.reload()}>
          Start Over
        </button>
      </div>
    </div>
  );
}
