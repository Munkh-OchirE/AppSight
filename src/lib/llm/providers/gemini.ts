import { GoogleGenAI } from "@google/genai";

export type GeminiHealth = {
  provider: "gemini";
  model: string;
  apiKeyConfigured: boolean;
  testCallSucceeded: boolean;
  error: string | null;
};

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash";
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server."
    );
  }

  return new GoogleGenAI({ apiKey });
}

export async function generateGeminiJson(prompt: string) {
  const client = getClient();
  const model = getGeminiModel();

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return response.text ?? "";
}

export async function checkGeminiHealth(): Promise<GeminiHealth> {
  const model = getGeminiModel();

  if (!process.env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      model,
      apiKeyConfigured: false,
      testCallSucceeded: false,
      error:
        "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server."
    };
  }

  try {
    const client = getClient();
    await client.models.generateContent({
      model,
      contents: "Return the single word ok."
    });

    return {
      provider: "gemini",
      model,
      apiKeyConfigured: true,
      testCallSucceeded: true,
      error: null
    };
  } catch {
    return {
      provider: "gemini",
      model,
      apiKeyConfigured: true,
      testCallSucceeded: false,
      error: "Gemini health check failed. Verify GEMINI_API_KEY and GEMINI_MODEL."
    };
  }
}
