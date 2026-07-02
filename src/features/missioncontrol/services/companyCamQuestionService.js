import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { PDFParse } from "pdf-parse";

const DEFAULT_COMPANYCAM_TENANT_ID = "aquatrace";
const ALLOWED_COMPANYCAM_TENANT_IDS = new Set(["aquatrace", "aquatrace-case-study"]);
const TOTAL_GALLONS_LABEL = "Estimated Approximate Total Gallons";
const DEFAULT_AQUATRACE_DROPBOX_BASE =
  process.env.AQUATRACE_DROPBOX_BASE || "C:\\Users\\Peyto\\Dropbox\\Business\\Aquatrace LLC\\Aquatrace";
const GENERIC_QUESTION_TOKENS = new Set([
  "what",
  "which",
  "where",
  "when",
  "total",
  "pool",
  "pools",
  "gallon",
  "gallons",
  "report",
  "reports",
  "checklist",
  "companycam",
  "question",
  "answer",
  "show",
  "find",
  "tell",
  "give",
  "need",
  "from",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCompanyCamTenantId(value) {
  return normalizeText(value || DEFAULT_COMPANYCAM_TENANT_ID).toLowerCase();
}

function createCompanyCamQuestionError(message, { status = 400, code = "COMPANYCAM_QUERY_ERROR", detail = "" } = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.detail = detail || "";
  return error;
}

function normalizeAnswerNumber(rawValue) {
  const digits = String(rawValue || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function tokenizeQuestion(question) {
  return Array.from(
    new Set(
      normalizeText(question)
        .toLowerCase()
        .match(/[a-z0-9]+/g) || []
    )
  ).filter((token) => token.length >= 2);
}

function buildUsefulQuestionTokens(question) {
  return tokenizeQuestion(question).filter((token) => !GENERIC_QUESTION_TOKENS.has(token));
}

function buildProjectMatchText(project = {}) {
  return [
    project?.name,
    project?.address?.street_address_1,
    project?.address?.street_address_2,
    project?.address?.city,
    project?.address?.state,
    project?.address?.postal_code,
  ]
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function dedupeNonEmptyStrings(values = []) {
  const seen = new Set();
  const ordered = [];

  for (const value of values) {
    const normalized = normalizeText(value).replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    ordered.push(normalized);
  }

  return ordered;
}

export function buildProjectSearchQueries(question, explicitProjectQuery = "") {
  const normalizedQuestion = normalizeText(question);
  const normalizedLower = normalizedQuestion.toLowerCase();
  const usefulTokens = buildUsefulQuestionTokens(question);
  const phrases = [explicitProjectQuery];

  const forInMatch = normalizedQuestion.match(/\bfor\s+(.+?)\s+in\s+(.+?)(?:[?.!]|$)/i);
  if (forInMatch?.[1]) {
    phrases.push(forInMatch[1]);
  }
  if (forInMatch?.[2]) {
    phrases.push(forInMatch[2]);
    phrases.push(`${forInMatch[2]} ${forInMatch[1] || ""}`);
  }

  const forOnlyMatch = normalizedQuestion.match(/\bfor\s+(.+?)(?:[?.!]|$)/i);
  if (forOnlyMatch?.[1]) {
    phrases.push(forOnlyMatch[1]);
  }

  if (normalizedLower.includes("camp mikell")) {
    phrases.push("Camp Mikell");
  }

  if (usefulTokens.length > 0) {
    phrases.push(usefulTokens.slice(0, 4).join(" "));
    if (usefulTokens.length >= 2) {
      phrases.push(usefulTokens.slice(0, 2).join(" "));
    }
  }

  return dedupeNonEmptyStrings(phrases).filter((phrase) => phrase.length >= 3);
}

function detectCompanyCamQuestionType(question) {
  const lower = normalizeText(question).toLowerCase();
  if (lower.includes("gallon")) {
    return "total_gallons";
  }

  throw createCompanyCamQuestionError(
    "Only total-gallons CompanyCam report questions are supported right now.",
    {
      status: 400,
      code: "COMPANYCAM_UNSUPPORTED_QUESTION",
    }
  );
}

async function extractPdfTextFromBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: normalizeText(result?.text),
      byteLength: buffer.byteLength,
    };
  } finally {
    await parser.destroy();
  }
}

async function extractPdfTextFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf",
      "User-Agent": "NexTeam-Studio/CompanyCam-Report-Reader",
    },
  });

  if (!response.ok) {
    throw createCompanyCamQuestionError(
      `CompanyCam report download failed with status ${response.status}.`,
      {
        status: 502,
        code: "COMPANYCAM_REPORT_DOWNLOAD_FAILED",
      }
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return extractPdfTextFromBuffer(buffer);
}

async function extractPdfTextFromFile(filePath) {
  const buffer = readFileSync(filePath);
  return extractPdfTextFromBuffer(buffer);
}

function scoreTextAgainstQuestion(text, question) {
  const normalizedText = normalizeText(text).toLowerCase();
  if (!normalizedText) {
    return 0;
  }

  return buildUsefulQuestionTokens(question).reduce((score, token) => {
    if (!normalizedText.includes(token)) {
      return score;
    }

    if (normalizedText.includes(` ${token} `)) {
      return score + 3;
    }

    return score + 2;
  }, 0);
}

export function scoreProjectAgainstQuestion(project, question) {
  const matchText = buildProjectMatchText(project);
  if (!matchText) {
    return 0;
  }

  return buildUsefulQuestionTokens(question).reduce((score, token) => {
    if (!matchText.includes(token)) {
      return score;
    }

    if (normalizeText(project?.name).toLowerCase().includes(token)) {
      return score + 5;
    }

    if (normalizeText(project?.address?.city).toLowerCase().includes(token)) {
      return score + 3;
    }

    if (
      normalizeText(project?.address?.street_address_1).toLowerCase().includes(token) ||
      normalizeText(project?.address?.street_address_2).toLowerCase().includes(token)
    ) {
      return score + 4;
    }

    return score + 2;
  }, 0);
}

function isPdfDocument(document = {}) {
  return String(document?.content_type || "").toLowerCase().includes("pdf");
}

function isChecklistLikeDocument(document = {}) {
  const lower = normalizeText(document?.name).toLowerCase();
  return lower.includes("checklist") || lower.includes("exported");
}

function isLowValueReferenceDocument(document = {}) {
  const lower = normalizeText(document?.name).toLowerCase();
  return lower.includes("evaporation") || lower.includes("moasure");
}

function scoreDocumentAgainstQuestion(document, question) {
  let score = scoreTextAgainstQuestion(document?.name, question) * 2;
  if (isChecklistLikeDocument(document)) {
    score += 10;
  }
  if (isLowValueReferenceDocument(document)) {
    score -= 6;
  }
  return score;
}

export function extractTotalGallonsFromText(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/Estimated Approximate Total Gallons\s*([\d,]+)\s*Gallon[s]?/i);
  if (!match?.[1]) {
    throw createCompanyCamQuestionError(
      `Could not find "${TOTAL_GALLONS_LABEL}" in the exported CompanyCam report.`,
      {
        status: 422,
        code: "COMPANYCAM_TOTAL_GALLONS_NOT_FOUND",
      }
    );
  }

  const rawValue = normalizeText(match[1]);
  const numericValue = normalizeAnswerNumber(rawValue);
  const evidenceIndex = normalized.toLowerCase().indexOf(TOTAL_GALLONS_LABEL.toLowerCase());
  const evidenceSnippet =
    evidenceIndex >= 0
      ? normalized.slice(Math.max(0, evidenceIndex - 120), evidenceIndex + 240)
      : `${TOTAL_GALLONS_LABEL} ${rawValue} Gallons`;

  return {
    fieldLabel: TOTAL_GALLONS_LABEL,
    rawValue,
    numericValue,
    unit: "Gallons",
    displayValue: `${rawValue} Gallons`,
    evidenceSnippet,
  };
}

