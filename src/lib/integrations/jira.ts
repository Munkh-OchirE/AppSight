import { z } from "zod";
import {
  configuredPlaceholderResult,
  hasEveryConfigValue,
  mockResult
} from "@/lib/integrations/common";

const jiraActionItemSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(3000),
    severity: z.enum(["Low", "Medium", "High", "Critical"]).optional()
  })
  .strict();

export const jiraCreateActionsSchema = z
  .object({
    assessmentId: z.string().trim().min(1).max(200),
    items: z.array(jiraActionItemSchema).min(1).max(50)
  })
  .strict();

export type JiraCreateActionsInput = z.infer<typeof jiraCreateActionsSchema>;

function jiraConfigIsPresent() {
  return hasEveryConfigValue([
    process.env.JIRA_BASE_URL,
    process.env.JIRA_API_TOKEN
  ]);
}

function mockIssueKeys(count: number) {
  return Array.from({ length: count }, (_, index) => `ARS-MOCK-${index + 1}`);
}

export async function createJiraActions(input: JiraCreateActionsInput) {
  if (!jiraConfigIsPresent()) {
    return {
      ...mockResult("Jira config is not set. Mock issue keys returned for MVP."),
      issueKeys: mockIssueKeys(input.items.length)
    };
  }

  return {
    ...configuredPlaceholderResult(
      "Jira config is present. Placeholder issue keys returned for MVP; no external request was sent."
    ),
    issueKeys: mockIssueKeys(input.items.length)
  };
}
