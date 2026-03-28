const styles = {
  bar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    fontSize: 12,
    color: "#6B7280"
  },
  badge: (tone = "neutral") => ({
    borderRadius: 999,
    padding: "4px 10px",
    background: tone === "error" ? "#FEF2F2" : tone === "success" ? "#ECFDF5" : "#F3F4F6",
    color: tone === "error" ? "#B91C1C" : tone === "success" ? "#166534" : "#374151",
    border: `1px solid ${tone === "error" ? "#FECACA" : tone === "success" ? "#BBF7D0" : "#E5E7EB"}`
  })
};

export function SessionStatusBar({ stage = "", status = "active", persistenceState = "saving" }) {
  return (
    <div style={styles.bar}>
      <span style={styles.badge(status === "error" ? "error" : "neutral")}>status: {status}</span>
      {stage ? <span style={styles.badge()}>{stage}</span> : null}
      <span style={styles.badge(persistenceState === "saved" ? "success" : "neutral")}>
        persistence: {persistenceState}
      </span>
    </div>
  );
}
