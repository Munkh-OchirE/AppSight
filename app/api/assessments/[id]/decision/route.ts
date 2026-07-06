import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyDecision,
  decisionRequestSchema,
  DecisionValidationError
} from "@/lib/approval/decisionService";
import { formatZodError } from "@/lib/validations/assessment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const input = decisionRequestSchema.parse(json);
    const result = await applyDecision({
      assessmentId: id,
      request: input
    });

    if (!result) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    return NextResponse.json({
      assessment: {
        id: result.assessment.id,
        status: result.assessment.status,
        decisionStatus: result.assessment.decisionStatus,
        decisionBy: result.assessment.decisionBy,
        decisionAt: result.assessment.decisionAt,
        approvedWithExceptions: result.assessment.approvedWithExceptions,
        rejectionReason: result.assessment.rejectionReason,
        remediationActions: result.assessment.remediationActions,
        rejectionDueDate: result.assessment.rejectionDueDate,
        rejectionOwner: result.assessment.rejectionOwner
      },
      readiness: result.readiness
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Decision input is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    if (error instanceof DecisionValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          readiness: error.readiness
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to apply assessment decision." },
      { status: 500 }
    );
  }
}
