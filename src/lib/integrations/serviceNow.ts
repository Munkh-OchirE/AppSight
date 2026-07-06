import { z } from "zod";
import {
  configuredPlaceholderResult,
  hasEveryConfigValue,
  mockResult
} from "@/lib/integrations/common";

export const serviceNowPushResultSchema = z
  .object({
    assessmentId: z.string().trim().min(1).max(200),
    applicationName: z.string().trim().min(1).max(200),
    vendorName: z.string().trim().min(1).max(200),
    riskRating: z.enum(["Low", "Medium", "High", "Critical"]),
    riskScore: z.number().int().min(0).max(100),
    decisionStatus: z
      .enum(["draft", "in_review", "approved", "approved_with_exceptions", "rejected"])
      .optional(),
    summary: z.string().trim().max(3000).optional()
  })
  .strict();

export type ServiceNowPushResultInput = z.infer<typeof serviceNowPushResultSchema>;

function serviceNowConfigIsPresent() {
  return hasEveryConfigValue([
    process.env.SERVICENOW_BASE_URL,
    process.env.SERVICENOW_CLIENT_ID,
    process.env.SERVICENOW_CLIENT_SECRET
  ]);
}

export async function pushServiceNowResult(_input: ServiceNowPushResultInput) {
  if (!serviceNowConfigIsPresent()) {
    return mockResult(
      "ServiceNow config is not set. Mock success returned for MVP."
    );
  }

  return configuredPlaceholderResult(
    "ServiceNow config is present. Placeholder success returned for MVP; no external request was sent."
  );
}