function extractAnswerFromText(questionType, text) {
  switch (questionType) {
    case "total_gallons":
      return extractTotalGallonsFromText(text);
    default:
      throw createCompanyCamQuestionError(
        `Unsupported CompanyCam question type "${questionType}".`,
        {
          status: 400,
          code: "COMPANYCAM_UNSUPPORTED_QUESTION",
        }
      );
  }
}

async function collectCompanyCamProjectCandidates({
  companyCamRail,
  question,
  projectQuery,
  projectId,
}) {
  if (normalizeText(projectId)) {
    const selectedProject = await companyCamRail.getProject(normalizeText(projectId));
    return [
      {
        ...selectedProject,
        _score: scoreProjectAgainstQuestion(selectedProject, question) + 50,
        _matchedQueries: ["projectId"],
      },
    ];
  }

  const candidateMap = new Map();
  const queries = buildProjectSearchQueries(question, projectQuery);

  for (const query of queries) {
    const projects = await companyCamRail.searchProjects({
      perPage: 10,
      query: query || undefined,
    });

    for (const project of projects) {
      const existing = candidateMap.get(project.id);
      const nextScore = scoreProjectAgainstQuestion(project, question) + scoreTextAgainstQuestion(query, question);
      if (!existing) {
        candidateMap.set(project.id, {
          ...project,
          _score: nextScore,
          _matchedQueries: [query],
        });
        continue;
      }

      existing._score = Math.max(existing._score, nextScore);
      if (!existing._matchedQueries.includes(query)) {
        existing._matchedQueries.push(query);
      }
    }
  }

  return [...candidateMap.values()].sort((left, right) => right._score - left._score);
}

