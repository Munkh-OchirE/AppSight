export type IntegrationMode = "mock" | "configured_placeholder";

export type IntegrationResult = {
  ok: true;
  mode: IntegrationMode;
  message: string;
};

export function hasEveryConfigValue(values: Array<string | undefined>) {
  return values.every((value) => Boolean(value?.trim()));
}

export function mockResult(message: string): IntegrationResult {
  return {
    ok: true,
    mode: "mock",
    message
  };
}

export function configuredPlaceholderResult(message: string): IntegrationResult {
  return {
    ok: true,
    mode: "configured_placeholder",
    message
  };
}
