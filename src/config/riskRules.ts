export type RiskCategory =
  | "Access Risk"
  | "Data Risk"
  | "Integration Risk"
  | "Business Criticality Risk"
  | "Evidence Gap Risk"
  | "Contract/Legal Gap Risk";

export type RiskRating = "Low" | "Medium" | "High" | "Critical";

export type FieldRiskRule = {
  field: string;
  label: string;
  points: number;
};

export type IntegrationRiskRule = {
  id: string;
  label: string;
  points: number;
  anyFields: string[];
};

export type EvidenceGapRiskRule = {
  requirementId: string;
  title: string;
  points: number;
  recommendation: string;
};

export type ContractLegalRiskRule = {
  id: string;
  field: string;
  label: string;
  pointsByValue: Record<string, number>;
  condition?: "sensitiveData" | "privilegedAccess";
  recommendation: string;
};

export const categoryCaps: Record<RiskCategory, number> = {
  "Access Risk": 45,
  "Data Risk": 35,
  "Integration Risk": 30,
  "Business Criticality Risk": 30,
  "Evidence Gap Risk": 50,
  "Contract/Legal Gap Risk": 40
};

export const maxRiskScore = 100;

export const riskBands: Array<{
  rating: RiskRating;
  min: number;
  max?: number;
}> = [
  { rating: "Low", min: 0, max: 25 },
  { rating: "Medium", min: 26, max: 50 },
  { rating: "High", min: 51, max: 75 },
  { rating: "Critical", min: 76 }
];

export const assessmentLevelsByRating: Record<RiskRating, string> = {
  Low: "Level 1 - Light Review",
  Medium: "Level 2 - Standard Review",
  High: "Level 3 - Enhanced Review",
  Critical: "Level 4 - Critical Review"
};

export const accessRiskRules: FieldRiskRule[] = [
  { field: "access.ssoAccess", label: "SSO access", points: 5 },
  { field: "access.apiAccess", label: "API access", points: 15 },
  { field: "access.vpnAccess", label: "VPN access", points: 25 },
  { field: "access.remoteDesktopAccess", label: "Remote desktop access", points: 30 },
  { field: "access.adminAccess", label: "Admin access", points: 35 },
  { field: "access.productionAccess", label: "Production access", points: 40 },
  {
    field: "access.cloudEnvironmentAccess",
    label: "Cloud environment access",
    points: 35
  },
  {
    field: "access.otDigitalSystemsAccess",
    label: "OT/digital systems access",
    points: 45
  }
];

export const dataRiskRules: FieldRiskRule[] = [
  { field: "data.publicData", label: "Public data", points: 0 },
  { field: "data.internalData", label: "Internal data", points: 10 },
  { field: "data.confidentialData", label: "Confidential data", points: 20 },
  { field: "data.personalInformation", label: "Personal information", points: 25 },
  { field: "data.financialData", label: "Financial data", points: 30 },
  { field: "data.customerData", label: "Customer data", points: 30 },
  {
    field: "data.operationallySensitiveData",
    label: "Operationally sensitive data",
    points: 35
  }
];

export const criticalityRiskPoints: Record<string, number> = {
  Low: 0,
  Medium: 10,
  High: 20,
  Critical: 30,
  Unknown: 0
};

export const integrationRiskRules: IntegrationRiskRule[] = [
  {
    id: "identity_integration",
    label: "Identity integration",
    points: 5,
    anyFields: ["access.ssoAccess"]
  },
  {
    id: "api_integration",
    label: "API integration",
    points: 15,
    anyFields: ["access.apiAccess"]
  },
  {
    id: "network_integration",
    label: "Network integration",
    points: 20,
    anyFields: ["access.vpnAccess", "access.remoteDesktopAccess"]
  },
  {
    id: "data_flow_integration",
    label: "Data flow integration",
    points: 15,
    anyFields: [
      "data.internalData",
      "data.confidentialData",
      "data.personalInformation",
      "data.financialData",
      "data.customerData",
      "data.operationallySensitiveData"
    ]
  },
  {
    id: "logging_monitoring_integration",
    label: "Logging/monitoring integration",
    points: 5,
    anyFields: [
      "application_integration_profile.apiCallsLogged",
      "application_integration_profile.privilegedActionsLogged",
      "application_integration_profile.activityMonitored",
      "access.remoteSessionsLogged",
      "data.dataExportsLogged"
    ]
  },
  {
    id: "privileged_access_integration",
    label: "Privileged access integration",
    points: 25,
    anyFields: ["access.adminAccess", "access.productionAccess"]
  },
  {
    id: "cloud_integration",
    label: "Cloud integration",
    points: 25,
    anyFields: ["access.cloudEnvironmentAccess"]
  },
  {
    id: "ot_digital_systems_integration",
    label: "Operational technology / digital systems integration",
    points: 30,
    anyFields: ["access.otDigitalSystemsAccess"]
  },
  {
    id: "business_process_dependency",
    label: "Business process dependency",
    points: 20,
    anyFields: [
      "business_process_dependency.businessDependency",
      "business_process_dependency.supportModel",
      "business_process_dependency.slaRequired"
    ]
  }
];