async function findCompanyCamAnswerCandidate({
  companyCamRail,
  question,
  questionType,
  projectQuery,
  projectId,
  extractPdfTextFromUrlImpl = extractPdfTextFromUrl,
}) {
  if (!companyCamRail) {
    return null;
  }

  const projectCandidates = await collectCompanyCamProjectCandidates({
    companyCamRail,
    question,
    projectQuery,
    projectId,
  });

  if (projectCandidates.length === 0) {
    return null;
  }

  const answerCandidates = [];

  for (const project of projectCandidates) {
    const documents = (await companyCamRail.listProjectDocuments(project.id)).filter(
      (document) => isPdfDocument(document) && normalizeText(document.url)
    );

    if (documents.length === 0) {
      continue;
    }

    const projectDocSignal = documents.reduce(
      (maxScore, document) => Math.max(maxScore, scoreDocumentAgainstQuestion(document, question)),
      0
    );

    const prioritizedDocuments = [...documents].sort((left, right) => {
      const leftScore = scoreDocumentAgainstQuestion(left, question);
      const rightScore = scoreDocumentAgainstQuestion(right, question);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return Number(right?.updated_at || right?.created_at || 0) - Number(left?.updated_at || left?.created_at || 0);
    });

    for (const document of prioritizedDocuments) {
      let pdfTextResult;
      try {
        pdfTextResult = await extractPdfTextFromUrlImpl(document.url);
      } catch (error) {
        continue;
      }

      let answer;
      try {
        answer = extractAnswerFromText(questionType, pdfTextResult.text);
      } catch (error) {
        if (error?.code === "COMPANYCAM_TOTAL_GALLONS_NOT_FOUND") {
          continue;
        }
        throw error;
      }

      answerCandidates.push({
        provider: "companycam",
        project,
        allProjects: projectCandidates,
        answer,
        sourceDocument: {
          id: document.id,
          name: document.name,
          contentType: document.content_type,
          byteSize: document.byte_size ?? null,
          updatedAt: document.updated_at || document.created_at || null,
          url: document.url,
        },
        source: {
          type: "companycam_exported_pdf",
          evidenceSnippet: answer.evidenceSnippet,
          pdfBytes: pdfTextResult.byteLength,
          matchedQueries: project._matchedQueries || [],
        },
        totalScore:
          (project._score || 0) +
          projectDocSignal +
          scoreDocumentAgainstQuestion(document, question) +
          (isChecklistLikeDocument(document) ? 20 : 0),
      });
    }
  }

  return answerCandidates.sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }
    return Number(right?.sourceDocument?.updatedAt || 0) - Number(left?.sourceDocument?.updatedAt || 0);
  })[0] || null;
}

function getDropboxCustomersRoot() {
  const normalizedBase = normalizeText(DEFAULT_AQUATRACE_DROPBOX_BASE);
  if (!normalizedBase) {
    return "";
  }

  return normalizedBase.toLowerCase().endsWith(`${sep}customers`.toLowerCase())
    ? normalizedBase
    : join(normalizedBase, "Customers");
}

function walkPdfFiles(rootPath) {
  if (!existsSync(rootPath)) {
    return [];
  }

  const queue = [rootPath];
  const pdfFiles = [];

  while (queue.length > 0) {
    const currentPath = queue.pop();
    const entries = readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        pdfFiles.push(fullPath);
      }
    }
  }

  return pdfFiles;
}

