import type { Prisma } from "@prisma/client";
import {
  accessRiskRules,
  dataRiskRules,
  integrationRiskRules,
  type RiskCategory
} from "@/config/riskRules";
import { db } from "@/lib/db";
import { isTruthy } from "@/lib/dynamicQuestions/ruleEvaluator";
import type { EvidenceRequirementResult } from "@/lib/evidence/smartEvidenceRequest";
import type { SummaryCheckpoint } from "@/lib/llm/checkpoints";
import { summaryOutputSchema, type SummaryOutput } from "@/lib/llm/schemas";
import {
  buildScoringContext,
  calculateAndPersistRisk,
  calculateRisk
} from "@/lib/risk/riskScoring";

const reportAssessmentInclude = {
  answers: { orderBy: [{ section: "asc" as const }, { field: "asc" as const }] },
  evidenceItems: { orderBy: [{ type: "asc" as const }, { createdAt: "desc" as const }] },
  riskFindings: {
    orderBy: [{ scoreImpact: "desc" as const }, { createdAt: "asc" as const }]
  },
  llmOutputs: { orderBy: { createdAt: "desc" as const } },
  reports: { orderBy: { createdAt: "desc" as const }, take: 1 }
};

type ReportAssessmentRecord = Prisma.AssessmentGetPayload<{
  include: typeof reportAssessmentInclude;
}>;

export type ReportFinding = {
  id?: string;
  title: string;
  severity: string;
  category: string;
  scoreImpact: number;
  reason: string;
  recommendation: string | null;
};

export type ReportEvidenceRequirement = {
  id: string;
  type: string;
  requirementLevel: string;
  baseRequirementLevel: string;
  complete: boolean;
  notes: string;
};

export type RiskSnapshotReport = {
  generatedAt: string;
  assessment: {
    id: string;
    applicationName: string;
    vendorName: string;
    businessOwner: string | null;
    procurementStage: string | null;
    criticality: string | null;
    assessmentLevel: string;
    riskScore: number;
    riskRating: string;
    status: string;
    decisionStatus: string | null;
    decisionBy: string | null;
    decisionAt: string | null;
    decisionJustification: string | null;
    rejectionReason: string | null;
    remediationActions: string | null;
  };
  categoryScores: Record<RiskCategory, number>;
  executiveSummary: string;
  keyRiskDrivers: ReportFinding[];
  summaries: {
    access: string;
    data: string;
    integration: string;
    evidence: string;
  };
  evidence: {
    required: ReportEvidenceRequirement[];
    missing: ReportEvidenceRequirement[];
    needsVerification: ReportEvidenceRequirement[];
    notApplicable: ReportEvidenceRequirement[];
    complete: ReportEvidenceRequirement[];
  };
  contractLegalGaps: ReportFinding[];
  requiredControls: string[];
  vendorFollowUpQuestions: string[];
  approvalRecommendation: string;
  approvalDetails: {
    approvedWithExceptions: boolean;
    rejectionDueDate: string | null;
    rejectionOwner: string | null;
  };
  riskFindings: ReportFinding[];
  latestMarkdownReport: {
    id: string;
    createdAt: string;
  } | null;
  latestSummary: {
    id: string;
    createdAt: string;
    summary: SummaryOutput | null;
    checkpoints: SummaryCheckpoint[];
    parseError: string | null;
  } | null;
};

function toReportFinding(finding: {
  id?: string;
  title: string;
  severity: string;
  category: string;
  scoreImpact: number;
  reason: string;
  recommendation?: string | null;
}): ReportFinding {
  return {
    id: finding.id,
    title: finding.title,
    severity: finding.severity,
    category: finding.category,
    scoreImpact: finding.scoreImpact,
    reason: finding.reason,
    recommendation: finding.recommendation ?? null
  };
}

function toReportRequirement(
  requirement: EvidenceRequirementResult
): ReportEvidenceRequirement {
  return {
    id: requirement.id,
    type: requirement.type,
    requirementLevel: requirement.requirementLevel,
    baseRequirementLevel: requirement.baseRequirementLevel,
    complete: requirement.complete,
    notes: requirement.notes
  };
}

function listOrFallback(items: string[], fallback: string) {
  return items.length > 0 ? items.join(", ") : fallback;
}

function valueIsMeaningfulSignal(value: unknown) {
  if (isTruthy(value)) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized.length > 0 &&
    normalized !== "unknown" &&
    normalized !== "no" &&
    normalized !== "not applicable"
  );
}

