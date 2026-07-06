import { NextResponse } from "next/server";
import type { EvidenceItem } from "@prisma/client";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit/auditLog";
import { db } from "@/lib/db";
import {
  createSummaryCheckpointRecorder,
  type SummaryCheckpoint
} from "@/lib/llm/checkpoints";
import { generateJson, getLlmModel, getLlmProvider } from "@/lib/llm";
import { extractJsonObject } from "@/lib/llm/jsonParsing";
import { checkGeminiHealth } from "@/lib/llm/providers/gemini";
import {
  buildSummaryPrompt,
  type SummaryPromptEvidenceItem
} from "@/lib/llm/prompts";
import { summaryOutputSchema } from "@/lib/llm/schemas";
import { getReportData } from "@/lib/report/reportBuilder";
import { calculateAndPersistRisk } from "@/lib/risk/riskScoring";
import { formatZodError } from "@/lib/validations/assessment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const generateSummarySchema = z
  .object({
    regenerate: z.boolean().optional()
  })
  .strict();

async function loadAssessment(assessmentId: string) {
  return db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      answers: true,
      evidenceItems: true,
      riskFindings: true
    }
  });
}

function checkpointResponse(
  error: string,
  checkpoints: SummaryCheckpoint[],
  status: number
) {
  return NextResponse.json({ error, checkpoints }, { status });
}

