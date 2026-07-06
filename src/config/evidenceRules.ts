export type EvidenceRequirementRule = {
  id: string;
  type: string;
  acceptableTypes?: string[];
  requirementLevel: "required" | "recommended" | "optional" | "not_applicable";
  appliesWhen: {
    sensitiveData?: boolean;
    apiAccess?: boolean;
    highCriticality?: boolean;
    privilegedAccess?: boolean;
    lowNoAccessNoData?: boolean;
  };
  allowsPublicDocument?: boolean;
  notes: string;
};

export const evidenceRules: EvidenceRequirementRule[] = [
  {
    id: "independent_security_assurance",
    type: "Independent security assurance evidence",
    acceptableTypes: ["SOC 2 Type II", "ISO 27001"],
    requirementLevel: "required",
    appliesWhen: { sensitiveData: true },
    notes:
      "One verified SOC 2 Type II report or verified ISO 27001 certification satisfies this requirement."
  },
  {
    id: "dpa",
    type: "Data Processing Agreement",
    requirementLevel: "required",
    appliesWhen: { sensitiveData: true },
    allowsPublicDocument: true,
    notes: "Required when confidential, personal, customer, financial, or operationally sensitive data is processed."
  },
  {
    id: "subprocessors",
    type: "Subprocessor list",
    requirementLevel: "required",
    appliesWhen: { sensitiveData: true },
    allowsPublicDocument: true,
    notes: "Required when sensitive data may be handled by vendor subprocessors."
  },
  {
    id: "data_deletion",
    type: "Data deletion process",
    requirementLevel: "required",
    appliesWhen: { sensitiveData: true },
    allowsPublicDocument: true,
    notes: "Required to confirm data can be deleted when the service ends."
  },
  {
    id: "breach_notification",
    type: "Breach notification clause",
    requirementLevel: "required",
    appliesWhen: { sensitiveData: true },
    allowsPublicDocument: true,
    notes: "Required to confirm customer notification commitments."
  },
  {
    id: "api_security",
    type: "API security documentation",
    requirementLevel: "required",
    appliesWhen: { apiAccess: true },
    allowsPublicDocument: true,
    notes: "Required when an application integrates by API."
  },
  {
    id: "api_logging",
    type: "API logging information",
    requirementLevel: "recommended",
    appliesWhen: { apiAccess: true },
    allowsPublicDocument: true,
    notes: "Recommended to understand auditability of API access."
  },
  {
    id: "credential_rotation",
    type: "Credential rotation information",
    requirementLevel: "recommended",
    appliesWhen: { apiAccess: true },
    allowsPublicDocument: true,
    notes: "Recommended to understand API secret management."
  },
  {
    id: "bcp_dr",
    type: "Business continuity / disaster recovery",
    requirementLevel: "required",
    appliesWhen: { highCriticality: true },
    notes: "Required for high or critical business dependency."
  },
  {
    id: "support_sla",
    type: "Support/SLA information",
    requirementLevel: "required",
    appliesWhen: { highCriticality: true },
    allowsPublicDocument: true,
    notes: "Required for high or critical business dependency."
  },
  {
    id: "incident_response",
    type: "Incident response",
    requirementLevel: "recommended",
    appliesWhen: { highCriticality: true },
    notes: "Recommended for high or critical services."
  },
  {
    id: "logging_evidence",
    type: "Logging evidence",
    requirementLevel: "required",
    appliesWhen: { privilegedAccess: true },
    notes: "Required when vendor access can affect admin, production, cloud, or OT/digital systems."
  },
  {
    id: "incident_cooperation",
    type: "Incident cooperation process",
    requirementLevel: "recommended",
    appliesWhen: { privilegedAccess: true },
    notes: "Recommended when privileged vendor access may need coordinated incident response."
  },
  {
    id: "right_to_audit",
    type: "Right-to-audit clause",
    requirementLevel: "recommended",
    appliesWhen: { privilegedAccess: true },
    notes: "Recommended for privileged or production-impacting access."
  }
];
