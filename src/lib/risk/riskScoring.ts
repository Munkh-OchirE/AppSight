import type { Answer, Assessment, EvidenceItem } from "@prisma/client";
import {
  accessRiskRules,
  categoryCaps,
  contractLegalRiskRules,
  criticalityRiskPoints,
  dataRiskRules,
  defaultRequiredEvidenceGapPoints,
  evidenceGapRiskRules,
  integrationRiskRules,
  maxRiskScore,
  type RiskCategory,
  type RiskRating
} from "@/config/riskRules";
import { getAssessmentLevel, getRiskRating } from "@/lib/assessment/assessmentLevel";
import { createAuditLog } from "@/lib/audit/auditLog";
import { db } from "@/lib/db";
import {
  answerKey,
  buildAnswerMap,
  getCriticality,
  hasSensitiveData,
  isTruthy,
  type AnswerMap
} from "@/lib/dynamicQuestions/ruleEvaluator";
import { getVisibleQuestions } from "@/lib/dynamicQuestions/questionEngine";
import {
  calculateSmartEvidenceRequirements,
  type EvidenceRequirementResult
} from "@/lib/evidence/smartEvidenceRequest";

export type RiskFindingDraft = {
  title: string;
  severity: RiskRating;
  category: RiskCategory;
  scoreImpact: number;
  reason: string;
  recommendation?: string;
};

export type RiskScoreResult = {
  riskScore: number;
  riskRating: RiskRating;
  assessmentLevel: string;
  categoryScores: Record<RiskCategory, number>;
  riskFindings: RiskFindingDraft[];
  evidenceRequirements: EvidenceRequirementResult[];
};

type ScoringContext = {
  assessment: Assessment;
  answers: Answer[];
  evidenceItems: EvidenceItem[];
  answerMap: AnswerMap;
  visibleAnswerKeys: Set<string>;
  sensitiveData: boolean;
  privilegedAccess: boolean;
};

const privilegedAccessFields = [
  "access.adminAccess",
  "access.productionAccess",
  "access.cloudEnvironmentAccess",
  "access.otDigitalSystemsAccess"
];

function capScore(score: number, category: RiskCategory) {
  return Math.min(score, categoryCaps[category]);
}

function severityForImpact(scoreImpact: number): RiskRating {
  if (scoreImpact >= 25) {
    return "Critical";
  }

  if (scoreImpact >= 15) {
    return "High";
  }

  if (scoreImpact >= 10) {
    return "Medium";
  }

  return "Low";
}

function capFindings(
  findings: RiskFindingDraft[],
  category: RiskCategory
): RiskFindingDraft[] {
  let remaining = categoryCaps[category];
  const capped: RiskFindingDraft[] = [];

  for (const finding of findings) {
    if (remaining <= 0) {
      break;
    }

    const scoreImpact = Math.min(finding.scoreImpact, remaining);
    remaining -= scoreImpact;
    capped.push({
      ...finding,
      scoreImpact,
      severity: severityForImpact(scoreImpact)
    });
  }

  return capped;
}

function sumFindings(findings: RiskFindingDraft[]) {
  return findings.reduce((total, finding) => total + finding.scoreImpact, 0);
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

function normalizedSelectValue(value: unknown) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return "Unknown";
  }

  return value.trim();
}

export function getScoringAnswers(input: {
  assessment: Assessment;
  answers: Answer[];
}) {
  const visibleQuestions = getVisibleQuestions({
    assessment: input.assessment,
    answers: input.answers
  });
  const visibleAnswerKeys = new Set(
    visibleQuestions.map((question) => answerKey(question.section, question.field))
  );

  return input.answers.filter((answer) =>
    visibleAnswerKeys.has(answerKey(answer.section, answer.field))
  );
}

export function buildScoringContext(input: {
  assessment: Assessment;
  answers: Answer[];
  evidenceItems: EvidenceItem[];
}): ScoringContext {
  const visibleQuestions = getVisibleQuestions({
    assessment: input.assessment,
    answers: input.answers
  });
  const visibleAnswerKeys = new Set(
    visibleQuestions.map((question) => answerKey(question.section, question.field))
  );
  const answers = input.answers.filter((answer) =>
    visibleAnswerKeys.has(answerKey(answer.section, answer.field))
  );
  const answerMap = buildAnswerMap(input.assessment, answers);

  return {
    assessment: input.assessment,
    answers,
    evidenceItems: input.evidenceItems,
    answerMap,
    visibleAnswerKeys,
    sensitiveData: hasSensitiveData(answerMap),
    privilegedAccess: privilegedAccessFields.some((field) => isTruthy(answerMap[field]))
  };
}

