import type { Answer, Assessment, EvidenceItem } from "@prisma/client";
import {
  evidenceRules,
  type EvidenceRequirementRule
} from "@/config/evidenceRules";
import {
  buildAnswerMap,
  getCriticality,
  hasSensitiveData,
  isTruthy
} from "@/lib/dynamicQuestions/ruleEvaluator";

export type EvidenceRequirementResult = {
  id: string;
  type: string;
  acceptableTypes: string[];
  requirementLevel:
    | "required"
    | "recommended"
    | "optional"
    | "not_applicable"
    | "already_found"
    | "needs_verification"
    | "missing";
  baseRequirementLevel: EvidenceRequirementRule["requirementLevel"];
  matchedEvidenceIds: string[];
  complete: boolean;
  notes: string;
};

function isHighCriticality(value: string) {
  return value === "High" || value === "Critical";
}

function hasPrivilegedAccess(map: Record<string, unknown>) {
  return [
    "access.adminAccess",
    "access.productionAccess",
    "access.cloudEnvironmentAccess",
    "access.otDigitalSystemsAccess"
  ].some((field) => isTruthy(map[field]));
}

function applies(rule: EvidenceRequirementRule, context: {
  sensitiveData: boolean;
  apiAccess: boolean;
  highCriticality: boolean;
  privilegedAccess: boolean;
  lowNoAccessNoData: boolean;
}) {
  if (context.lowNoAccessNoData && rule.type === "Independent security assurance evidence") {
    return false;
  }

  return Object.entries(rule.appliesWhen).every(
    ([key, expected]) => context[key as keyof typeof context] === expected
  );
}

function matchesEvidence(item: EvidenceItem, type: string, acceptableTypes: string[]) {
  return item.type === type || acceptableTypes.includes(item.type);
}

function isEvidenceComplete(item: EvidenceItem, allowsPublicDocument: boolean) {
  if (item.status === "not_applicable") {
    return true;
  }

  if (item.status === "verified_by_reviewer" || item.verified) {
    return true;
  }

  if (item.status === "uploaded_by_user" && item.verified) {
    return true;
  }

  return item.status === "public_document_found" && allowsPublicDocument;
}

function hasClaimNeedingVerification(item: EvidenceItem) {
  return item.status === "publicly_claimed" && !item.verified;
}

export function calculateSmartEvidenceRequirements(input: {
  assessment: Assessment;
  answers: Answer[];
  evidenceItems: EvidenceItem[];
}): EvidenceRequirementResult[] {
  const map = buildAnswerMap(input.assessment, input.answers);
  const criticality = getCriticality(map);
  const noAccess = isTruthy(map["access.noSystemAccess"]);
  const noData = isTruthy(map["data.noCompanyData"]);
  const lowNoAccessNoData = noAccess && noData && (criticality === "Low" || criticality === "Unknown");
  const context = {
    sensitiveData: hasSensitiveData(map),
    apiAccess: isTruthy(map["access.apiAccess"]),
    highCriticality: isHighCriticality(criticality),
    privilegedAccess: hasPrivilegedAccess(map),
    lowNoAccessNoData
  };

  return evidenceRules
    .filter((rule) => applies(rule, context))
    .map((rule) => {
      const acceptableTypes = rule.acceptableTypes ?? [rule.type];
      const matchedEvidence = input.evidenceItems.filter((item) =>
        matchesEvidence(item, rule.type, acceptableTypes)
      );
      const completeEvidence = matchedEvidence.find((item) =>
        isEvidenceComplete(item, Boolean(rule.allowsPublicDocument))
      );
      const needsVerification = matchedEvidence.some(hasClaimNeedingVerification);
      const complete = Boolean(completeEvidence);

      let requirementLevel: EvidenceRequirementResult["requirementLevel"];

      if (complete) {
        requirementLevel = "already_found";
      } else if (needsVerification) {
        requirementLevel = "needs_verification";
      } else if (rule.requirementLevel === "required") {
        requirementLevel = "missing";
      } else {
        requirementLevel = rule.requirementLevel;
      }

      return {
        id: rule.id,
        type: rule.type,
        acceptableTypes,
        requirementLevel,
        baseRequirementLevel: rule.requirementLevel,
        matchedEvidenceIds: matchedEvidence.map((item) => item.id),
        complete,
        notes: rule.notes
      };
    });
}
