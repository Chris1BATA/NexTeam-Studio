# NexTeam Studio

**Live:** https://nexteam-studio-production.up.railway.app
**Admin:** https://nexteam-studio-production.up.railway.app/admin/sessions

NexTeam Studio is a conversational AI intake platform for field service businesses. A business owner visits the app, has a guided conversation with **Nexi** (an AI consultant persona powered by Claude), and walks away with a structured agent spec — and ideally a booked setup call.

---

## What It Actually Does Today (March 2026)

1. Visitor lands on a dark splash screen and clicks **Start Conversation**
2. Nexi (Rive-animated avatar + ElevenLabs voice) greets them and opens a streaming interview
3. Interview collects: business name, trade, crew size, job volume, service area, pain points, existing tools, agent recommendation, priority agent, and agent name
4. After each turn: a second Claude call silently extracts a structured JSON spec patch and writes it to Firestore
5. When the interview is complete: spec review card shown → CTA to Stripe payment link
6. After payment: success screen with next steps and book-a-call button (Calendly)

---

## Flow Map

```
Splash Screen
    ↓  [Start Conversation]
AgentArchitectShell (XState machine)
    ↓  BOOT → Claude streams Nexi greeting (voice + avatar)
Conversation Loop
    ↓  User types or speaks (mic button) → SUBMIT_TURN
    ↓  Claude streams reply (interviewer persona)
    ↓  STREAM_COMPLETE → Claude extracts JSON patch from transcript
    ↓  applyAgentPatch() → written to Firestore: agentSessions/{sessionId}
    ↓  Back to awaiting_user
    ↓  ...repeats until user confirms summary...
    ↓  COMPLETE → completeAgent() → status: "completed" in Firestore
Spec Review Panel
    ↓  Shows agent spec + "Continue to Setup — $197" button
    ↓  Redirects to Stripe payment link
Success Screen (/success)
    ↓  "You're in." + next steps + Book a Call button
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7 |
| State machine | XState v5 |
| Avatar | Rive animation (avatar.riv) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) via Express proxy |
| Voice | ElevenLabs TTS (streaming, amplitude-reactive) |
| Database | Firebase Firestore |
| Server | Express (Node) — API proxy, serves built app |
| Hosting | Railway (nixpacks build, auto-deploy on push to main) |

---

## What Is Live and Working

- ✅ Splash screen, boot sequence, avatar animation
- ✅ Full conversational interview flow with Claude (streaming, compact context)
- ✅ XState machine managing all UI states
- ✅ Rive avatar reacting to conversation state (idle / listening / speaking glow)
- ✅ ElevenLabs TTS: voice + amplitude-reactive visual, barge-in support
- ✅ Extractor: second Claude call parses transcript into structured JSON spec
- ✅ Firestore session persistence: patch written after each turn, marked complete on finish
- ✅ Spec Review Panel: shows extracted agent spec with payment CTA
- ✅ Success Screen: next steps + conditional booking button
- ✅ Express proxy: API keys server-side only
- ✅ Railway deployment: live and auto-deploying
- ✅ Admin session view: `/admin/sessions` — lists all Firestore sessions with spec summary
- ✅ Multi-tenant foundation: `tenantId` in all Firestore writes, tenant config module, per-client subagent config structure

---

## What Still Needs Completing Before Full Launch

- ⚠️ **Railway env vars** — Firebase, ElevenLabs, Stripe, and booking link vars must be verified as set in Railway dashboard (see WAIT-002 in blockers.md)
- ⚠️ **Production persistence spot-check** — confirm Firestore writes are actually landing in production (see PERSISTENCE_VERIFICATION.md)
- ⚠️ **Admin auth** — `/admin/sessions` is unprotected. Anyone who knows the URL can see session data. Needs a password or token gate before sharing externally.
- ⚠️ **Stripe live mode** — test vs. live mode for the payment link needs to be verified before taking real money

---

## What Is Planned But Not Yet Real

- 🔲 **Actual agent deployment** — the flow produces a spec, but no AI agent is provisioned for the customer post-purchase. Post-interview handoff is manual (book a call).
- 🔲 **User authentication** — sessions are anonymous. No login, account, or returning-customer recognition.
- 🔲 **Email confirmations** — no email is sent on completion or payment. Success screen references a contact email (hello@nexteam.studio) but no email integration exists.
- 🔲 **Multi-tenant routing** — foundation is in (tenantId in schema, tenantConfig.js, subagentRoster.js), but runtime tenant selection by URL/subdomain is not implemented.

---

## Setup

### Prerequisites

- Node.js >= 22
- Railway account (or any Node-compatible host)
- Anthropic API key
- ElevenLabs API key (voice optional — app works without it, silently)
- Firebase project with Firestore enabled

### Environment Variables

Copy `.env.example` to `.env` and fill in all values.

```env
# Server-side only (never exposed to browser)
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=

# Firebase (injected at build time via Vite — standard for Firebase web apps)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# App URLs and payment
VITE_APP_URL=                 # Your deployed app URL
VITE_BOOKING_LINK=            # Calendly or booking URL
VITE_STRIPE_PAYMENT_LINK=     # Stripe payment link (set mode: payment, $197)

# Optional: multi-tenant (defaults to 'nexteam-studio' if not set)
VITE_TENANT_ID=
```

### Run Locally

```bash
npm install
npm run dev        # Vite dev server (no Express proxy — Claude calls will fail)
```

To run with the full Express proxy:

```bash
npm run build
npm run start      # Builds then starts Express on port 4173
```

### Deploy to Railway

Push to `main`. Railway auto-deploys via nixpacks. Set all env vars in the Railway dashboard under **Variables**.

---

## Verifying Persistence in Production

See `PERSISTENCE_VERIFICATION.md` in the workspace for a step-by-step guide:
1. Open the production site
2. Open DevTools → Console, filter by `[firestoreSession]`
3. Run a 2–3 turn conversation
4. Confirm `✅ patch written` log entries
5. Cross-check in Firebase Console → `agentSessions` collection

---

## Architecture Notes

- **Token efficiency:** the interviewer uses compact context instead of full transcript replay — compressed internal state + last 3 messages only. The extractor also uses only the current structured patch plus the last 5 transcript messages, with a reduced `max_tokens` budget because it returns a compact JSON patch.
- **Subagent roster:** 15 TMNT-named internal subagents defined in `subagentRoster.js`. Customers see only "Nexi". Foundation for per-client subagent sets is in Firestore (`tenants/{tenantId}/subagents/{id}`).
- **Avatar state:** `resolveAvatarState()` in `avatarStateMap.js` drives animation — streaming/speaking signals take priority over machine state.
