import { NextResponse } from "next/server";
import { checkGeminiHealth } from "@/lib/llm/providers/gemini";

export async function GET() {
  const provider = process.env.LLM_PROVIDER || "gemini";

  if (provider !== "gemini") {
    return NextResponse.json({
      provider,
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      apiKeyConfigured: false,
      testCallSucceeded: false,
      error: "Unsupported LLM provider. Set LLM_PROVIDER to gemini."
    });
  }

  const health = await checkGeminiHealth();
  return NextResponse.json(health);
}
