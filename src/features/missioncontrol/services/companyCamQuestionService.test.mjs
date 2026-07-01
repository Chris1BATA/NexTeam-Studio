import test from "node:test";
import assert from "node:assert/strict";

import {
  assertAquatraceCompanyCamTenantScope,
  extractTotalGallonsFromText,
  formatCompanyCamReportAnswer,
  scoreProjectAgainstQuestion,
} from "./companyCamQuestionService.js";

const CAMP_MIKELL_EXCERPT = `
Square Footage (Surface Area)
2,872 sq ft
Estimated Average Depth (Inches)
56"
Estimated Approximate Gallons / Inch (Square Footage x .625)
1,795 Gallons/Inch
Estimated Approximate Total Gallons
101,000 Gallons
Swimming Pool Measurements
`;

const CAMP_MIKELL_PROJECT = {
  id: "106765062",
  name: "Alex Mastej",
  address: {
    street_address_1: "237 Camp Mikell Court",
    city: "Toccoa",
    state: "Georgia",
    postal_code: "30577",
  },
};

const OTHER_TOCCOA_PROJECT = {
  id: "70892670",
  name: "Brenda Bigley",
  address: {
    street_address_1: "1222 Camp Mikell Road",
    city: "Toccoa",
    state: "Georgia",
    postal_code: "30577",
  },
};

test("Aquatrace-only CompanyCam tenant scope rejects other tenants", () => {
  assert.equal(assertAquatraceCompanyCamTenantScope("aquatrace"), "aquatrace");
  assert.equal(assertAquatraceCompanyCamTenantScope("aquatrace-case-study"), "aquatrace-case-study");
  assert.throws(
    () => assertAquatraceCompanyCamTenantScope("other-client"),
    /not approved for tenant/i
  );
});

test("total gallons extractor pulls the numeric gallons answer from report text", () => {
  const result = extractTotalGallonsFromText(CAMP_MIKELL_EXCERPT);

  assert.equal(result.fieldLabel, "Estimated Approximate Total Gallons");
  assert.equal(result.rawValue, "101,000");
  assert.equal(result.numericValue, 101000);
  assert.equal(result.displayValue, "101,000 Gallons");
  assert.match(result.evidenceSnippet, /Estimated Approximate Total Gallons/i);
});

test("project scoring keeps the exact Camp Mikell property tied or ahead of another Toccoa project", () => {
  const question = "What are the total pool gallons in the report for Camp Mikell in Toccoa GA?";
  const campScore = scoreProjectAgainstQuestion(CAMP_MIKELL_PROJECT, question);
  const otherScore = scoreProjectAgainstQuestion(OTHER_TOCCOA_PROJECT, question);

  assert.ok(
    campScore >= otherScore,
    `expected Camp Mikell score ${campScore} to stay tied or ahead of alternate project score ${otherScore}`
  );
});

test("formatted CompanyCam answer is readable for operator-facing proofs", () => {
  const output = formatCompanyCamReportAnswer({
    tenantId: "aquatrace",
    project: CAMP_MIKELL_PROJECT,
    answer: {
      fieldLabel: "Estimated Approximate Total Gallons",
      displayValue: "101,000 Gallons",
    },
    sourceDocument: {
      name: "Exported - Current Aquatrace Swimming Pool Leak Detection Checklist 06-05-2026.pdf",
    },
    source: {
      evidenceSnippet: "Estimated Approximate Total Gallons 101,000 Gallons",
    },
    alternativeProjects: [OTHER_TOCCOA_PROJECT],
  });

  assert.match(output, /COMPANYCAM JOB DATA/);
  assert.match(output, /101,000 Gallons/);
  assert.match(output, /Alex Mastej/);
  assert.match(output, /Brenda Bigley/);
  assert.match(output, /read-only/i);
});
