import { NextResponse } from "next/server";
import { getApprovalReadiness } from "@/lib/approval/approvalReadiness";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const readiness = await getApprovalReadiness(id);

  if (!readiness) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  return NextResponse.json(readiness);
}
