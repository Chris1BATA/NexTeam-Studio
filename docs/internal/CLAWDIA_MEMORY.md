# CLAWDIA - MEMORY.md
- version: 1.0
- status: active
- last_updated: 2026-04-26
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
- CompanyCam cleanup, safe commit, and repeatable operation

### Standing SEO Garden
- Bragi weekly Aquatrace article draft continuity

### Parked
- VGB controlled campaign flow until CompanyCam and Bragi are stable
- Telegram work until CompanyCam and Bragi are stable
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

### CompanyCam / Dropbox

COMPANYCAM 2026 FULL TRANSFER - COMPLETE

- Protocol confirmation: `AGENT_BUILD_PROTOCOL.md` loaded and confirmed.
- Command run:
  `node C:\Users\Peyto\NexTeam-Studio\scripts\companycam-transfer-2026.mjs`
- Total 2026 projects found: `50`
- Total unique properties found: `48`
- Total projects transferred: `48`
- Total projects skipped as already synced: `2`
- Total unique properties synced: `48`
- Total unique properties not synced: `0`
- Total photos downloaded: `736`
- Total photos skipped: `18`
- Total documents/reports downloaded: `31`
- Total checklists downloaded: `58`
- Total errors: `0`
- Completion email sent: `yes`
- Email message ID: `19dca57b4431bbbe`

Confirmed:
- Sync manifest is stored at:
  `C:\Users\Peyto\Dropbox\Business\Aquatrace LLC\Aquatrace\_System\CompanyCam Sync\companycam_sync_manifest.json`
- Transfer log is stored at:
  `C:\Users\Peyto\Dropbox\Business\Aquatrace LLC\Aquatrace\_System\CompanyCam Sync\companycam_2026_transfer_log.json`
- Metadata, manifests, and logs are stored under:
  `C:\Users\Peyto\Dropbox\Business\Aquatrace LLC\Aquatrace\_System\CompanyCam Sync\`
- No JSON metadata was placed directly into customer folders during the resumed 2026 run.
- CompanyCam was not modified.
- CompanyCam token was not printed.
- No projects outside 2026 were downloaded.

Important note:
- Legacy test-era `CompanyCam Metadata` folders still exist under the prior Michael Whelan and Kyle Brookshire customer folders from earlier controlled testing.
- These were not created or modified during the resumed full 2026 run.
- They are a cleanup item, not a transfer blocker.

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
- CompanyCam 2026 transfer is complete and is no longer the active blocker lane.
- Next CompanyCam lane is cleanup, safe commit, and repeatable operation.
- Bragi remains draft only; no article may be published or scheduled without Chris approval.
- VGB remains parked until CompanyCam and Bragi are stable.
- Telegram remains parked until CompanyCam and Bragi are stable.

## 6. Client Architecture Log

### Aquatrace
- first real NexTeam client
- reference implementation #1
- uses Norse client-facing agent structure
- Bragi content lane is active
- VGB campaign is parked until CompanyCam and Bragi are stable

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

1. Prepare cleanup for legacy `CompanyCam Metadata` test folders without deleting anything until Chris approves.
2. Commit safe CompanyCam transfer and operational memory updates.
3. Keep Bragi draft only and maintain weekly draft continuity.
4. Keep VGB and Telegram parked until CompanyCam and Bragi are stable.

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

- CompanyCam is operating in read-only mode only.
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
- CompanyCam -> Dropbox 2026 full transfer is complete.
- Future repeatable sync should show:
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
