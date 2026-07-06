import { NextResponse } from "next/server";
import { getReportData } from "@/lib/report/reportBuilder";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = await getReportData(id);

  if (!report) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  return NextResponse.json({ report });
}
