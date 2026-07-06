import {
  accessOptionFields,
  dataOptionFields,
  privilegedAccessFields,
  sensitiveDataFields
} from "@/config/questions";

export const noSystemAccessField = "access.noSystemAccess";
export const noCompanyDataField = "data.noCompanyData";

export const conflictingAccessFields = accessOptionFields
  .filter((field) => field !== "noSystemAccess")
  .map((field) => `access.${field}`);

export const conflictingDataFields = dataOptionFields
  .filter((field) => field !== "noCompanyData")
  .map((field) => `data.${field}`);

export const sensitiveDataAnswerFields = sensitiveDataFields.map(
  (field) => `data.${field}`
);

export const privilegedAccessAnswerFields = privilegedAccessFields.map(
  (field) => `access.${field}`
);
