import { z } from "zod";
import {
  configuredPlaceholderResult,
  hasEveryConfigValue,
  mockResult
} from "@/lib/integrations/common";

export const teamsNotificationSchema = z
  .object({
    assessmentId: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(3000),
    riskRating: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
    decisionStatus: z
      .enum(["draft", "in_review", "approved", "approved_with_exceptions", "rejected"])
      .optional()
  })
  .strict();

export type TeamsNotificationInput = z.infer<typeof teamsNotificationSchema>;

function teamsConfigIsPresent() {
  return hasEveryConfigValue([process.env.TEAMS_WEBHOOK_URL]);
}

export async function sendTeamsNotification(_input: TeamsNotificationInput) {
  if (!teamsConfigIsPresent()) {
    return mockResult(
      "Teams webhook is not set. Mock success returned for MVP."
    );
  }

  return configuredPlaceholderResult(
    "Teams webhook is present. Placeholder success returned for MVP; no external request was sent."
  );
}
