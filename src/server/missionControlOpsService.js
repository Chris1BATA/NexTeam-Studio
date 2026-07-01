import crypto from "crypto";

const FAST_LANE_PATTERNS = [
  /\bwho(?:'s| is)\b/i,
  /\bcustomer at\b/i,
  /\bclient at\b/i,
  /\bhomeowner at\b/i,
  /\bproject at\b/i,
  /\bjob at\b/i,
  /\blook up\b/i,
  /\bpull up\b/i,
  /\bshow me\b/i,
  /\bfind\b/i,
  /\bstatus on\b/i,
  /\bwhat'?s the status on\b/i,
];

const WORK_LANE_PATTERNS = [
  /\bgallons?\b/i,
  /\breport\b/i,
  /\bchecklist\b/i,
  /\bpdf\b/i,
  /\bcalculate\b/i,
  /\bcalculation\b/i,
  /\bsummarize\b/i,
  /\bsummary\b/i,
  /\bopen\b/i,
  /\bread\b/i,
  /\bparse\b/i,
  /\bextract\b/i,
  /\bmeasurement\b/i,
  /\baverage depth\b/i,
];

function normalizeText(value = "") {
  return String(value || "").trim();
}

function hasFastLookupIntent(question) {
  return FAST_LANE_PATTERNS.some((pattern) => pattern.test(question));
}

function hasWorkLaneIntent(question) {
  return WORK_LANE_PATTERNS.some((pattern) => pattern.test(question));
}

function mentionsAddressOrProperty(question) {
  return (
    /\b\d{2,}\b/.test(question) ||
    /\bcourt\b|\broad\b|\brd\b|\bdrive\b|\bdr\b|\bstreet\b|\bst\b|\blane\b|\bln\b|\bavenue\b|\bave\b/i.test(question) ||
    /\bcamp mikell\b/i.test(question)
  );
}

function mentionsPersonOrProject(question) {
  return /\bcustomer\b|\bclient\b|\bhomeowner\b|\bowner\b|\bproject\b|\bjob\b|\baccount\b/i.test(question);
}

function createWorkItemId() {
  return `work-${crypto.randomUUID()}`;
}

export function classifyMissionControlRequest(question = "") {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    return {
      lane: "work",
      reason: "empty-question-default",
    };
  }

  if (hasWorkLaneIntent(normalizedQuestion)) {
    return {
      lane: "work",
      reason: "heavy-companycam-report-request",
    };
  }

  if (
    hasFastLookupIntent(normalizedQuestion) ||
    (mentionsAddressOrProperty(normalizedQuestion) && mentionsPersonOrProject(normalizedQuestion))
  ) {
    return {
      lane: "fast",
      reason: "simple-lookup-request",
    };
  }

  return {
    lane: "work",
    reason: "default-to-work",
  };
}

function createWorkAck(question) {
  const normalizedQuestion = normalizeText(question).toLowerCase();
  if (normalizedQuestion.includes("gallon")) {
    return "Acknowledged. I’m opening the exported report and pulling the total gallons now.";
  }

  if (normalizedQuestion.includes("report") || normalizedQuestion.includes("checklist")) {
    return "Acknowledged. I’m reading the exported report now and will return the answer as soon as it’s parsed.";
  }

  return "Acknowledged. I’m pulling the live job data now and will return the result as soon as it’s ready.";
}

export function createMissionControlOpsService({
  fastLookupResolver,
  workResolver,
  now = () => new Date().toISOString(),
  idFactory = createWorkItemId,
} = {}) {
  if (typeof fastLookupResolver !== "function") {
    throw new Error("MissionControlOpsService requires fastLookupResolver(questionContext).");
  }
  if (typeof workResolver !== "function") {
    throw new Error("MissionControlOpsService requires workResolver(questionContext).");
  }

  const workItems = new Map();

  async function dispatch({ tenantId, question }) {
    const classification = classifyMissionControlRequest(question);
    if (classification.lane === "fast") {
      const result = await fastLookupResolver({ tenantId, question });
      return {
        ok: true,
        lane: "fast",
        classification,
        result,
      };
    }

    const workItemId = idFactory();
    const workItem = {
      id: workItemId,
      tenantId,
      question: normalizeText(question),
      lane: "work",
      status: "queued",
      queuedAt: now(),
      acknowledgedText: createWorkAck(question),
      result: null,
      error: null,
    };
    workItems.set(workItemId, workItem);

    Promise.resolve()
      .then(async () => {
        workItem.status = "running";
        workItem.startedAt = now();
        try {
          const result = await workResolver({ tenantId, question });
          workItem.status = "completed";
          workItem.completedAt = now();
          workItem.result = result;
        } catch (error) {
          workItem.status = "error";
          workItem.completedAt = now();
          workItem.error = {
            message: String(error?.message || "Mission Control work-lane request failed."),
            code: String(error?.code || "MISSION_CONTROL_WORK_LANE_FAILED"),
            status: Number(error?.status || 500) || 500,
          };
        }
      })
      .catch((error) => {
        workItem.status = "error";
        workItem.completedAt = now();
        workItem.error = {
          message: String(error?.message || "Mission Control work-lane request failed."),
          code: String(error?.code || "MISSION_CONTROL_WORK_LANE_FAILED"),
          status: Number(error?.status || 500) || 500,
        };
      });

    return {
      ok: true,
      lane: "work",
      classification,
      acknowledged: true,
      workItemId,
      acknowledgedText: workItem.acknowledgedText,
    };
  }

  function getWorkItem(workItemId) {
    return workItems.get(normalizeText(workItemId)) || null;
  }

  function clearWorkItem(workItemId) {
    workItems.delete(normalizeText(workItemId));
  }

  return {
    dispatch,
    getWorkItem,
    clearWorkItem,
  };
}

export const missionControlOpsServiceInternals = {
  FAST_LANE_PATTERNS,
  WORK_LANE_PATTERNS,
  createWorkAck,
  createWorkItemId,
  hasFastLookupIntent,
  hasWorkLaneIntent,
  mentionsAddressOrProperty,
  mentionsPersonOrProject,
};
