export const summaryCheckpointNames = [
  "assessment_loaded",
  "answers_loaded",
  "evidence_loaded",
  "risk_loaded_or_recalculated",
  "required_evidence_calculated",
  "llm_provider_selected",
  "api_key_configured",
  "gemini_health_check_passed",
  "summary_prompt_built",
  "gemini_response_received",
  "json_extracted",
  "json_parsed",
  "zod_validation_passed",
  "summary_saved",
  "summary_rendered"
] as const;

export type SummaryCheckpointName = (typeof summaryCheckpointNames)[number];
export type CheckpointStatus = "pending" | "success" | "failed" | "skipped";

export type SafeCheckpointDetails = Record<
  string,
  string | number | boolean | null
>;

export type SummaryCheckpoint = {
  name: SummaryCheckpointName;
  status: CheckpointStatus;
  message: string;
  timestamp: string;
  details?: SafeCheckpointDetails;
};

function now() {
  return new Date().toISOString();
}

function sanitizeDetails(details?: SafeCheckpointDetails) {
  if (!details) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      typeof value === "string" ? value.slice(0, 300) : value
    ])
  ) as SafeCheckpointDetails;
}

export function createSummaryCheckpointRecorder() {
  const checkpoints = summaryCheckpointNames.map<SummaryCheckpoint>((name) => ({
    name,
    status: "pending",
    message: "Not reached yet.",
    timestamp: now()
  }));

  function set(
    name: SummaryCheckpointName,
    status: CheckpointStatus,
    message: string,
    details?: SafeCheckpointDetails
  ) {
    const checkpoint = checkpoints.find((item) => item.name === name);

    if (!checkpoint) {
      return;
    }

    checkpoint.status = status;
    checkpoint.message = message;
    checkpoint.timestamp = now();
    checkpoint.details = sanitizeDetails(details);
  }

  return {
    success(
      name: SummaryCheckpointName,
      message: string,
      details?: SafeCheckpointDetails
    ) {
      set(name, "success", message, details);
    },
    failed(
      name: SummaryCheckpointName,
      message: string,
      details?: SafeCheckpointDetails
    ) {
      set(name, "failed", message, details);
    },
    skipped(
      name: SummaryCheckpointName,
      message: string,
      details?: SafeCheckpointDetails
    ) {
      set(name, "skipped", message, details);
    },
    skipPending(message: string) {
      for (const checkpoint of checkpoints) {
        if (checkpoint.status === "pending") {
          checkpoint.status = "skipped";
          checkpoint.message = message;
          checkpoint.timestamp = now();
        }
      }
    },
    list() {
      return checkpoints.map((checkpoint) => ({ ...checkpoint }));
    }
  };
}
