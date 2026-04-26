import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  buildBragiPackageSkeleton,
  getBragiContinuitySchedule,
  loadAquatraceBragiLibrary,
  selectBragiTopic,
} from "../src/features/missioncontrol/services/bragiContinuityService.js";

const SOUL_PATH = join(process.cwd(), "docs", "BRAGI_SOUL.md");
const LOG_DIR = join(process.cwd(), "tmp-proof");
const LOG_PATH = join(LOG_DIR, "bragi-cron-dry-run.json");
const DEFAULT_INTERVAL_MINUTES = 1440;

function parseArgs(argv) {
  const args = new Set(argv);
  const intervalArg = argv.find((value) => value.startsWith("--interval-minutes="));
  const intervalMinutes = intervalArg ? Number(intervalArg.split("=")[1]) : DEFAULT_INTERVAL_MINUTES;

  return {
    dryRun: !args.has("--live"),
    schedule: args.has("--schedule"),
    intervalMinutes: Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : DEFAULT_INTERVAL_MINUTES
  };
}

function loadBragiSoul() {
  const soul = readFileSync(SOUL_PATH, "utf8");
  return {
    sourcePath: "docs/BRAGI_SOUL.md",
    sourceLoaded: true,
    mentionsLockedBuildOrder: soul.includes("## Locked Build Order"),
    mentionsFirstProofOfLife: soul.includes("## First Proof of Life"),
    excerpt: soul.split("\n").slice(0, 12).join("\n")
  };
}

function buildPlannedArticleJob() {
  const now = new Date();
  const runId = `bragi-dry-run-${now.toISOString().replaceAll(":", "-")}`;
  const library = loadAquatraceBragiLibrary();
  const topic = selectBragiTopic({ library });
  const packageSkeleton = buildBragiPackageSkeleton({ topic, library });
  const schedule = getBragiContinuitySchedule();

  return {
    runId,
    lane: "Bragi Content Exception",
    mode: "dry-run",
    generatedAt: now.toISOString(),
    identitySource: "docs/BRAGI_SOUL.md",
    workflowStage: "cron-foundation",
    action: "planned-article-job-created",
    publishAction: "disabled",
    wordpressExecution: "draft-ready-but-not-triggered",
    dailyTopicCheck: schedule.dailyTopicCheck,
    weeklyDraftCreation: schedule.weeklyDraftCreation,
    plannedJob: {
      clientId: "aquatrace",
      topicSeed: topic.title,
      focusKeyphrase: packageSkeleton.focusKeyphrase,
      whyTopicChosen: packageSkeleton.whyTopicChosen,
      searchIntent: packageSkeleton.searchIntent,
      targetAudience: "local pool owners, hotel and HOA managers, property managers",
      requestedOutput: "article package planning only",
      nextUnlockedStep: "weekly draft creation",
      author: packageSkeleton.author,
      category: packageSkeleton.category,
      secondaryCategory: packageSkeleton.secondaryCategory,
    },
  };
}

function persistDryRun(job, soulContext, options) {
  mkdirSync(LOG_DIR, { recursive: true });

  const payload = {
    ok: true,
    scheduler: {
      enabled: false,
      dryRunDefault: true,
      manualTriggerAvailable: true,
      scheduleRequested: options.schedule,
      intervalMinutes: options.intervalMinutes
    },
    soulContext,
    job
  };

  writeFileSync(LOG_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function startScheduleLoop(options, payloadFactory) {
  const intervalMs = options.intervalMinutes * 60 * 1000;
  console.log(`[bragi-cron] schedule armed in dry-run mode every ${options.intervalMinutes} minute(s)`);
  payloadFactory();
  setInterval(payloadFactory, intervalMs);
}

function runOnce(options) {
  const soulContext = loadBragiSoul();
  const job = buildPlannedArticleJob();
  const payload = persistDryRun(job, soulContext, options);

  console.log(`[bragi-cron] governing source loaded: ${payload.soulContext.sourcePath}`);
  console.log(`[bragi-cron] dry-run safe: ${payload.scheduler.dryRunDefault ? "yes" : "no"}`);
  console.log(`[bragi-cron] planned job created: ${payload.job.runId}`);
  console.log(`[bragi-cron] log written: ${LOG_PATH}`);

  return payload;
}

const options = parseArgs(process.argv.slice(2));

if (options.schedule) {
  startScheduleLoop(options, () => runOnce(options));
} else {
  runOnce(options);
}
