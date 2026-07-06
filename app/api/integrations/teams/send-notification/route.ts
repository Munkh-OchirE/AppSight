import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sendTeamsNotification,
  teamsNotificationSchema
} from "@/lib/integrations/teams";
import { formatZodError } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = teamsNotificationSchema.parse(json);
    const result = await sendTeamsNotification(input);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Teams notification payload is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to process Teams placeholder request." },
      { status: 500 }
    );
  }
}