function calculateAccessRisk(context: ScoringContext) {
  const category: RiskCategory = "Access Risk";

  if (isTruthy(context.answerMap["access.noSystemAccess"])) {
    return { score: 0, findings: [] };
  }

  const selected = accessRiskRules.filter((rule) =>
    isTruthy(context.answerMap[rule.field])
  );

  if (selected.length === 0) {
    return { score: 0, findings: [] };
  }

  const [primary] = [...selected].sort((left, right) => right.points - left.points);
  const modifierCount = selected.filter((rule) => rule.field !== primary.field).length;
  const score = capScore(primary.points + modifierCount * 5, category);
  const labels = selected.map((rule) => rule.label).join(", ");

  return {
    score,
    findings: [
      {
        title: `Access exposure: ${primary.label}`,
        severity: severityForImpact(score),
        category,
        scoreImpact: score,
        reason: `Highest selected access type is ${primary.label}. Selected access types: ${labels}.`,
        recommendation:
          "Confirm least privilege, MFA, logging, and time-bound access for selected access paths."
      }
    ]
  };
}

function calculateDataRisk(context: ScoringContext) {
  const category: RiskCategory = "Data Risk";

  if (isTruthy(context.answerMap["data.noCompanyData"])) {
    return { score: 0, findings: [] };
  }

  const selected = dataRiskRules.filter((rule) => isTruthy(context.answerMap[rule.field]));
  const rawScore = selected.reduce((total, rule) => total + rule.points, 0);
  const score = capScore(rawScore, category);

  if (score === 0) {
    return { score: 0, findings: [] };
  }

  const labels = selected
    .filter((rule) => rule.points > 0)
    .map((rule) => rule.label)
    .join(", ");

  return {
    score,
    findings: [
      {
        title: "Company or sensitive data exposure",
        severity: severityForImpact(score),
        category,
        scoreImpact: score,
        reason: `Selected data categories: ${labels}.`,
        recommendation:
          "Confirm data classification, retention, deletion, transfer, and contractual handling requirements."
      }
    ]
  };
}

function calculateIntegrationRisk(context: ScoringContext) {
  const category: RiskCategory = "Integration Risk";
  const matchedRules = integrationRiskRules.filter((rule) =>
    rule.anyFields.some((field) => valueIsMeaningfulSignal(context.answerMap[field]))
  );
  const rawScore = matchedRules.reduce((total, rule) => total + rule.points, 0);
  const score = capScore(rawScore, category);

  if (score === 0) {
    return { score: 0, findings: [] };
  }

  return {
    score,
    findings: [
      {
        title: "Integration complexity",
        severity: severityForImpact(score),
        category,
        scoreImpact: score,
        reason: `Matched integration factors: ${matchedRules
          .map((rule) => rule.label)
          .join(", ")}.`,
        recommendation:
          "Validate integration scope, authentication, least privilege, logging, and operational ownership."
      }
    ]
  };
}

function calculateBusinessCriticalityRisk(context: ScoringContext) {
  const category: RiskCategory = "Business Criticality Risk";
  const criticality = getCriticality(context.answerMap);
  const score = capScore(criticalityRiskPoints[criticality] ?? 0, category);

  if (score === 0) {
    return { score: 0, findings: [] };
  }

  return {
    score,
    findings: [
      {
        title: `${criticality} business criticality`,
        severity: severityForImpact(score),
        category,
        scoreImpact: score,
        reason: `The application is marked as ${criticality} criticality.`,
        recommendation:
          "Confirm business owner, support model, service levels, and BCP/DR expectations."
      }
    ]
  };
}

function calculateEvidenceGapRisk(requirements: EvidenceRequirementResult[]) {
  const category: RiskCategory = "Evidence Gap Risk";
  const rawFindings = requirements
    .filter(
      (requirement) =>
        requirement.baseRequirementLevel === "required" && !requirement.complete
    )
    .map((requirement) => {
      const configuredRule = evidenceGapRiskRules.find(
        (rule) => rule.requirementId === requirement.id
      );
      const scoreImpact =
        configuredRule?.points ?? defaultRequiredEvidenceGapPoints;
      const needsVerification =
        requirement.requirementLevel === "needs_verification";

      return {
        title: needsVerification
          ? `Required evidence needs verification: ${requirement.type}`
          : configuredRule?.title ?? `Missing required evidence: ${requirement.type}`,
        severity: severityForImpact(scoreImpact),
        category,
        scoreImpact,
        reason: needsVerification
          ? `${requirement.type} is required but only unverified evidence or claims are present. ${requirement.notes}`
          : `${requirement.type} is required and no complete verified evidence is present. ${requirement.notes}`,
        recommendation:
          configuredRule?.recommendation ??
          `Provide and verify required evidence for ${requirement.type}.`
      };
    });
  const findings = capFindings(rawFindings, category);

  return {
    score: sumFindings(findings),
    findings
  };
}

