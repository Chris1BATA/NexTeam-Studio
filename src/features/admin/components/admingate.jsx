import { onIdTokenChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "../../../firebase.js";
import { PLATFORM_OPERATOR_ROLES } from "../../tenancy/services/tenantAccessPolicy.js";
import { signInFirebaseOperator, signOutFirebaseSession } from "../../auth/services/firebaseTenantAuthService.js";

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
    maxWidth: 460,
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
  secondaryButton: {
    width: "100%",
    borderRadius: 10,
    padding: "12px 14px",
    background: "#0D1117",
    color: "#E6EDF3",
    border: "1px solid #30363D",
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
  },
  divider: {
    margin: "18px 0",
    border: 0,
    borderTop: "1px solid #21262D"
  }
};

export function AdminGate({ children }) {
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || "";
  const legacyGateEnabled = Boolean(expectedPassword && expectedPassword !== "undefined");
  const firebaseOperatorGateEnabled = import.meta.env.VITE_FIREBASE_ADMIN_AUTH_ENABLED !== "false";
  const [legacyInput, setLegacyInput] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [operatorPassword, setOperatorPassword] = useState("");
  const [error, setError] = useState("");
  const [firebaseOperatorAuthed, setFirebaseOperatorAuthed] = useState(false);
  const [checkingFirebaseAuth, setCheckingFirebaseAuth] = useState(firebaseOperatorGateEnabled);
  const isLegacyAuthed = useMemo(() => {
    if (!legacyGateEnabled) return false;
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  }, [legacyGateEnabled]);

  useEffect(() => {
    if (!firebaseOperatorGateEnabled) {
      setCheckingFirebaseAuth(false);
      setFirebaseOperatorAuthed(false);
      return undefined;
    }

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setFirebaseOperatorAuthed(false);
        setCheckingFirebaseAuth(false);
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult();
        const role = String(tokenResult.claims?.role || "");
        setFirebaseOperatorAuthed(PLATFORM_OPERATOR_ROLES.has(role));
      } catch (authError) {
        console.error("[AdminGate] token inspection failed:", authError.message);
        setFirebaseOperatorAuthed(false);
      } finally {
        setCheckingFirebaseAuth(false);
      }
    });

    return unsubscribe;
  }, [firebaseOperatorGateEnabled]);

  const isAuthed = firebaseOperatorAuthed || isLegacyAuthed || (!firebaseOperatorGateEnabled && !legacyGateEnabled);

  if (isAuthed) {
    return children;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.brand}>NexTeam-Studio</p>
        <h1 style={styles.title}>Admin Access</h1>
        <p style={styles.copy}>
          Operator views should use Firebase Auth + verified platform claims. The legacy password gate remains as a fallback until all live operator users are provisioned.
        </p>
        {error ? <div style={styles.error}>{error}</div> : null}

        {firebaseOperatorGateEnabled ? (
          <>
            <input
              type="email"
              value={operatorEmail}
              onChange={(event) => setOperatorEmail(event.target.value)}
              placeholder="Operator email"
              autoComplete="username"
              style={styles.input}
            />
            <input
              type="password"
              value={operatorPassword}
              onChange={(event) => setOperatorPassword(event.target.value)}
              placeholder="Operator password"
              autoComplete="current-password"
              style={styles.input}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setError("");
                  signInFirebaseOperator({ email: operatorEmail, password: operatorPassword })
                    .then(() => {
                      setFirebaseOperatorAuthed(true);
                    })
                    .catch((authError) => {
                      setError(String(authError?.message || "Firebase operator sign-in failed."));
                    });
                }
              }}
            />
            <button
              type="button"
              style={styles.button}
              disabled={checkingFirebaseAuth}
              onClick={() => {
                setError("");
                signInFirebaseOperator({ email: operatorEmail, password: operatorPassword })
                  .then(() => {
                    setFirebaseOperatorAuthed(true);
                  })
                  .catch((authError) => {
                    setError(String(authError?.message || "Firebase operator sign-in failed."));
                  });
              }}
            >
              {checkingFirebaseAuth ? "Checking operator session..." : "Sign in as Operator"}
            </button>
            <p style={styles.note}>
              Grant the user a real Firebase Auth account, then add their email or UID to the server-side
              operator allowlist so the backend can assign the verified platform role claim.
            </p>
          </>
        ) : null}

        {legacyGateEnabled ? (
          <>
            <hr style={styles.divider} />
            <input
              type="password"
              value={legacyInput}
              onChange={(event) => setLegacyInput(event.target.value)}
              placeholder="Legacy admin password"
              style={styles.input}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (legacyInput === expectedPassword) {
                    window.sessionStorage.setItem(STORAGE_KEY, "true");
                    window.location.reload();
                  } else {
                    setError("Incorrect legacy admin password.");
                  }
                }
              }}
            />
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                if (legacyInput === expectedPassword) {
                  window.sessionStorage.setItem(STORAGE_KEY, "true");
                  window.location.reload();
                } else {
                  setError("Incorrect legacy admin password.");
                }
              }}
            >
              Use Legacy Password Fallback
            </button>
            <p style={styles.note}>
              This fallback keeps the current workspace usable while Firebase operator accounts are provisioned.
              Remove it once the real operator auth lane is fully live.
            </p>
          </>
        ) : null}

        {!legacyGateEnabled && firebaseOperatorGateEnabled ? (
          <button
            type="button"
            style={{ ...styles.secondaryButton, marginTop: 16 }}
            onClick={() => {
              setError("");
              signOutFirebaseSession().catch((authError) => {
                setError(String(authError?.message || "Failed to clear Firebase session."));
              });
            }}
          >
            Reset Firebase Session
          </button>
        ) : null}
      </div>
    </div>
  );
}
