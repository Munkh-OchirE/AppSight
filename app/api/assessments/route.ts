import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit/auditLog";
import { db } from "@/lib/db";
import {
  assessmentCreateSchema,
  formatZodError
} from "@/lib/validations/assessment";

export async function GET() {
  const assessments = await db.assessment.findMany({
    orderBy: { updatedAt: "desc" }
  });

  const summary = {
    total: assessments.length,
    draft: assessments.filter((assessment) => assessment.status === "draft").length,
    inReview: assessments.filter((assessment) => assessment.status === "in_review").length,
    approved: assessments.filter((assessment) => assessment.status === "approved").length,
    approvedWithExceptions: assessments.filter(
      (assessment) => assessment.status === "approved_with_exceptions"
    ).length,
    rejected: assessments.filter((assessment) => assessment.status === "rejected").length,
    highRisk: assessments.filter((assessment) => assessment.riskRating === "High").length,
    criticalRisk: assessments.filter((assessment) => assessment.riskRating === "Critical").length
  };

  return NextResponse.json({ assessments, summary });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = assessmentCreateSchema.parse(json);

    const assessment = await db.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: input
      });

      await createAuditLog(tx, {
        assessmentId: created.id,
        action: "assessment_created",
        details: {
          applicationName: created.applicationName,
          vendorName: created.vendorName
        }
      });

      return created;
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Assessment input is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create assessment." },
      { status: 500 }
    );
  }
}