export const evidenceGapRiskRules: EvidenceGapRiskRule[] = [
  {
    requirementId: "independent_security_assurance",
    title: "Missing independent security assurance evidence",
    points: 25,
    recommendation:
      "Verify one current SOC 2 Type II report or ISO 27001 certification before approval."
  },
  {
    requirementId: "dpa",
    title: "Missing Data Processing Agreement",
    points: 20,
    recommendation: "Obtain and review the DPA before sensitive data is processed."
  },
  {
    requirementId: "api_security",
    title: "Missing API security documentation",
    points: 15,
    recommendation: "Request API security documentation covering authentication, scopes, logging, and rate limits."
  },
  {
    requirementId: "bcp_dr",
    title: "Missing BCP/DR evidence",
    points: 20,
    recommendation: "Verify business continuity and disaster recovery arrangements for the service."
  },
  {
    requirementId: "breach_notification",
    title: "Missing breach notification clause",
    points: 15,
    recommendation: "Confirm contractual breach notification commitments."
  },
  {
    requirementId: "data_deletion",
    title: "Missing data deletion process",
    points: 15,
    recommendation: "Confirm that data can be deleted at termination or on request."
  },
  {
    requirementId: "logging_evidence",
    title: "Missing logging evidence",
    points: 15,
    recommendation: "Verify logging and monitoring for privileged or production-impacting access."
  },
  {
    requirementId: "support_sla",
    title: "Missing support/SLA information",
    points: 10,
    recommendation: "Confirm support model and service-level commitments."
  },
  {
    requirementId: "subprocessors",
    title: "Missing subprocessor list",
    points: 10,
    recommendation: "Review subprocessors before sensitive data processing begins."
  }
];

export const defaultRequiredEvidenceGapPoints = 10;

export const contractLegalRiskRules: ContractLegalRiskRule[] = [
  {
    id: "dpa_not_confirmed",
    field: "contract_legal.dpaRequired",
    label: "DPA requirement not confirmed",
    pointsByValue: { No: 15, Unknown: 5 },
    condition: "sensitiveData",
    recommendation: "Confirm that a DPA is required and available for sensitive data processing."
  },
  {
    id: "breach_notification_not_confirmed",
    field: "contract_legal.breachNotificationIncluded",
    label: "Breach notification not confirmed",
    pointsByValue: { No: 15, Unknown: 5 },
    condition: "sensitiveData",
    recommendation: "Confirm breach notification obligations in the contract."
  },
  {
    id: "data_deletion_not_confirmed",
    field: "data.dataDeletionSupported",
    label: "Data deletion not confirmed",
    pointsByValue: { No: 10, Unknown: 5 },
    condition: "sensitiveData",
    recommendation: "Confirm deletion support for customer and company data."
  },
  {
    id: "subprocessors_not_clear",
    field: "data.subprocessorsUsed",
    label: "Subprocessor exposure",
    pointsByValue: { Yes: 10, Unknown: 5 },
    condition: "sensitiveData",
    recommendation: "Review subprocessor scope, regions, and notification terms."
  },
  {
    id: "overseas_transfer",
    field: "data.dataTransferredOverseas",
    label: "Overseas data transfer",
    pointsByValue: { Yes: 10, Unknown: 5 },
    condition: "sensitiveData",
    recommendation: "Confirm transfer safeguards and applicable privacy terms."
  },
  {
    id: "ai_training_use",
    field: "data.usedForAiTraining",
    label: "Data may be used for AI/model training",
    pointsByValue: { Yes: 15, Unknown: 5 },
    condition: "sensitiveData",
    recommendation: "Confirm data is not used for model training without explicit approval."
  },
  {
    id: "risk_acceptance_required",
    field: "contract_legal.riskAcceptanceRequired",
    label: "Risk acceptance may be required",
    pointsByValue: { Yes: 10, Unknown: 5 },
    condition: "privilegedAccess",
    recommendation: "Document risk acceptance for privileged or production-impacting access."
  }
];
