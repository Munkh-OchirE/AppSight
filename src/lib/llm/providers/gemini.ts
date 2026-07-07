import { GoogleGenAI } from "@google/genai";

export type GeminiHealth = {
  provider: "gemini";
  model: string;
  fallbackModel?: string;
  successfulModel?: string;
  apiKeyConfigured: boolean;
  testCallSucceeded: boolean;
  error: string | null;
};

type GeminiClient = ReturnType<typeof getClient>;

const HEALTH_PROMPT = 'Return exactly this JSON object: {"ok":true}';

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

export function getGeminiFallbackModel() {
  return process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.5-flash";
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server."
    );
  }

  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;

    if (cause instanceof Error) {
      return `${error.message}: ${cause.message}`;
    }

    return error.message;
  }

  return String(error);
}

function isTransientGeminiError(error: unknown) {
  const message = safeErrorMessage(error).toLowerCase();

  return (
    message.includes("fetch failed") ||
    message.includes("429") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("eai_again")
  );
}

function getCandidateModels() {
  const primary = getGeminiModel();
  const fallback = getGeminiFallbackModel();

  if (!fallback || fallback === primary) {
    return [primary];
  }

  return [primary, fallback];
}

async function callGeminiJson(client: GeminiClient, model: string, prompt: string) {
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text ?? "";

  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

async function generateGeminiJsonWithModel(prompt: string) {
  const client = getClient();
  const models = getCandidateModels();

  let lastError: unknown;

  for (const [modelIndex, model] of models.entries()) {
    const isFallback = modelIndex > 0;
    const attempts = isFallback ? 1 : 3;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const text = await callGeminiJson(client, model, prompt);

        if (isFallback) {
          console.warn("Gemini fallback model succeeded:", {
            model,
            promptCharacters: prompt.length
          });
        }

        return { text, model };
      } catch (error) {
        lastError = error;

        const transient = isTransientGeminiError(error);

        console.error("Gemini JSON generation failed:", {
          model,
          promptCharacters: prompt.length,
          attempt,
          attempts,
          transient,
          error: safeErrorMessage(error)
        });

        if (!transient) {
          throw error;
        }

        if (attempt < attempts) {
          await sleep(1000 * 2 ** (attempt - 1));
        }
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini JSON generation failed.");
}

export async function generateGeminiJson(prompt: string) {
  const result = await generateGeminiJsonWithModel(prompt);
  return result.text;
}

export async function checkGeminiHealth(): Promise<GeminiHealth> {
  const model = getGeminiModel();
  const fallbackModel = getGeminiFallbackModel();

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return {
      provider: "gemini",
      model,
      fallbackModel,
      apiKeyConfigured: false,
      testCallSucceeded: false,
      error:
        "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server."
    };
  }

  try {
    const result = await generateGeminiJsonWithModel(HEALTH_PROMPT);

    JSON.parse(result.text);

    return {
      provider: "gemini",
      model,
      fallbackModel,
      successfulModel: result.model,
      apiKeyConfigured: true,
      testCallSucceeded: true,
      error: null
    };
  } catch (error) {
    console.error("Gemini health check failed:", {
      model,
      fallbackModel,
      error: safeErrorMessage(error)
    });

    return {
      provider: "gemini",
      model,
      fallbackModel,
      apiKeyConfigured: true,
      testCallSucceeded: false,
      error: safeErrorMessage(error)
    };
  }
}