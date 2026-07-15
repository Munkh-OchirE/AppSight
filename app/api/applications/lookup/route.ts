import { NextResponse } from "next/server";
import { z } from "zod";
import {
  lookupApplicationDetails,
  searchApplications
} from "@/lib/discovery/applicationLookup";

const lookupSchema = z
  .object({
    applicationName: z.string().trim().min(2).max(200),
    selectedUrl: z.string().trim().url().max(2048).optional()
  })
  .strict();

export async function POST(request: Request) {
  try {
    const input = lookupSchema.parse(await request.json());

    if (input.selectedUrl) {
      const details = await lookupApplicationDetails({
        applicationName: input.applicationName,
        selectedUrl: input.selectedUrl
      });

      return NextResponse.json({ details });
    }

    const results = await searchApplications(input.applicationName);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Application lookup input is invalid." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to look up application details online." },
      { status: 502 }
    );
  }
}