function buildSummaries(input: {
  assessment: ReportAssessmentRecord;
  requirements: EvidenceRequirementResult[];
}) {
  const context = buildScoringContext({
    assessment: input.assessment,
    answers: input.assessment.answers,
    evidenceItems: input.assessment.evidenceItems
  });
  const accessLabels = isTruthy(context.answerMap["access.noSystemAccess"])
    ? ["No system access"]
    : accessRiskRules
        .filter((rule) => isTruthy(context.answerMap[rule.field]))
        .map((rule) => rule.label);
  const dataLabels = isTruthy(context.answerMap["data.noCompanyData"])
    ? ["No company data"]
    : dataRiskRules
        .filter((rule) => isTruthy(context.answerMap[rule.field]))
        .map((rule) => rule.label);
  const integrationLabels = integrationRiskRules
    .filter((rule) =>
      rule.anyFields.some((field) => valueIsMeaningfulSignal(context.answerMap[field]))
    )
    .map((rule) => rule.label);
  const required = input.requirements.filter(
    (requirement) => requirement.baseRequirementLevel === "required"
  );
  const complete = required.filter((requirement) => requirement.complete).length;
  const incomplete = required.length - complete;

  return {
    access: listOrFallback(accessLabels, "No access paths have been selected."),
    data: listOrFallback(dataLabels, "No company data categories have been selected."),
    integration: listOrFallback(
      integrationLabels,
      "No integration complexity has been identified."
    ),
    evidence:
      required.length === 0
        ? "No required evidence applies yet."
        : `${complete} of ${required.length} required evidence items are complete; ${incomplete} remain open.`
  };
}

function buildExecutiveSummary(input: {
  assessment: ReportAssessmentRecord;
  riskScore: number;
  riskRating: string;
  assessmentLevel: string;
  missingEvidence: ReportEvidenceRequirement[];
}) {
  const missingText =
    input.missingEvidence.length === 0
      ? "No required evidence gaps are currently open."
      : `${input.missingEvidence.length} required evidence item(s) remain missing or unverified.`;

  return `${input.assessment.applicationName} from ${input.assessment.vendorName} is rated ${input.riskRating} with a score of ${input.riskScore} and ${input.assessmentLevel}. ${missingText}`;
}

function buildRequiredControls(input: {
  findings: ReportFinding[];
  missingEvidence: ReportEvidenceRequirement[];
}) {
  const controls = new Set<string>();

  for (const requirement of input.missingEvidence) {
    controls.add(`Provide and verify ${requirement.type}.`);
  }

  if (input.findings.some((finding) => finding.category === "Access Risk")) {
    controls.add("Confirm MFA, least privilege, logging, and time-bound access.");
  }

  if (input.findings.some((finding) => finding.category === "Data Risk")) {
    controls.add("Confirm data retention, deletion, transfer, and handling controls.");
  }

  if (input.findings.some((finding) => finding.category === "Integration Risk")) {
    controls.add("Confirm integration authentication, authorization, and monitoring.");
  }

  if (input.findings.some((finding) => finding.category === "Business Criticality Risk")) {
    controls.add("Confirm support model, service levels, and BCP/DR expectations.");
  }

  return Array.from(controls);
}

function buildVendorFollowUpQuestions(input: {
  missingEvidence: ReportEvidenceRequirement[];
  contractLegalGaps: ReportFinding[];
}) {
  const questions = new Set<string>();

  for (const requirement of input.missingEvidence) {
    questions.add(`Can the vendor provide or verify ${requirement.type}?`);
  }

  for (const gap of input.contractLegalGaps) {
    questions.add(`Please clarify: ${gap.title}.`);
  }

  return Array.from(questions);
}

function buildApprovalRecommendation(input: {
  riskRating: string;
  missingEvidence: ReportEvidenceRequirement[];
}) {
  if (input.missingEvidence.length > 0) {
    return "Do not approve until required evidence gaps are resolved or formally accepted.";
  }

  if (input.riskRating === "Critical") {
    return "Escalate for critical review before approval.";
  }

  if (input.riskRating === "High") {
    return "Proceed only after enhanced review confirms the residual risk is acceptable.";
  }

  if (input.riskRating === "Medium") {
    return "Proceed with standard reviewer approval if open clarifications are acceptable.";
  }

  return "Eligible for light review approval if business ownership and scope are confirmed.";
}

function parseLatestSummary(output: ReportAssessmentRecord["llmOutputs"][number]) {
  try {
    const parsedSummary = summaryOutputSchema.safeParse(JSON.parse(output.outputJson));
    const checkpoints = output.checkpointsJson
      ? (JSON.parse(output.checkpointsJson) as SummaryCheckpoint[])
      : [];

    if (!parsedSummary.success) {
      return {
        id: output.id,
        createdAt: output.createdAt.toISOString(),
        summary: null,
        checkpoints,
        parseError: "Saved summary output did not match the current schema."
      };
    }

    return {
      id: output.id,
      createdAt: output.createdAt.toISOString(),
      summary: parsedSummary.data,
      checkpoints,
      parseError: null
    };
  } catch {
    return {
      id: output.id,
      createdAt: output.createdAt.toISOString(),
      summary: null,
      checkpoints: [],
      parseError: "Saved summary output could not be parsed."
    };
  }
}

