import type { AiIntakeOutput } from "@/lib/llm/schemas";
import {
  normalizeAssuranceClaimValue,
  securityAssuranceSection
} from "@/lib/assessment/assuranceClaims";

const sectionMap: Array<[keyof AiIntakeOutput, string]> = [
  ["vendorProfile", "vendor_profile"],
  ["access", "access"],
  ["data", "data"],
  ["securityEvidence", securityAssuranceSection],
  ["contractLegal", "contract_legal"],
  ["integrationProfile", "integration_profile"],
  ["businessCriticality", "business_criticality"]
];

export function aiIntakeToAnswers(output: AiIntakeOutput) {
  const answers: Array<{
    section: string;
    field: string;
    value: string;
    state: string;
    confidence: string;
    source: string;
    confirmed: boolean;
  }> = [];

  for (const [outputSection, answerSection] of sectionMap) {
    const fields = output[outputSection];

    if (!fields || Array.isArray(fields)) {
      continue;
    }

    for (const [field, fieldValue] of Object.entries(fields)) {
      const value = normalizeAssuranceClaimValue({
        section: answerSection,
        field,
        value: fieldValue.value,
        state: fieldValue.state
      });

      answers.push({
        section: answerSection,
        field,
        value,
        state: fieldValue.state,
        confidence: fieldValue.confidence,
        source: "ai_intake",
        confirmed: false
      });
    }
  }

  output.followUpQuestions.forEach((question, index) => {
    answers.push({
      section: "follow_up",
      field: `question_${index + 1}`,
      value: question,
      state: "ai_detected",
      confidence: "medium",
      source: "ai_intake",
      confirmed: false
    });
  });

  return answers;
}
