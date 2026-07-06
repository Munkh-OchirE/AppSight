import { generateGeminiJson, getGeminiModel } from "@/lib/llm/providers/gemini";

export function getLlmProvider() {
  return process.env.LLM_PROVIDER || "gemini";
}

export async function generateJson(prompt: string) {
  const provider = getLlmProvider();

  if (provider !== "gemini") {
    throw new Error("Unsupported LLM provider. Set LLM_PROVIDER to gemini.");
  }

  return generateGeminiJson(prompt);
}

export function getLlmModel() {
  return getGeminiModel();
}