export function buildReportData(assessment: ReportAssessmentRecord): RiskSnapshotReport {
  const scoringSnapshot = calculateRisk({
    assessment,
    answers: assessment.answers,
    evidenceItems: assessment.evidenceItems
  });
  const riskScore = assessment.riskScore ?? scoringSnapshot.riskScore;
  const riskRating = assessment.riskRating ?? scoringSnapshot.riskRating;
  const assessmentLevel = assessment.assessmentLevel ?? scoringSnapshot.assessmentLevel;
  const findings =
    assessment.riskFindings.length > 0
      ? assessment.riskFindings.map(toReportFinding)
      : scoringSnapshot.riskFindings.map(toReportFinding);
  const requirements = scoringSnapshot.evidenceRequirements.map(toReportRequirement);
  const missingEvidence = requirements.filter(
    (requirement) =>
      requirement.baseRequirementLevel === "required" && !requirement.complete
  );
  const needsVerification = requirements.filter(
    (requirement) => requirement.requirementLevel === "needs_verification"
  );
  const contractLegalGaps = findings.filter(
    (finding) => finding.category === "Contract/Legal Gap Risk"
  );
  const keyRiskDrivers = [...findings]
    .sort((left, right) => right.scoreImpact - left.scoreImpact)
    .slice(0, 6);
  const summaries = buildSummaries({
    assessment,
    requirements: scoringSnapshot.evidenceRequirements
  });
  const latestMarkdownReport = assessment.reports[0]
    ? {
        id: assessment.reports[0].id,
        createdAt: assessment.reports[0].createdAt.toISOString()
      }
    : null;
  const latestSummaryOutput = assessment.llmOutputs.find(
    (output) => output.type === "summary"
  );

  return {
    generatedAt: new Date().toISOString(),
    assessment: {
      id: assessment.id,
      applicationName: assessment.applicationName,
      vendorName: assessment.vendorName,
      businessOwner: assessment.businessOwner,
      procurementStage: assessment.procurementStage,
      criticality: assessment.criticality,
      assessmentLevel,
      riskScore,
      riskRating,
      status: assessment.status,
      decisionStatus: assessment.decisionStatus,
      decisionBy: assessment.decisionBy,
      decisionAt: assessment.decisionAt?.toISOString() ?? null,
      decisionJustification: assessment.decisionJustification,
      rejectionReason: assessment.rejectionReason,
      remediationActions: assessment.remediationActions
    },
    categoryScores: scoringSnapshot.categoryScores,
    executiveSummary: buildExecutiveSummary({
      assessment,
      riskScore,
      riskRating,
      assessmentLevel,
      missingEvidence
    }),
    keyRiskDrivers,
    summaries,
    evidence: {
      required: requirements.filter(
        (requirement) => requirement.baseRequirementLevel === "required"
      ),
      missing: missingEvidence,
      needsVerification,
      notApplicable: requirements.filter(
        (requirement) => requirement.requirementLevel === "not_applicable"
      ),
      complete: requirements.filter((requirement) => requirement.complete)
    },
    contractLegalGaps,
    requiredControls: buildRequiredControls({
      findings,
      missingEvidence
    }),
    vendorFollowUpQuestions: buildVendorFollowUpQuestions({
      missingEvidence,
      contractLegalGaps
    }),
    approvalRecommendation: buildApprovalRecommendation({
      riskRating,
      missingEvidence
    }),
    approvalDetails: {
      approvedWithExceptions: assessment.approvedWithExceptions,
      rejectionDueDate: assessment.rejectionDueDate?.toISOString() ?? null,
      rejectionOwner: assessment.rejectionOwner
    },
    riskFindings: findings,
    latestMarkdownReport,
    latestSummary: latestSummaryOutput
      ? parseLatestSummary(latestSummaryOutput)
      : null
  };
}

async function loadReportAssessment(assessmentId: string) {
  return db.assessment.findUnique({
    where: { id: assessmentId },
    include: reportAssessmentInclude
  });
}

export async function getReportData(assessmentId: string) {
  let assessment = await loadReportAssessment(assessmentId);

  if (!assessment) {
    return null;
  }

  if (
    assessment.riskScore === null ||
    assessment.riskRating === null ||
    assessment.assessmentLevel === null ||
    assessment.riskFindings.length === 0
  ) {
    await calculateAndPersistRisk(assessmentId);
    assessment = await loadReportAssessment(assessmentId);
  }

  return assessment ? buildReportData(assessment) : null;
}
