import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getReportData } from "@/lib/report/reportBuilder";
import {
  buildMarkdownReport,
  safeMarkdownFilename
} from "@/lib/report/markdownReport";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = await getReportData(id);

  if (!report) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const markdown = buildMarkdownReport(report);

  await db.report.create({
    data: {
      assessmentId: id,
      format: "markdown",
      content: markdown
    }
  });

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeMarkdownFilename(report)}"`
    }
  });
}
