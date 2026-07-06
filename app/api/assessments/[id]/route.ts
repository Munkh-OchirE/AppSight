import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  assessmentPatchSchema,
  formatZodError,
  serializeAnswerValue
} from "@/lib/validations/assessment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function stripUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      answers: { orderBy: [{ section: "asc" }, { field: "asc" }] },
      evidenceItems: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] },
      riskFindings: { orderBy: { createdAt: "desc" } },
      llmOutputs: { orderBy: { createdAt: "desc" }, take: 1 },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
      auditLogs: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const [latestSummary] = assessment.llmOutputs;

  return NextResponse.json({
    assessment: {
      ...assessment,
      llmOutputs: undefined,
      reports: undefined
    },
    answers: assessment.answers,
    evidenceItems: assessment.evidenceItems,
    riskFindings: assessment.riskFindings,
    latestSummary: latestSummary ?? null,
    latestReport: assessment.reports[0] ?? null,
    auditLogs: assessment.auditLogs
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const input = assessmentPatchSchema.parse(json);

    const updated = await db.$transaction(async (tx) => {
      const existing = await tx.assessment.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!existing) {
        return null;
      }

      if (input.assessment) {
        const assessmentData = stripUndefined(input.assessment);

        if (Object.keys(assessmentData).length > 0) {
          await tx.assessment.update({
            where: { id },
            data: assessmentData
          });
        }
      }

      if (input.answers) {
        for (const answer of input.answers) {
          await tx.answer.upsert({
            where: {
              assessmentId_section_field: {
                assessmentId: id,
                section: answer.section,
                field: answer.field
              }
            },
            create: {
              assessmentId: id,
              section: answer.section,
              field: answer.field,
              value: serializeAnswerValue(answer.value),
              state: answer.state,
              confidence: answer.confidence,
              source: answer.source,
              confirmed: answer.confirmed ?? false
            },
            update: {
              value: serializeAnswerValue(answer.value),
              state: answer.state,
              confidence: answer.confidence,
              source: answer.source,
              confirmed: answer.confirmed ?? false
            }
          });
        }
      }

      if (input.evidenceItems) {
        for (const evidenceItem of input.evidenceItems) {
          const { id: evidenceId, ...allowedFields } = evidenceItem;
          const evidenceData = stripUndefined(allowedFields);

          const result = await tx.evidenceItem.updateMany({
            where: {
              id: evidenceId,
              assessmentId: id
            },
            data: evidenceData
          });

          if (result.count !== 1) {
            throw new Error("Evidence item does not belong to this assessment.");
          }
        }
      }

      return tx.assessment.findUnique({
        where: { id },
        include: {
          answers: { orderBy: [{ section: "asc" }, { field: "asc" }] },
          evidenceItems: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] }
        }
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    return NextResponse.json({
      assessment: updated,
      answers: updated.answers,
      evidenceItems: updated.evidenceItems
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            "Patch input is invalid or includes fields that are controlled by the server.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "Evidence item does not belong to this assessment."
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to update assessment." },
      { status: 500 }
    );
  }
}
