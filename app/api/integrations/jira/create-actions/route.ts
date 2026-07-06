import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createJiraActions,
  jiraCreateActionsSchema
} from "@/lib/integrations/jira";
import { formatZodError } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = jiraCreateActionsSchema.parse(json);
    const result = await createJiraActions(input);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Jira action payload is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to process Jira placeholder request." },
      { status: 500 }
    );
  }
}
