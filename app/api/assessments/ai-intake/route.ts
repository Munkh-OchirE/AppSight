import { NextResponse } from "next/server";
import { z } from "zod";
import { aiIntakeToAnswers } from "@/lib/assessment/aiIntake";
import { createAuditLog } from "@/lib/audit/auditLog";
import { db } from "@/lib/db";
import { generateJson, getLlmModel, getLlmProvider } from "@/lib/llm";
import { extractJsonObject } from "@/lib/llm/jsonParsing";
import { buildAiIntakePrompt } from "@/lib/llm/prompts";
import { aiIntakeOutputSchema } from "@/lib/llm/schemas";
import { formatZodError } from "@/lib/validations/assessment";

const aiIntakeRequestSchema = z
  .object({
    assessmentId: z.string().trim().min(1),
    description: z.string().trim().min(1).max(5000).optional(),
    applicationName: z.string().trim().max(200).optional(),
    vendorName: z.string().trim().max(200).optional()
  })
  .strict();

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = aiIntakeRequestSchema.parse(json);

    const assessment = await db.assessment.findUnique({
      where: { id: input.assessmentId }
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server."
        },
        { status: 400 }
      );
    }

    const prompt = buildAiIntakePrompt({
      applicationName: input.applicationName ?? assessment.applicationName,
      vendorName: input.vendorName ?? assessment.vendorName,
      description: input.description ?? assessment.description
    });

    const rawOutput = await generateJson(prompt);
    const parsedJson = extractJsonObject(rawOutput);
    const extracted = aiIntakeOutputSchema.parse(parsedJson);
    const answers = aiIntakeToAnswers(extracted);

    await db.$transaction(async (tx) => {
      for (const answer of answers) {
        await tx.answer.upsert({
          where: {
            assessmentId_section_field: {
              assessmentId: assessment.id,
              section: answer.section,
              field: answer.field
            }
          },
          create: {
            assessmentId: assessment.id,
            ...answer
          },
          update: answer
        });
      }

      await tx.llmOutput.create({
        data: {
          assessmentId: assessment.id,
          type: "ai_intake",
          provider: getLlmProvider(),
          model: getLlmModel(),
          inputJson: JSON.stringify({
            assessmentId: assessment.id,
            applicationName: assessment.applicationName,
            vendorName: assessment.vendorName,
            description: input.description ?? assessment.description
          }),
          outputJson: JSON.stringify(extracted)
        }
      });

      await createAuditLog(tx, {
        assessmentId: assessment.id,
        action: "ai_intake_generated",
        details: {
          answerCount: answers.length
        }
      });
    });

    return NextResponse.json({
      assessmentId: assessment.id,
      extracted,
      answersStored: answers.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "AI intake input or output is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON for AI intake." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Unable to generate AI intake draft." },
      { status: 500 }
    );
  }
}
