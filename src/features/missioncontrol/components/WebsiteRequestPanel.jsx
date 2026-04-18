import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "aquatrace.websiteRequests";

const REQUEST_TYPES = {
  brokk: {
    title: "Request Website Change",
    helper: "Tell Brokk what page needs work, what should change, and what you want visitors to do next.",
    submit: "Save Website Request",
  },
  bragi: {
    title: "Request Article / SEO Help",
    helper: "Tell Bragi what page or topic this is for, what the goal is, and add any links or example copy.",
    submit: "Save Content Request",
  },
};

const styles = {
  page: {
    minHeight: "100%",
    background: "#060D18",
    color: "#E2E8F0",
    padding: "24px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  shell: {
    maxWidth: 860,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  backBtn: {
    alignSelf: "flex-start",
    background: "none",
    border: "none",
    color: "#8B949E",
    cursor: "pointer",
    fontSize: 13,
    padding: 0,
  },
  card: {
    background: "#0B1120",
    border: "1px solid #1E293B",
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#64748B",
    margin: 0,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#F8FAFC",
  },
  copy: {
    margin: 0,
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 1.6,
  },
  typeRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  typeBtn: {
    background: "#111827",
    color: "#E2E8F0",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  typeBtnActive: {
    borderColor: "#4F46E5",
    boxShadow: "0 0 0 1px #4F46E5 inset",
  },
  typeTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
  },
  typeHelper: {
    margin: 0,
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#E2E8F0",
  },
  input: {
    background: "#111827",
    color: "#E2E8F0",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    background: "#111827",
    color: "#E2E8F0",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    minHeight: 110,
    resize: "vertical",
    outline: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  helper: {
    margin: 0,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 1.5,
  },
  submitBtn: {
    background: "#4F46E5",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  success: {
    background: "#0F172A",
    border: "1px solid #1D4ED8",
    borderRadius: 12,
    padding: 16,
    color: "#BFDBFE",
    fontSize: 13,
    lineHeight: 1.6,
  },
  historyCard: {
    background: "#0B1120",
    border: "1px solid #1E293B",
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  historyItem: {
    borderTop: "1px solid #1E293B",
    paddingTop: 12,
    display: "grid",
    gap: 4,
  },
  historyTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#E2E8F0",
  },
  historyMeta: {
    margin: 0,
    fontSize: 12,
    color: "#94A3B8",
  },
  empty: {
    margin: 0,
    fontSize: 13,
    color: "#64748B",
  },
};

function createEmptyForm() {
  return { change: "", page: "", goal: "", nextStep: "", notes: "" };
}

export function WebsiteRequestPanel({ initialType = "brokk", onBack }) {
  const [requestType, setRequestType] = useState(initialType);
  const [form, setForm] = useState(createEmptyForm());
  const [saved, setSaved] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setRequestType(initialType);
    setSaved(null);
  }, [initialType]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  const current = REQUEST_TYPES[requestType];
  const filteredHistory = useMemo(
    () => history.filter((item) => item.requestType === requestType),
    [history, requestType]
  );

  function updateField(key, value) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const entry = {
      id: crypto.randomUUID(),
      requestType,
      type: current.title,
      status: "Saved",
      savedAt: new Date().toISOString(),
      ...form,
    };
    const nextHistory = [entry, ...history].slice(0, 12);
    setHistory(nextHistory);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
    setSaved(entry);
    setForm(createEmptyForm());
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <button type="button" style={styles.backBtn} onClick={onBack}>
          ← Back to Workspace
        </button>

        <div style={styles.card}>
          <p style={styles.label}>Website</p>
          <h1 style={styles.title}>Website Requests</h1>
          <p style={styles.copy}>
            Pick the kind of help you need, then fill in the request below. Keep it simple.
            Tell us what should change, what page this is for, and what you want to happen next.
          </p>

          <div style={styles.typeRow}>
            {Object.entries(REQUEST_TYPES).map(([key, value]) => (
              <button
                key={key}
                type="button"
                style={{ ...styles.typeBtn, ...(requestType === key ? styles.typeBtnActive : {}) }}
                onClick={() => setRequestType(key)}
              >
                <p style={styles.typeTitle}>{value.title}</p>
                <p style={styles.typeHelper}>{value.helper}</p>
              </button>
            ))}
          </div>

          <form style={styles.grid} onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>What do you want changed?</label>
              <textarea
                style={styles.textarea}
                value={form.change}
                onChange={(event) => updateField("change", event.target.value)}
                placeholder="Example: Update the homepage hero so it speaks more clearly to emergency plumbing customers."
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Which page is this for?</label>
              <input
                style={styles.input}
                value={form.page}
                onChange={(event) => updateField("page", event.target.value)}
                placeholder="Example: Homepage, Leak Detection page, Blog post draft"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>What is the goal?</label>
              <input
                style={styles.input}
                value={form.goal}
                onChange={(event) => updateField("goal", event.target.value)}
                placeholder="Example: More calls, clearer message, better search visibility"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>What should happen next?</label>
              <input
                style={styles.input}
                value={form.nextStep}
                onChange={(event) => updateField("nextStep", event.target.value)}
                placeholder="Example: Draft the change, rewrite the page, prepare publish-ready copy"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>Any notes, links, or example copy?</label>
              <textarea
                style={styles.textarea}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Paste links, notes, competitor examples, or rough copy here."
              />
            </div>

            <div style={styles.footer}>
              <p style={styles.helper}>
                {current.helper} This version saves the request locally in the workspace so it can be reviewed.
              </p>
              <button type="submit" style={styles.submitBtn}>
                {current.submit}
              </button>
            </div>
          </form>

          {saved ? (
            <div style={styles.success}>
              <strong>{saved.type} saved.</strong>
              <br />
              Page: {saved.page || "Not specified"}
              <br />
              Goal: {saved.goal || "Not specified"}
              <br />
              Next step: {saved.nextStep || "Not specified"}
              <br />
              Status: {saved.status}
            </div>
          ) : null}
        </div>

        <div style={styles.historyCard}>
          <p style={styles.label}>Recent Requests</p>
          {filteredHistory.length === 0 ? (
            <p style={styles.empty}>No saved requests yet for this view.</p>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} style={styles.historyItem}>
                <p style={styles.historyTitle}>{item.page || "Untitled request"}</p>
                <p style={styles.historyMeta}>Goal: {item.goal || "Not specified"}</p>
                <p style={styles.historyMeta}>Next step: {item.nextStep || "Not specified"}</p>
                <p style={styles.historyMeta}>
                  Status: {item.status} • Saved {new Date(item.savedAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
