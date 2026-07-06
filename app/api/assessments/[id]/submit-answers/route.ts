import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  cleanSubmittedAnswers,
  getVisibleQuestions,
  type SubmittedAnswer
} from "@/lib/dynamicQuestions/questionEngine";
import { calculateSmartEvidenceRequirements } from "@/lib/evidence/smartEvidenceRequest";
import { formatZodError, serializeAnswerValue } from "@/lib/validations/assessment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const submittedAnswerSchema = z
  .object({
    section: z.string().trim().min(1).max(100),
    field: z.string().trim().min(1).max(100),
    value: z.custom<unknown>((value) => value !== undefined, {
      message: "Required"
    }),
    state: z.string().trim().min(1).max(100).optional(),
    confidence: z.string().trim().max(50).optional(),
    source: z.string().trim().max(500).optional(),
    confirmed: z.boolean().optional()
  })
  .strict();

const submitAnswersSchema = z
  .object({
    answers: z.array(submittedAnswerSchema).min(1)
  })
  .strict();

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const input = submitAnswersSchema.parse(json);

    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        answers: true,
        evidenceItems: true
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const submittedAnswers: SubmittedAnswer[] = input.answers.map((answer) => ({
      section: answer.section,
      field: answer.field,
      value: answer.value,
      state: answer.state,
      confidence: answer.confidence,
      source: answer.source,
      confirmed: answer.confirmed
    }));
    const cleanedAnswers = cleanSubmittedAnswers(submittedAnswers);

    const updatedAssessment = await db.$transaction(async (tx) => {
      for (const answer of cleanedAnswers) {
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
            state: answer.state ?? "user_confirmed",
            confidence: answer.confidence,
            source: answer.source ?? "dynamic_wizard",
            confirmed: answer.confirmed ?? true
          },
          update: {
            value: serializeAnswerValue(answer.value),
            state: answer.state ?? "user_confirmed",
            confidence: answer.confidence,
            source: answer.source ?? "dynamic_wizard",
            confirmed: answer.confirmed ?? true
          }
        });
      }

      if (assessment.status === "draft" && cleanedAnswers.length >= 3) {
        await tx.assessment.update({
          where: { id },
          data: { status: "in_review" }
        });
      }

      return tx.assessment.findUnique({
        where: { id },
        include: {
          answers: true,
          evidenceItems: true
        }
      });
    });

    if (!updatedAssessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const visibleQuestions = getVisibleQuestions({
      assessment: updatedAssessment,
      answers: updatedAssessment.answers
    });
    const requiredEvidencePreview = calculateSmartEvidenceRequirements({
      assessment: updatedAssessment,
      answers: updatedAssessment.answers,
      evidenceItems: updatedAssessment.evidenceItems
    });

    return NextResponse.json({
      answers: updatedAssessment.answers,
      visibleQuestions,
      requiredEvidencePreview
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Submitted answers are invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to submit questionnaire answers." },
      { status: 500 }
    );
  }
}
