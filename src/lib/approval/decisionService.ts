import { z } from "zod";
import { createAuditLog } from "@/lib/audit/auditLog";
import { db } from "@/lib/db";
import {
  getApprovalReadiness,
  type ApprovalReadinessResult
} from "@/lib/approval/approvalReadiness";

export const decisionRequestSchema = z.discriminatedUnion("decision", [
  z
    .object({
      decision: z.literal("approve"),
      justification: z.string().trim().min(1).max(3000),
      acknowledgedExceptions: z.boolean().optional().default(false)
    })
    .strict(),
  z
    .object({
      decision: z.literal("reject"),
      rejectionReason: z.string().trim().min(1).max(3000),
      remediationActions: z.string().trim().max(3000).optional(),
      rejectionDueDate: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
        .optional(),
      rejectionOwner: z.string().trim().max(200).optional()
    })
    .strict()
]);

export type DecisionRequest = z.infer<typeof decisionRequestSchema>;

export class DecisionValidationError extends Error {
  constructor(
    message: string,
    readonly readiness: ApprovalReadinessResult
  ) {
    super(message);
  }
}

function dateFromInput(value?: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export async function applyDecision(input: {
  assessmentId: string;
  request: DecisionRequest;
}) {
  const readiness = await getApprovalReadiness(input.assessmentId);
  const request = input.request;

  if (!readiness) {
    return null;
  }

  const now = new Date();
  const actor = "local-demo-user";

  if (request.decision === "reject") {
    const assessment = await db.$transaction(async (tx) => {
      const updated = await tx.assessment.update({
        where: { id: input.assessmentId },
        data: {
          status: "rejected",
          decisionStatus: "rejected",
          decisionBy: actor,
          decisionAt: now,
          decisionJustification: null,
          rejectionReason: request.rejectionReason,
          remediationActions: request.remediationActions,
          rejectionDueDate: dateFromInput(request.rejectionDueDate),
          rejectionOwner: request.rejectionOwner,
          approvedWithExceptions: false
        }
      });

      await createAuditLog(tx, {
        assessmentId: input.assessmentId,
        action: "assessment_rejected",
        actor,
        details: {
          riskScore: readiness.riskScore,
          riskRating: readiness.riskRating,
          blockingItemCount: readiness.blockingItems.length,
          remediationDueDate: request.rejectionDueDate ?? null,
          remediationOwner: request.rejectionOwner ?? null
        }
      });

      return updated;
    });

    return { assessment, readiness };
  }

  if (
    readiness.requiresExceptionApproval &&
    !request.acknowledgedExceptions
  ) {
    throw new DecisionValidationError(
      "This assessment has incomplete mandatory items. Acknowledgement is required to approve with exceptions.",
      readiness
    );
  }

  const status = readiness.requiresExceptionApproval
    ? "approved_with_exceptions"
    : "approved";
  const action = readiness.requiresExceptionApproval
    ? "assessment_approved_with_exceptions"
    : "assessment_approved";

  const assessment = await db.$transaction(async (tx) => {
    const updated = await tx.assessment.update({
      where: { id: input.assessmentId },
      data: {
        status,
        decisionStatus: status,
        decisionBy: actor,
        decisionAt: now,
        decisionJustification: request.justification,
        rejectionReason: null,
        remediationActions: null,
        rejectionDueDate: null,
        rejectionOwner: null,
        approvedWithExceptions: readiness.requiresExceptionApproval
      }
    });

    await createAuditLog(tx, {
      assessmentId: input.assessmentId,
      action,
      actor,
      details: {
        riskScore: readiness.riskScore,
        riskRating: readiness.riskRating,
        blockingItemCount: readiness.blockingItems.length,
        warningItemCount: readiness.warningItems.length
      }
    });

    return updated;
  });

  return { assessment, readiness };
}
