import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runEvidenceDiscovery } from "@/lib/discovery/discoveryService";
import { formatZodError } from "@/lib/validations/assessment";
import { calculateAndPersistRisk } from "@/lib/risk/riskScoring";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const requestSchema = z
  .object({
    vendorWebsite: z.string().trim().url().optional(),
    trustCentreUrl: z.string().trim().url().optional()
  })
  .strict();

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json().catch(() => ({}));
    const input = requestSchema.parse(json);

    const assessment = await db.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        vendorWebsite: true,
        trustCentreUrl: true
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const result = await runEvidenceDiscovery({
      assessmentId: assessment.id,
      vendorWebsite: input.vendorWebsite ?? assessment.vendorWebsite,
      trustCentreUrl: input.trustCentreUrl ?? assessment.trustCentreUrl
    });
    const risk = await calculateAndPersistRisk(id);

    return NextResponse.json({
      assessmentId: id,
      pagesFetched: result.pagesFetched,
      errors: result.errors,
      evidenceItems: result.evidenceItems,
      risk
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Evidence discovery input is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to run evidence discovery." },
      { status: 500 }
    );
  }
}
