const successStyles = {
  page: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#0A0A14",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
    padding: "24px",
    boxSizing: "border-box"
  },
  brand: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 32
  },
  checkmark: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
    marginBottom: 32,
    boxShadow: "0 0 40px rgba(79,70,229,0.4)"
  },
  title: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: 800,
    margin: "0 0 12px 0",
    textAlign: "center"
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 18,
    margin: "0 0 48px 0",
    textAlign: "center",
    maxWidth: 480,
    lineHeight: 1.6
  },
  card: {
    background: "#13131F",
    border: "1px solid #2D2D45",
    borderRadius: 16,
    padding: "28px 32px",
    maxWidth: 520,
    width: "100%",
    marginBottom: 32
  },
  cardTitle: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 3,
    margin: "0 0 16px 0"
  },
  step: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16
  },
  stepNumber: {
    background: "#4F46E5",
    color: "#ffffff",
    borderRadius: "50%",
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1
  },
  stepText: {
    color: "#D1D5DB",
    fontSize: 15,
    lineHeight: 1.5,
    margin: 0
  },
  stepBold: {
    color: "#ffffff",
    fontWeight: 600
  },
  bookButton: {
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
    padding: "16px 40px",
    borderRadius: 50,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 0 32px rgba(79,70,229,0.45)",
    textDecoration: "none",
    display: "inline-block"
  },
  footer: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 24,
    textAlign: "center"
  }
};

export default function SuccessScreen() {
  const bookingLink = import.meta.env.VITE_BOOKING_LINK || "#";

  return (
    <div style={successStyles.page}>
      <div style={successStyles.brand}>NexTeam-Studio</div>

      <div style={successStyles.checkmark}>✓</div>

      <h1 style={successStyles.title}>You're in.</h1>
      <p style={successStyles.subtitle}>
        Your Nexi Blueprint is on its way. Here's exactly what happens next.
      </p>

      <div style={successStyles.card}>
        <p style={successStyles.cardTitle}>What's next</p>

        <div style={successStyles.step}>
          <div style={successStyles.stepNumber}>1</div>
          <p style={successStyles.stepText}>
            <span style={successStyles.stepBold}>Within 24 hours</span> — you'll receive your custom Agent Blueprint PDF: a full operational plan built around your business, your team, and your workflow.
          </p>
        </div>

        <div style={successStyles.step}>
          <div style={successStyles.stepNumber}>2</div>
          <p style={successStyles.stepText}>
            <span style={successStyles.stepBold}>30-minute setup call</span> — we'll walk through your Blueprint together, answer questions, and map out how your first agent goes live.
          </p>
        </div>

        <div style={successStyles.step}>
          <div style={successStyles.stepNumber}>3</div>
          <p style={successStyles.stepText}>
            <span style={successStyles.stepBold}>Your first agent launches</span> — we configure and deploy your priority workflow so your team can start using it immediately.
          </p>
        </div>
      </div>

      {bookingLink !== "#" ? (
        <a href={bookingLink} target="_blank" rel="noopener noreferrer" style={successStyles.bookButton}>
          Book Your Setup Call →
        </a>
      ) : null}

      <p style={successStyles.footer}>
        Questions? Reply to your confirmation email — we'll get back to you fast.
      </p>
    </div>
  );
}
