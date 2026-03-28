import { useMemo, useState } from "react";

const STORAGE_KEY = "nexteam_admin_authed";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0D1117",
    color: "#E6EDF3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "system-ui, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#161B22",
    border: "1px solid #21262D",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
  },
  brand: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#4F46E5",
    margin: "0 0 12px 0"
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: 24
  },
  copy: {
    margin: "0 0 16px 0",
    color: "#8B949E",
    lineHeight: 1.5,
    fontSize: 14
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #30363D",
    background: "#0D1117",
    color: "#E6EDF3",
    padding: "12px 14px",
    marginBottom: 12,
    boxSizing: "border-box"
  },
  button: {
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer"
  },
  error: {
    color: "#F87171",
    fontSize: 13,
    marginBottom: 12
  },
  note: {
    marginTop: 12,
    color: "#6E7681",
    fontSize: 12,
    lineHeight: 1.5
  }
};

export function AdminGate({ children }) {
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || "";
  const gateEnabled = Boolean(expectedPassword && expectedPassword !== "undefined");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const isAuthed = useMemo(() => {
    if (!gateEnabled) return true;
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  }, [gateEnabled]);

  if (isAuthed) {
    return children;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.brand}>NexTeam-Studio</p>
        <h1 style={styles.title}>Admin Access</h1>
        <p style={styles.copy}>This session view is operator-only. Enter the admin password to continue.</p>
        {error ? <div style={styles.error}>{error}</div> : null}
        <input
          type="password"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Admin password"
          style={styles.input}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (input === expectedPassword) {
                window.sessionStorage.setItem(STORAGE_KEY, "true");
                window.location.reload();
              } else {
                setError("Incorrect password.");
              }
            }
          }}
        />
        <button
          type="button"
          style={styles.button}
          onClick={() => {
            if (input === expectedPassword) {
              window.sessionStorage.setItem(STORAGE_KEY, "true");
              window.location.reload();
            } else {
              setError("Incorrect password.");
            }
          }}
        >
          Unlock Admin View
        </button>
        <p style={styles.note}>
          Set <code>VITE_ADMIN_PASSWORD</code> in Railway to enable this gate. If the env var is not set, the gate stays disabled.
        </p>
      </div>
    </div>
  );
}
