import {
  pushServiceNowResult,
  serviceNowPushResultSchema,
  type ServiceNowPushResultInput
} from "@/lib/integrations/serviceNow";

export const snowPushResultSchema = serviceNowPushResultSchema;

export type SnowPushResultInput = ServiceNowPushResultInput;

export async function pushSnowResult(input: SnowPushResultInput) {
  return pushServiceNowResult(input);
}
