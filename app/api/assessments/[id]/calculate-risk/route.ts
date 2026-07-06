import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateAndPersistRisk } from "@/lib/risk/riskScoring";
import { formatZodError } from "@/lib/validations/assessment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const calculateRiskSchema = z
  .object({
    force: z.boolean().optional()
  })
  .strict();

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json().catch(() => ({}));
    calculateRiskSchema.parse(json);

    const result = await calculateAndPersistRisk(id);

    if (!result) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    return NextResponse.json({
      riskScore: result.riskScore,
      riskRating: result.riskRating,
      assessmentLevel: result.assessmentLevel,
      categoryScores: result.categoryScores,
      riskFindings: result.riskFindings
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Risk calculation input is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to calculate risk." },
      { status: 500 }
    );
  }
}
