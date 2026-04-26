# CLAWDIA — MEMORY.md
- version: 1.0
- status: active
- last_updated: 2026-04-25
- owner: NexTeam Studio
- scope: internal operating memory

## 1. Update Protocol

Clawdia updates `CLAWDIA_MEMORY.md`:
- after completed milestones
- after parked decisions
- after stale-truth corrections
- after major blockers are resolved

Each update records:
- date
- decision
- proof
- next step

Hard rules:
- Clawdia must not store secrets
- Clawdia must not store private credentials
- Clawdia must separate verified truth from assumptions

## 2. NexTeam Operational History

- NexTeam Studio is the parent platform.
- OpenClaw is the agent and automation framework.
- Aquatrace is client #1 and reference implementation.
- Early mistake: dashboard and UI work happened before agent foundations.
- Process reset corrected build order to `SOUL -> MEMORY -> skills -> cron -> dashboard`.
- Bragi became the first agent with a true `SOUL.md` and proof-of-life.

## 3. Current Active Lanes

### Revenue Now
- VGB controlled campaign flow

### Standing SEO Garden
- Bragi weekly Aquatrace article draft continuity

### Parked
- dashboard or UI
- Forge
- Google Photos automation
- Telegram rebuild
- new agents without approval

## 4. Verified Completed Milestones

### Bragi
- `docs/BRAGI_SOUL.md` complete
- cron foundation complete
- WordPress draft skill complete
- proof-of-life WordPress draft created
- draft URL: `https://aquatraceleak.com/?p=3307`
- post ID: `3307`
- status: `draft`
- no live publish occurred

### VGB / Gmail
- Gmail OAuth completed
- `GOOGLE_REFRESH_TOKEN` stored locally
- `GMAIL_SEND_FROM` set to `service@aquatraceleak.com`
- sender identity visually verified as `service@aquatraceleak.com`
- plain email send verified
- attachment send verified using Clawdia avatar at `C:\Users\Peyto\.openclaw\workspace\avatars\clawdia-full-body.png`
- no bulk send occurred

## 5. Current Known Blockers

- Clawdia direct-send interface is not wired yet; Atlas executes sends as Clawdia's execution hand when needed.
- Telegram connection exists but does not live in the NexTeam-Studio repo.
- Telegram appears external and Claude/Anthropic-wired.
- Bragi Telegram scaffold exists but is parked.
- Dashboard remains parked.
- Only Bragi currently has `SOUL.md`.
- Clawdia is not yet in `AGENT_REGISTRY.md`.
- Telegram Clawdia should use OpenAI.
- Claude is advisor and pressure-testing only.
- Current Telegram blockers are OpenAI quota and a second active Telegram poller.

## 6. Client Architecture Log

### Aquatrace
- first real NexTeam client
- reference implementation #1
- uses Norse client-facing agent structure
- Bragi content lane is active
- VGB campaign is the active revenue lane

### Future Clients
- should receive Norse-style client-facing deployments
- souls and duties may be shared by role
- memories must be client-specific and isolated

## 7. TMNT / Norse Architecture Decision

- TMNT = internal NexTeam agency, operator, consultative, and business-growth team
- Norse = client-facing skilled-service-trade deployment model
- TMNT agents should eventually receive `SOUL.md` and `MEMORY.md`
- Norse agents can mirror duties across clients but must keep separate client memories

## 8. Stale Truth Log

- Clawdia previously reported OAuth and email status as incomplete after it had already been completed.
- Clawdia previously suggested stale port `4174` / `4173` guidance after runtime had moved to `3001` / `5173`.

Correction rule:
- Clawdia must rely on the latest proof package, not old memory.

## 9. Lessons Learned

- dashboard last
- proof before complete
- one lane at a time
- do not let Chris become relay
- test small before scaling
- plain send before campaigns
- draft before publish
- cron can create drafts, not publish
- Telegram approval is useful but parked until routing is known

## 10. Open Decisions Pending Chris

- whether or when to wire Clawdia direct-send interface
- whether or when to route Telegram from Claude/Anthropic to OpenAI/Nova/OpenClaw
- whether or when to add Clawdia to `AGENT_REGISTRY.md`
- whether or when to build SOUL/MEMORY for Njord and TMNT agents
- whether or when to build Dropbox approved photo library

## 11. Current Next Actions

1. Finish VGB controlled campaign flow.
2. Verify Bragi weekly draft continuity.
3. Commit safe completed work.
4. Keep dashboard parked.

## 12. Bragi Continuity Update

- Bragi standing schedule is now defined as:
  - daily topic and research check at `6:30 AM` Eastern
  - weekly draft target every Monday at `7:00 AM` Eastern
- Bragi remains draft only.
- Bragi may not publish live or schedule live without Chris approval.
- Bragi article packages now require:
  - `1,400-1,600` words
  - default public author `Chris Sears`
  - primary category `Swimming Pool Leak Detection`
  - one optional secondary category only
  - complete Yoast field set
  - internal links applied and recommended
  - backlink opportunities
  - external link recommendations only when the source quality is clear
  - one featured image recommendation plus `3-5` supporting image recommendations
- Bragi draft notification workflow is:
  - create or update WordPress draft
  - email Chris the draft package
  - keep status draft only until Chris approves
- Bragi photo workflow rules now include:
  - one clear photo type per recommendation
  - rewrite metadata to match the actual uploaded image
  - mark `needs human review` instead of guessing when the image is unclear
- Gmail reply reading and attachment ingestion are still not wired.
- WordPress media upload helper is prepared, but photo ingestion and placement are still future workflow work.

## 13. CompanyCam / Dropbox Planning Update

- CompanyCam remains planned as read-only only.
- CompanyCam token safety rule:
  - token belongs only in local `.env` as `COMPANYCAM_API_TOKEN`
  - never print it
  - never commit it
  - never hardcode it
- Current CompanyCam local token status is not stored in memory as a value; only presence checks are allowed.
- CompanyCam read-only target data:
  - project name
  - city
  - state
  - ZIP when available
  - general project type
  - photo timestamps
  - photo tags or labels
  - selected photo metadata
  - reports or checklists when available
- CompanyCam must not expose:
  - full street address
  - customer names unless approved
  - phone numbers
  - emails
  - faces
  - license plates
  - private homeowner details
- CompanyCam -> Dropbox remains dry-run planning only.
- Future dry-run should show:
  - CompanyCam project
  - inferred Dropbox target path
  - photo and report counts
  - duplicate skip behavior
  - whether manual review is needed

## 14. Future Telegram Photo Workflow

- Once Telegram routing is stable again, Bragi or Clawdia can send the draft URL through Telegram.
- Chris can reply with labeled photos:
  - `Featured`
  - `Photo 1`
  - `Photo 2`
  - `Photo 3`
  - `Photo 4`
  - `Photo 5`
- Bragi can later download those photos, upload them to WordPress, set the featured image, place supporting images, and rewrite metadata to match the actual photos.
- No publish or schedule should happen through that flow without Chris approval.
