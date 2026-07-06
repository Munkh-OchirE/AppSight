import type { Answer, Assessment, EvidenceItem, RiskFinding } from "@prisma/client";
import type { QuestionDefinition } from "@/config/questions";
import { db } from "@/lib/db";
import {
  answerKey,
  buildAnswerMap,
  getCriticality,
  isTruthy,
  parseStoredValue
} from "@/lib/dynamicQuestions/ruleEvaluator";
import { getVisibleQuestions } from "@/lib/dynamicQuestions/questionEngine";
import {
  calculateSmartEvidenceRequirements,
  type EvidenceRequirementResult
} from "@/lib/evidence/smartEvidenceRequest";
import { calculateAndPersistRisk, getScoringAnswers } from "@/lib/risk/riskScoring";

export type ApprovalReadinessItem = {
  type:
    | "required_evidence"
    | "evidence_verification"
    | "required_question"
    | "high_risk_unknown"
    | "risk_review"
    | "recommended_evidence";
  title: string;
  details: string;
  severity: "blocking" | "warning";
  requirementId?: string;
  questionId?: string;
};

export type RecommendedDecision =
  | "approve"
  | "approve_with_exceptions"
  | "reject_review_required";

export type ApprovalReadinessResult = {
  canApproveCleanly: boolean;
  requiresExceptionApproval: boolean;
  blockingItems: ApprovalReadinessItem[];
  warningItems: ApprovalReadinessItem[];
  riskRating: string;
  riskScore: number;
  assessmentLevel: string;
  recommendedDecision: RecommendedDecision;
  requiredEvidence: EvidenceRequirementResult[];
};

type AssessmentWithRelations = Assessment & {
  answers: Answer[];
  evidenceItems: EvidenceItem[];
  riskFindings: RiskFinding[];
};

const requiredQuestionSections = new Set([
  "application_integration_profile",
  "business_process_dependency"
]);

const highRiskQuestionSections = new Set([
  "access",
  "application_integration_profile",
  "business_process_dependency",
  "contract_legal",
  "data"
]);

async function loadAssessment(assessmentId: string) {
  return db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      answers: true,
      evidenceItems: true,
      riskFindings: true
    }
  });
}

function valueIsMissing(value: unknown) {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length === 0 || normalized === "unknown";
  }

  return false;
}

function answerMapWithAssessment(
  assessment: Assessment,
  answers: Answer[]
): Record<string, unknown> {
  const map = buildAnswerMap(assessment, answers);

  for (const answer of answers) {
    map[answerKey(answer.section, answer.field)] = parseStoredValue(answer.value);
  }

  return map;
}

function questionIsRequiredForApproval(question: QuestionDefinition) {
  if (requiredQuestionSections.has(question.section)) {
    return true;
  }

  return false;
}

function highRiskQuestionIsUnresolved(input: {
  question: QuestionDefinition;
  riskRating: string;
  criticality: string;
}) {
  if (!highRiskQuestionSections.has(input.question.section)) {
    return false;
  }

  return (
    input.riskRating === "High" ||
    input.riskRating === "Critical" ||
    input.criticality === "High" ||
    input.criticality === "Critical"
  );
}

function evidenceBlockingItems(
  requirements: EvidenceRequirementResult[]
): ApprovalReadinessItem[] {
  return requirements
    .filter(
      (requirement) =>
        requirement.baseRequirementLevel === "required" && !requirement.complete
    )
    .map((requirement) => ({
      type:
        requirement.requirementLevel === "needs_verification"
          ? ("evidence_verification" as const)
          : ("required_evidence" as const),
      title:
        requirement.requirementLevel === "needs_verification"
          ? `${requirement.type} needs reviewer verification`
          : `${requirement.type} is required`,
      details:
        requirement.requirementLevel === "needs_verification"
          ? `${requirement.type} has matched evidence, but it is not complete until reviewer verified or otherwise allowed by the evidence rule. ${requirement.notes}`
          : `${requirement.type} is required and no complete evidence currently satisfies it. ${requirement.notes}`,
      severity: "blocking" as const,
      requirementId: requirement.id
    }));
}