function scoreDropboxPathAgainstQuestion(filePath, question) {
  const lowerPath = normalizeText(filePath).toLowerCase();
  let score = scoreTextAgainstQuestion(lowerPath, question) * 2;

  if (lowerPath.includes("exportedcurrentaquatraceswimmingpoolleakdetectionchecklist")) {
    score += 20;
  }
  if (lowerPath.includes("checklist")) {
    score += 8;
  }
  if (lowerPath.includes("evaporation") || lowerPath.includes("moasure")) {
    score -= 8;
  }

  return score;
}

function inferDropboxProjectName(filePath, customersRoot) {
  const relativePath = relative(customersRoot, filePath);
  const parts = relativePath.split(sep).filter(Boolean);
  if (parts.length >= 4) {
    return `${parts[2]} / ${parts[3]}`;
  }
  if (parts.length >= 3) {
    return parts[2];
  }
  return basename(filePath, ".pdf");
}

async function findDropboxAnswerCandidate({
  question,
  questionType,
  extractPdfTextFromFileImpl = extractPdfTextFromFile,
}) {
  const customersRoot = getDropboxCustomersRoot();
  if (!customersRoot || !existsSync(customersRoot)) {
    return null;
  }

  const candidates = walkPdfFiles(customersRoot)
    .map((filePath) => ({
      filePath,
      score: scoreDropboxPathAgainstQuestion(filePath, question),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return statSync(right.filePath).mtimeMs - statSync(left.filePath).mtimeMs;
    })
    .slice(0, 40);

  for (const candidate of candidates) {
    let pdfTextResult;
    try {
      pdfTextResult = await extractPdfTextFromFileImpl(candidate.filePath);
    } catch {
      continue;
    }

    let answer;
    try {
      answer = extractAnswerFromText(questionType, pdfTextResult.text);
    } catch (error) {
      if (error?.code === "COMPANYCAM_TOTAL_GALLONS_NOT_FOUND") {
        continue;
      }
      throw error;
    }

    const fileStats = statSync(candidate.filePath);
    return {
      provider: "dropbox",
      project: {
        id: null,
        name: inferDropboxProjectName(candidate.filePath, customersRoot),
        address: null,
        projectUrl: "",
        publicUrl: "",
      },
      allProjects: [],
      answer,
      sourceDocument: {
        id: candidate.filePath,
        name: basename(candidate.filePath),
        contentType: "application/pdf",
        byteSize: fileStats.size,
        updatedAt: fileStats.mtime.toISOString(),
        filePath: candidate.filePath,
      },
      source: {
        type: "dropbox_customer_pdf",
        evidenceSnippet: answer.evidenceSnippet,
        pdfBytes: pdfTextResult.byteLength,
        filePath: candidate.filePath,
      },
      totalScore: candidate.score + 30,
    };
  }

  return null;
}

export function assertAquatraceCompanyCamTenantScope(tenantId) {
  const normalizedTenantId = normalizeCompanyCamTenantId(tenantId);
  if (!ALLOWED_COMPANYCAM_TENANT_IDS.has(normalizedTenantId)) {
    throw createCompanyCamQuestionError(
      `CompanyCam access is not approved for tenant "${normalizedTenantId}".`,
      {
        status: 403,
        code: "COMPANYCAM_TENANT_SCOPE_DENIED",
      }
    );
  }

  return normalizedTenantId;
}

export async function answerCompanyCamReportQuestion({
  companyCamRail,
  tenantId,
  question,
  projectQuery,
  projectId,
  extractPdfTextFromUrlImpl = extractPdfTextFromUrl,
  extractPdfTextFromFileImpl = extractPdfTextFromFile,
} = {}) {
  const scopedTenantId = assertAquatraceCompanyCamTenantScope(tenantId);
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    throw createCompanyCamQuestionError("A CompanyCam question is required.", {
      status: 400,
      code: "COMPANYCAM_QUESTION_REQUIRED",
    });
  }

  const questionType = detectCompanyCamQuestionType(normalizedQuestion);
  const attemptedProviders = [];

  const companyCamCandidate = await findCompanyCamAnswerCandidate({
    companyCamRail,
    question: normalizedQuestion,
    questionType,
    projectQuery,
    projectId,
    extractPdfTextFromUrlImpl,
  });
  attemptedProviders.push("companycam");

  const resolvedCandidate =
    companyCamCandidate ||
    (await findDropboxAnswerCandidate({
      question: normalizedQuestion,
      questionType,
      extractPdfTextFromFileImpl,
    }));

  if (!companyCamCandidate) {
    attemptedProviders.push("dropbox");
  }

  if (!resolvedCandidate) {
    throw createCompanyCamQuestionError(
      "No CompanyCam or Dropbox report source matched that question.",
      {
        status: 404,
        code: "COMPANYCAM_PROJECT_NOT_FOUND",
      }
    );
  }

  const alternativeProjects = (resolvedCandidate.allProjects || [])
    .filter((project) => project.id && project.id !== resolvedCandidate.project.id)
    .slice(0, 3)
    .map((project) => ({
      id: project.id,
      name: project.name,
      address: project.address || null,
      score: project._score ?? scoreProjectAgainstQuestion(project, normalizedQuestion),
    }));

  return {
    ok: true,
    tenantId: scopedTenantId,
    question: normalizedQuestion,
    questionType,
    answer: resolvedCandidate.answer,
    project: {
      id: resolvedCandidate.project.id,
      name: resolvedCandidate.project.name,
      address: resolvedCandidate.project.address || null,
      projectUrl: resolvedCandidate.project.projectUrl || "",
      publicUrl: resolvedCandidate.project.publicUrl || "",
    },
    alternativeProjects,
    sourceDocument: resolvedCandidate.sourceDocument,
    source: resolvedCandidate.source,
    resourcePath: {
      provider: resolvedCandidate.provider,
      attemptedProviders,
      companyCamPreferred: true,
      dropboxFallbackUsed: resolvedCandidate.provider === "dropbox",
      jobberReady: false,
    },
  };
}

