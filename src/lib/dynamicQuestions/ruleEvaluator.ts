import type { Assessment, Answer } from "@prisma/client";
import type { QuestionDefinition } from "@/config/questions";
import {
  conflictingAccessFields,
  conflictingDataFields,
  noCompanyDataField,
  noSystemAccessField,
  sensitiveDataAnswerFields
} from "@/config/questionRules";

export type AnswerMap = Record<string, unknown>;

export function parseStoredValue(value: string): unknown {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function answerKey(section: string, field: string) {
  return `${section}.${field}`;
}

export function buildAnswerMap(
  assessment: Pick<
    Assessment,
    "businessOwner" | "procurementStage" | "vendorStatus" | "criticality"
  >,
  answers: Answer[]
): AnswerMap {
  const map: AnswerMap = {
    "vendor_profile.businessOwner": assessment.businessOwner ?? undefined,
    "vendor_profile.procurementStage": assessment.procurementStage ?? undefined,
    "vendor_profile.vendorStatus": assessment.vendorStatus ?? undefined,
    "business_criticality.criticality": assessment.criticality ?? undefined
  };

  for (const answer of answers) {
    map[answerKey(answer.section, answer.field)] = parseStoredValue(answer.value);
  }

  return cleanExclusiveAnswerMap(map);
}

export function isTruthy(value: unknown) {
  return value === true || value === "true" || value === "Yes";
}

export function cleanExclusiveAnswerMap(map: AnswerMap): AnswerMap {
  const cleaned = { ...map };

  if (isTruthy(cleaned[noSystemAccessField])) {
    for (const field of conflictingAccessFields) {
      cleaned[field] = false;
    }
  } else if (conflictingAccessFields.some((field) => isTruthy(cleaned[field]))) {
    cleaned[noSystemAccessField] = false;
  }

  if (isTruthy(cleaned[noCompanyDataField])) {
    for (const field of conflictingDataFields) {
      cleaned[field] = false;
    }
  } else if (conflictingDataFields.some((field) => isTruthy(cleaned[field]))) {
    cleaned[noCompanyDataField] = false;
  }

  return cleaned;
}

export function hasSensitiveData(map: AnswerMap) {
  return sensitiveDataAnswerFields.some((field) => isTruthy(map[field]));
}

export function getCriticality(map: AnswerMap) {
  const value = map["business_criticality.criticality"];
  return typeof value === "string" ? value : "Unknown";
}

export function isQuestionVisible(question: QuestionDefinition, map: AnswerMap) {
  const rule = question.visibleWhen;

  if (!rule) {
    return true;
  }

  if (rule.sensitiveData && !hasSensitiveData(map)) {
    return false;
  }

  if (rule.criticality && !rule.criticality.includes(getCriticality(map) as never)) {
    return false;
  }

  if (rule.all && !rule.all.every((field) => isTruthy(map[field]))) {
    return false;
  }

  if (rule.any && !rule.any.some((field) => isTruthy(map[field]))) {
    return false;
  }

  return true;
}
