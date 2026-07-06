import type { Prisma, PrismaClient } from "@prisma/client";

type AuditClient = PrismaClient | Prisma.TransactionClient;

export type AuditAction =
  | "assessment_created"
  | "ai_intake_generated"
  | "evidence_discovery_run"
  | "risk_score_calculated"
  | "llm_summary_generated"
  | "assessment_approved"
  | "assessment_approved_with_exceptions"
  | "assessment_rejected";

type AuditDetails = Record<string, string | number | boolean | null | undefined>;

export async function createAuditLog(
  client: AuditClient,
  input: {
    assessmentId: string;
    action: AuditAction;
    actor?: string;
    details?: AuditDetails;
  }
) {
  return client.auditLog.create({
    data: {
      assessmentId: input.assessmentId,
      action: input.action,
      actor: input.actor ?? "local-demo-user",
      detailsJson: JSON.stringify(input.details ?? {})
    }
  });
}