function contractConditionApplies(
  rule: (typeof contractLegalRiskRules)[number],
  context: ScoringContext
) {
  if (rule.condition === "sensitiveData") {
    return context.sensitiveData;
  }

  if (rule.condition === "privilegedAccess") {
    return context.privilegedAccess;
  }

  return true;
}

function calculateContractLegalRisk(context: ScoringContext) {
  const category: RiskCategory = "Contract/Legal Gap Risk";
  const rawFindings = contractLegalRiskRules.flatMap((rule) => {
    if (!contractConditionApplies(rule, context)) {
      return [];
    }

    if (!context.visibleAnswerKeys.has(rule.field)) {
      return [];
    }

    const value = normalizedSelectValue(context.answerMap[rule.field]);
    const scoreImpact = rule.pointsByValue[value] ?? 0;

    if (scoreImpact === 0) {
      return [];
    }

    return [
      {
        title: rule.label,
        severity: severityForImpact(scoreImpact),
        category,
        scoreImpact,
        reason: `${rule.label}: ${value}.`,
        recommendation: rule.recommendation
      }
    ];
  });
  const findings = capFindings(rawFindings, category);

  return {
    score: sumFindings(findings),
    findings
  };
}

export function calculateRisk(input: {
  assessment: Assessment;
  answers: Answer[];
  evidenceItems: EvidenceItem[];
}): RiskScoreResult {
  const context = buildScoringContext(input);
  const evidenceRequirements = calculateSmartEvidenceRequirements({
    assessment: context.assessment,
    answers: context.answers,
    evidenceItems: context.evidenceItems
  });

  const accessRisk = calculateAccessRisk(context);
  const dataRisk = calculateDataRisk(context);
  const integrationRisk = calculateIntegrationRisk(context);
  const businessCriticalityRisk = calculateBusinessCriticalityRisk(context);
  const evidenceGapRisk = calculateEvidenceGapRisk(evidenceRequirements);
  const contractLegalRisk = calculateContractLegalRisk(context);

  const categoryScores: Record<RiskCategory, number> = {
    "Access Risk": accessRisk.score,
    "Data Risk": dataRisk.score,
    "Integration Risk": integrationRisk.score,
    "Business Criticality Risk": businessCriticalityRisk.score,
    "Evidence Gap Risk": evidenceGapRisk.score,
    "Contract/Legal Gap Risk": contractLegalRisk.score
  };
  const rawRiskScore = Object.values(categoryScores).reduce(
    (total, score) => total + score,
    0
  );
  const riskScore = Math.min(rawRiskScore, maxRiskScore);
  const riskRating = getRiskRating(riskScore);
  const assessmentLevel = getAssessmentLevel(riskRating);

  return {
    riskScore,
    riskRating,
    assessmentLevel,
    categoryScores,
    riskFindings: [
      ...accessRisk.findings,
      ...dataRisk.findings,
      ...integrationRisk.findings,
      ...businessCriticalityRisk.findings,
      ...evidenceGapRisk.findings,
      ...contractLegalRisk.findings
    ],
    evidenceRequirements
  };
}

export async function calculateAndPersistRisk(assessmentId: string) {
  return db.$transaction(async (tx) => {
    const assessment = await tx.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        answers: true,
        evidenceItems: true
      }
    });

    if (!assessment) {
      return null;
    }

    const result = calculateRisk({
      assessment,
      answers: assessment.answers,
      evidenceItems: assessment.evidenceItems
    });

    await tx.riskFinding.deleteMany({
      where: { assessmentId }
    });

    for (const finding of result.riskFindings) {
      await tx.riskFinding.create({
        data: {
          assessmentId,
          title: finding.title,
          severity: finding.severity,
          category: finding.category,
          scoreImpact: finding.scoreImpact,
          reason: finding.reason,
          recommendation: finding.recommendation
        }
      });
    }

    await tx.assessment.update({
      where: { id: assessmentId },
      data: {
        riskScore: result.riskScore,
        riskRating: result.riskRating,
        assessmentLevel: result.assessmentLevel
      }
    });

    await createAuditLog(tx, {
      assessmentId,
      action: "risk_score_calculated",
      details: {
        riskScore: result.riskScore,
        riskRating: result.riskRating,
        assessmentLevel: result.assessmentLevel
      }
    });

    return result;
  });
}
