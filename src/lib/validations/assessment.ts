import { z } from "zod";

const optionalText = (max = 500) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().max(max).optional()
  );

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().url().max(2048).optional()
);

export const assessmentCreateSchema = z
  .object({
    applicationName: z.string().trim().min(1).max(200),
    vendorName: z.string().trim().min(1).max(200),
    applicationUrl: optionalUrl,
    vendorWebsite: optionalUrl,
    trustCentreUrl: optionalUrl,
    description: z.string().trim().min(1).max(5000),
    businessOwner: optionalText(200),
    procurementStage: optionalText(100),
    vendorStatus: optionalText(100),
    criticality: optionalText(100)
  })
  .strict();

const assessmentPatchFieldsSchema = z
  .object({
    applicationName: optionalText(200),
    vendorName: optionalText(200),
    applicationUrl: optionalUrl,
    vendorWebsite: optionalUrl,
    trustCentreUrl: optionalUrl,
    description: optionalText(5000),
    businessOwner: optionalText(200),
    procurementStage: optionalText(100),
    vendorStatus: optionalText(100),
    criticality: optionalText(100)
  })
  .strict();

const answerPatchSchema = z
  .object({
    section: z.string().trim().min(1).max(100),
    field: z.string().trim().min(1).max(100),
    value: z.unknown(),
    state: z.string().trim().min(1).max(100),
    confidence: optionalText(50),
    source: optionalText(500),
    confirmed: z.boolean().optional()
  })
  .strict();

const evidencePatchSchema = z
  .object({
    id: z.string().trim().min(1),
    status: optionalText(100),
    notes: optionalText(2000),
    verified: z.boolean().optional(),
    issueDate: optionalText(100),
    expiryDate: optionalText(100),
    scope: optionalText(1000),
    issuer: optionalText(200),
    uploadedFileName: optionalText(255),
    recommendedAction: optionalText(2000)
  })
  .strict();

export const assessmentPatchSchema = z
  .object({
    assessment: assessmentPatchFieldsSchema.optional(),
    answers: z.array(answerPatchSchema).optional(),
    evidenceItems: z.array(evidencePatchSchema).optional()
  })
  .strict();

export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;
export type AssessmentPatchInput = z.infer<typeof assessmentPatchSchema>;

export function serializeAnswerValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