export function formatCompanyCamReportAnswer(result = {}) {
  return [
    "COMPANYCAM JOB DATA",
    `- tenant: ${result.tenantId || DEFAULT_COMPANYCAM_TENANT_ID}`,
    `- project: ${result?.project?.name || "unknown"}`,
    `- address: ${[
      result?.project?.address?.street_address_1,
      result?.project?.address?.city,
      result?.project?.address?.state,
      result?.project?.address?.postal_code,
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join(", ")}`,
    `- answer: ${result?.answer?.fieldLabel || TOTAL_GALLONS_LABEL} = ${result?.answer?.displayValue || "unknown"}`,
    `- source document: ${result?.sourceDocument?.name || "unknown"}`,
    `- evidence: ${normalizeText(result?.source?.evidenceSnippet) || "not available"}`,
    `- source provider: ${normalizeText(result?.resourcePath?.provider) || "companycam"}`,
    `- alternate project matches: ${
      Array.isArray(result?.alternativeProjects) && result.alternativeProjects.length > 0
        ? result.alternativeProjects.map((project) => `${project.name} (${project.id})`).join(" ; ")
        : "none"
    }`,
    "- CompanyCam mode: read-only",
  ].join("\n");
}

export const companyCamQuestionServiceInternals = {
  ALLOWED_COMPANYCAM_TENANT_IDS,
  DEFAULT_AQUATRACE_DROPBOX_BASE,
  DEFAULT_COMPANYCAM_TENANT_ID,
  GENERIC_QUESTION_TOKENS,
  TOTAL_GALLONS_LABEL,
  buildProjectMatchText,
  buildProjectSearchQueries,
  buildUsefulQuestionTokens,
  createCompanyCamQuestionError,
  detectCompanyCamQuestionType,
  extractAnswerFromText,
  extractPdfTextFromBuffer,
  extractPdfTextFromFile,
  extractPdfTextFromUrl,
  findCompanyCamAnswerCandidate,
  findDropboxAnswerCandidate,
  getDropboxCustomersRoot,
  inferDropboxProjectName,
  normalizeAnswerNumber,
  normalizeCompanyCamTenantId,
  scoreDocumentAgainstQuestion,
  scoreDropboxPathAgainstQuestion,
  scoreProjectAgainstQuestion,
  scoreTextAgainstQuestion,
  tokenizeQuestion,
  walkPdfFiles,
};
