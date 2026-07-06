import { NextResponse } from "next/server";
import { z } from "zod";
import {
  pushServiceNowResult,
  serviceNowPushResultSchema
} from "@/lib/integrations/serviceNow";
import { formatZodError } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = serviceNowPushResultSchema.parse(json);
    const result = await pushServiceNowResult(input);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "ServiceNow payload is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to process ServiceNow placeholder request." },
      { status: 500 }
    );
  }
}
