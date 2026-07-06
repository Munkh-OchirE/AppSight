import type { Answer, Assessment, AuditLog, EvidenceItem, LlmOutput } from "@prisma/client";

export type DraftAssessment = {
  assessment: Assessment;
  answersBySection: Record<string, Answer[]>;
  evidenceItems: EvidenceItem[];
  latestAiIntake: LlmOutput | null;
  auditLogs: AuditLog[];
};

export function buildDraftAssessment(input: {
  assessment: Assessment;
  answers: Answer[];
  evidenceItems: EvidenceItem[];
  llmOutputs: LlmOutput[];
  auditLogs: AuditLog[];
}): DraftAssessment {
  const answersBySection = input.answers.reduce<Record<string, Answer[]>>(
    (grouped, answer) => {
      grouped[answer.section] ??= [];
      grouped[answer.section].push(answer);
      return grouped;
    },
    {}
  );

  return {
    assessment: input.assessment,
    answersBySection,
    evidenceItems: input.evidenceItems,
    latestAiIntake:
      input.llmOutputs.find((output) => output.type === "ai_intake") ?? null,
    auditLogs: input.auditLogs
  };
}