function evidenceWarningItems(
  requirements: EvidenceRequirementResult[]
): ApprovalReadinessItem[] {
  return requirements
    .filter(
      (requirement) =>
        requirement.baseRequirementLevel === "recommended" && !requirement.complete
    )
    .map((requirement) => ({
      type: "recommended_evidence" as const,
      title: `${requirement.type} is recommended`,
      details: requirement.notes,
      severity: "warning" as const,
      requirementId: requirement.id
    }));
}

function questionBlockingItems(input: {
  assessment: AssessmentWithRelations;
  answers: Answer[];
  riskRating: string;
}): ApprovalReadinessItem[] {
  const visibleQuestions = getVisibleQuestions({
    assessment: input.assessment,
    answers: input.answers
  });
  const map = answerMapWithAssessment(input.assessment, input.answers);
  const criticality = getCriticality(map);
  const items: ApprovalReadinessItem[] = [];

  for (const question of visibleQuestions) {
    if (question.type === "checkbox") {
      continue;
    }

    const key = answerKey(question.section, question.field);
    const value = map[key];

    if (!valueIsMissing(value)) {
      continue;
    }

    if (questionIsRequiredForApproval(question)) {
      items.push({
        type: "required_question",
        title: `${question.label} is unanswered`,
        details: "Required integration or business dependency information is unresolved.",
        severity: "blocking",
        questionId: question.id
      });
      continue;
    }

    if (
      highRiskQuestionIsUnresolved({
        question,
        riskRating: input.riskRating,
        criticality
      })
    ) {
      items.push({
        type: "high_risk_unknown",
        title: `${question.label} is unknown`,
        details: "High-risk unknowns must be resolved or explicitly accepted as an exception.",
        severity: "blocking",
        questionId: question.id
      });
    }
  }

  return items;
}

function riskWarningItems(input: {
  riskRating: string;
  riskScore: number;
  riskFindings: RiskFinding[];
}) {
  const warnings: ApprovalReadinessItem[] = [];

  if (input.riskRating === "High" || input.riskRating === "Critical") {
    warnings.push({
      type: "risk_review",
      title: `${input.riskRating} risk requires reviewer attention`,
      details: `Risk score is ${input.riskScore}. Review key risk findings before deciding.`,
      severity: "warning"
    });
  }

  for (const finding of input.riskFindings.filter(
    (item) => item.severity === "High" || item.severity === "Critical"
  )) {
    warnings.push({
      type: "risk_review",
      title: finding.title,
      details: finding.reason,
      severity: "warning"
    });
  }

  return warnings;
}

export async function getApprovalReadiness(assessmentId: string) {
  let assessment = await loadAssessment(assessmentId);

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
    assessment = await loadAssessment(assessmentId);
  }

  if (!assessment) {
    return null;
  }

  const scoringAnswers = getScoringAnswers({
    assessment,
    answers: assessment.answers
  });
  const requiredEvidence = calculateSmartEvidenceRequirements({
    assessment,
    answers: scoringAnswers,
    evidenceItems: assessment.evidenceItems
  });
  const riskRating = assessment.riskRating ?? "Low";
  const riskScore = assessment.riskScore ?? 0;
  const blockingItems = [
    ...evidenceBlockingItems(requiredEvidence),
    ...questionBlockingItems({
      assessment,
      answers: scoringAnswers,
      riskRating
    })
  ];
  const warningItems = [
    ...evidenceWarningItems(requiredEvidence),
    ...riskWarningItems({
      riskRating,
      riskScore,
      riskFindings: assessment.riskFindings
    })
  ];
  const recommendedDecision: RecommendedDecision =
    riskRating === "Critical" && blockingItems.length > 0
      ? "reject_review_required"
      : blockingItems.length > 0
        ? "approve_with_exceptions"
        : "approve";

  return {
    canApproveCleanly: blockingItems.length === 0,
    requiresExceptionApproval: blockingItems.length > 0,
    blockingItems,
    warningItems,
    riskRating,
    riskScore,
    assessmentLevel: assessment.assessmentLevel ?? "Level 1 - Light Review",
    recommendedDecision,
    requiredEvidence
  };
}

export function hasPrivilegedAccessAnswer(answers: Answer[], assessment: Assessment) {
  const map = answerMapWithAssessment(assessment, answers);

  return [
    "access.adminAccess",
    "access.productionAccess",
    "access.cloudEnvironmentAccess",
    "access.otDigitalSystemsAccess"
  ].some((field) => isTruthy(map[field]));
}
