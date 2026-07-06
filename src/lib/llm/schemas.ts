import { z } from "zod";

export const fieldStateSchema = z.enum([
  "user_confirmed",
  "ai_detected",
  "ai_inferred",
  "vendor_claimed",
  "publicly_found",
  "uploaded_by_user",
  "verified_by_reviewer",
  "unknown",
  "not_applicable"
]);

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const intakeFieldSchema = z
  .object({
    value: z.unknown(),
    state: fieldStateSchema,
    confidence: confidenceSchema
  })
  .strict();

export const aiIntakeOutputSchema = z
  .object({
    vendorProfile: z.record(intakeFieldSchema).optional().default({}),
    access: z.record(intakeFieldSchema).optional().default({}),
    data: z.record(intakeFieldSchema).optional().default({}),
    securityEvidence: z.record(intakeFieldSchema).optional().default({}),
    contractLegal: z.record(intakeFieldSchema).optional().default({}),
    integrationProfile: z.record(intakeFieldSchema).optional().default({}),
    businessCriticality: z.record(intakeFieldSchema).optional().default({}),
    followUpQuestions: z.array(z.string().trim().min(1)).optional().default([])
  })
  .passthrough();

export type AiIntakeOutput = z.infer<typeof aiIntakeOutputSchema>;
export type IntakeFieldState = z.infer<typeof fieldStateSchema>;

const summaryListSchema = z.array(z.string().trim().min(1).max(500)).default([]);

export const summaryOutputSchema = z
  .object({
    executiveSummary: z.string().trim().min(1).max(3000),
    keyRiskDrivers: summaryListSchema,
    evidenceSummary: z.string().trim().min(1).max(3000),
    missingEvidence: summaryListSchema,
    requiredControls: summaryListSchema,
    vendorFollowUpQuestions: summaryListSchema,
    approvalRecommendationWording: z.string().trim().min(1).max(2000),
    riskAcceptanceWording: z.string().trim().max(2000).default("")
  })
  .strict();

export type SummaryOutput = z.infer<typeof summaryOutputSchema>;
