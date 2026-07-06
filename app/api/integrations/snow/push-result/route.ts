import { NextResponse } from "next/server";
import { z } from "zod";
import { pushSnowResult, snowPushResultSchema } from "@/lib/integrations/snow";
import { formatZodError } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = snowPushResultSchema.parse(json);
    const result = await pushSnowResult(input);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "SNOW payload is invalid.",
          issues: formatZodError(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to process SNOW placeholder request." },
      { status: 500 }
    );
  }
}