function evidenceForPrompt(evidenceItems: EvidenceItem[]): SummaryPromptEvidenceItem[] {
  return evidenceItems.map((item) => ({
    type: item.type,
    status: item.status,
    verified: item.verified,
    confidence: item.confidence,
    issuer: item.issuer,
    issueDate: item.issueDate,
    expiryDate: item.expiryDate,
    scope: item.scope,
    notes: item.notes,
    recommendedAction: item.recommendedAction
  }));
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const checkpoints = createSummaryCheckpointRecorder();

  try {
    const json = await request.json().catch(() => ({}));
    generateSummarySchema.parse(json);

    let assessment = await loadAssessment(id);

    if (!assessment) {
      checkpoints.failed("assessment_loaded", "Assessment was not found.");
      checkpoints.skipPending("Summary generation stopped because the assessment was not found.");
      return checkpointResponse("Assessment not found.", checkpoints.list(), 404);
    }

    checkpoints.success("assessment_loaded", "Assessment loaded.", {
      assessmentId: assessment.id
    });
    checkpoints.success("answers_loaded", "Answers loaded.", {
      count: assessment.answers.length
    });
    checkpoints.success("evidence_loaded", "Evidence items loaded.", {
      count: assessment.evidenceItems.length
    });

    const riskMissing =
      assessment.riskScore === null ||
      assessment.riskRating === null ||
      assessment.assessmentLevel === null ||
      assessment.riskFindings.length === 0;

    if (riskMissing) {
      await calculateAndPersistRisk(id);
      checkpoints.success("risk_loaded_or_recalculated", "Risk was recalculated.", {
        recalculated: true
      });
      assessment = await loadAssessment(id);
    } else {
      checkpoints.success("risk_loaded_or_recalculated", "Stored risk was loaded.", {
        recalculated: false
      });
    }

    if (!assessment) {
      checkpoints.failed(
        "assessment_loaded",
        "Assessment was not found after risk calculation."
      );
      checkpoints.skipPending("Summary generation stopped because the assessment was not found.");
      return checkpointResponse("Assessment not found.", checkpoints.list(), 404);
    }

    const report = await getReportData(id);

    if (!report) {
      checkpoints.failed("required_evidence_calculated", "Report data could not be built.");
      checkpoints.skipPending("Summary generation stopped because report data was unavailable.");
      return checkpointResponse("Assessment not found.", checkpoints.list(), 404);
    }

    checkpoints.success("required_evidence_calculated", "Required evidence calculated.", {
      required: report.evidence.required.length,
      missing: report.evidence.missing.length,
      needsVerification: report.evidence.needsVerification.length
    });

    const provider = getLlmProvider();
    checkpoints.success("llm_provider_selected", "LLM provider selected.", {
      provider,
      model: getLlmModel()
    });

    if (provider !== "gemini") {
      checkpoints.skipped(
        "api_key_configured",
        "Gemini API key was not checked because the configured provider is unsupported."
      );
      checkpoints.failed("gemini_health_check_passed", "Unsupported LLM provider.", {
        provider
      });
      checkpoints.skipPending("Summary generation stopped because the LLM provider is unsupported.");
      return checkpointResponse(
        "Unsupported LLM provider. Set LLM_PROVIDER to gemini.",
        checkpoints.list(),
        400
      );
    }

    const health = await checkGeminiHealth();

    if (!health.apiKeyConfigured) {
      checkpoints.failed("api_key_configured", "Gemini API key is not configured.", {
        provider: health.provider,
        model: health.model
      });
      checkpoints.skipped(
        "gemini_health_check_passed",
        "Gemini health check skipped because the API key is missing."
      );
      checkpoints.skipPending("Summary generation stopped because the API key is missing.");
      return checkpointResponse(
        "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server.",
        checkpoints.list(),
        400
      );
    }

    checkpoints.success("api_key_configured", "Gemini API key is configured.", {
      provider: health.provider,
      model: health.model
    });

    if (!health.testCallSucceeded) {
      checkpoints.failed("gemini_health_check_passed", "Gemini health check failed.", {
        provider: health.provider,
        model: health.model
      });
      checkpoints.skipPending("Summary generation stopped because Gemini health check failed.");
      return checkpointResponse(
        health.error ?? "Gemini health check failed.",
        checkpoints.list(),
        502
      );
    }

    checkpoints.success("gemini_health_check_passed", "Gemini health check passed.", {
      provider: health.provider,
      model: health.model
    });

    const prompt = buildSummaryPrompt({
      report,
      evidenceItems: evidenceForPrompt(assessment.evidenceItems)
    });
    checkpoints.success("summary_prompt_built", "Summary prompt built.", {
      promptCharacters: prompt.length
    });

    let rawOutput: string;

    try {
      rawOutput = await generateJson(prompt);
      checkpoints.success("gemini_response_received", "Gemini response received.", {
        responseCharacters: rawOutput.length
      });
    } catch {
      checkpoints.failed("gemini_response_received", "Gemini summary call failed.");
      checkpoints.skipPending("Summary generation stopped because Gemini did not return a response.");
      return checkpointResponse(
        "Unable to generate summary with Gemini.",
        checkpoints.list(),
        502
      );
    }

    let parsedJson: unknown;

    try {
      parsedJson = extractJsonObject(rawOutput);
      checkpoints.success("json_extracted", "JSON object extracted from response.");
      checkpoints.success("json_parsed", "JSON parsed successfully.");
    } catch {
      checkpoints.failed("json_extracted", "No valid JSON object was found in the response.");
      checkpoints.failed("json_parsed", "JSON parsing failed.");
      checkpoints.skipPending("Summary generation stopped because Gemini returned invalid JSON.");
      return checkpointResponse(
        "Gemini returned invalid JSON for the summary.",
        checkpoints.list(),
        502
      );
    }

    const summary = summaryOutputSchema.parse(parsedJson);
    checkpoints.success("zod_validation_passed", "Summary output passed validation.");

    const created = await db.$transaction(async (tx) => {
      const saved = await tx.llmOutput.create({
        data: {
          assessmentId: id,
          type: "summary",
          provider,
          model: health.model,
          inputJson: JSON.stringify({
            assessmentId: id,
            riskScore: report.assessment.riskScore,
            riskRating: report.assessment.riskRating,
            assessmentLevel: report.assessment.assessmentLevel,
            riskFindingCount: report.riskFindings.length,
            evidenceItemCount: assessment.evidenceItems.length
          }),
          outputJson: JSON.stringify(summary),
          checkpointsJson: JSON.stringify(checkpoints.list())
        }
      });

      await createAuditLog(tx, {
        assessmentId: id,
        action: "llm_summary_generated",
        details: {
          provider,
          model: health.model,
          riskScore: report.assessment.riskScore,
          riskRating: report.assessment.riskRating
        }
      });

      return saved;
    });

    checkpoints.success("summary_saved", "Summary saved.", {
      llmOutputId: created.id
    });
    checkpoints.success("summary_rendered", "Summary prepared for rendering.");

    await db.llmOutput.update({
      where: { id: created.id },
      data: {
        checkpointsJson: JSON.stringify(checkpoints.list())
      }
    });

    return NextResponse.json({
      summary,
      checkpoints: checkpoints.list()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      checkpoints.failed("zod_validation_passed", "Input or summary validation failed.", {
        issueCount: error.issues.length
      });
      checkpoints.skipPending("Summary generation stopped because validation failed.");
      return NextResponse.json(
        {
          error: "Summary input or output is invalid.",
          issues: formatZodError(error),
          checkpoints: checkpoints.list()
        },
        { status: 400 }
      );
    }

    checkpoints.skipPending("Summary generation stopped because of an unexpected server error.");
    return checkpointResponse("Unable to generate summary.", checkpoints.list(), 500);
  }
}
