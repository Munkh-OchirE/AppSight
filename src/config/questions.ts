export type QuestionType = "checkbox" | "text" | "select";

export type QuestionDefinition = {
  id: string;
  section: string;
  field: string;
  label: string;
  type: QuestionType;
  options?: string[];
  helpText?: string;
  visibleWhen?: {
    any?: string[];
    all?: string[];
    criticality?: Array<"High" | "Critical">;
    sensitiveData?: boolean;
  };
};

export const accessOptionFields = [
  "noSystemAccess",
  "ssoAccess",
  "apiAccess",
  "vpnAccess",
  "remoteDesktopAccess",
  "adminAccess",
  "productionAccess",
  "cloudEnvironmentAccess",
  "otDigitalSystemsAccess"
];

export const dataOptionFields = [
  "noCompanyData",
  "publicData",
  "internalData",
  "confidentialData",
  "personalInformation",
  "financialData",
  "customerData",
  "operationallySensitiveData"
];

export const sensitiveDataFields = [
  "confidentialData",
  "personalInformation",
  "financialData",
  "customerData",
  "operationallySensitiveData"
];

export const privilegedAccessFields = [
  "adminAccess",
  "productionAccess",
  "cloudEnvironmentAccess",
  "otDigitalSystemsAccess"
];

export const questions: QuestionDefinition[] = [
  {
    id: "vendor_profile_business_owner",
    section: "vendor_profile",
    field: "businessOwner",
    label: "Who is the business owner?",
    type: "text"
  },
  {
    id: "vendor_profile_procurement_stage",
    section: "vendor_profile",
    field: "procurementStage",
    label: "What procurement stage is this assessment for?",
    type: "select",
    options: ["Unknown", "Idea", "Evaluation", "Pilot", "Procurement", "Renewal"]
  },
  {
    id: "vendor_profile_vendor_status",
    section: "vendor_profile",
    field: "vendorStatus",
    label: "Is this a new or existing vendor?",
    type: "select",
    options: ["Unknown", "new", "existing"]
  },
  {
    id: "business_criticality_criticality",
    section: "business_criticality",
    field: "criticality",
    label: "How critical is this application to the business?",
    type: "select",
    options: ["Unknown", "Low", "Medium", "High", "Critical"]
  },
  {
    id: "access_no_system_access",
    section: "access",
    field: "noSystemAccess",
    label: "No system access",
    type: "checkbox"
  },
  {
    id: "access_sso",
    section: "access",
    field: "ssoAccess",
    label: "SSO access",
    type: "checkbox"
  },
  {
    id: "access_api",
    section: "access",
    field: "apiAccess",
    label: "API access",
    type: "checkbox"
  },
  {
    id: "access_vpn",
    section: "access",
    field: "vpnAccess",
    label: "VPN access",
    type: "checkbox"
  },
  {
    id: "access_remote_desktop",
    section: "access",
    field: "remoteDesktopAccess",
    label: "Remote desktop access",
    type: "checkbox"
  },
  {
    id: "access_admin",
    section: "access",
    field: "adminAccess",
    label: "Admin access",
    type: "checkbox"
  },
  {
    id: "access_production",
    section: "access",
    field: "productionAccess",
    label: "Production access",
    type: "checkbox"
  },
  {
    id: "access_cloud",
    section: "access",
    field: "cloudEnvironmentAccess",
    label: "Access to cloud environment",
    type: "checkbox"
  },
  {
    id: "access_ot",
    section: "access",
    field: "otDigitalSystemsAccess",
    label: "Access to operational technology or digital systems",
    type: "checkbox"
  },
  {
    id: "sso_protocol",
    section: "application_integration_profile",
    field: "ssoProtocol",
    label: "Does it support SAML or OIDC?",
    type: "select",
    options: ["Unknown", "SAML", "OIDC", "Both", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_entra",
    section: "application_integration_profile",
    field: "entraIdIntegration",
    label: "Will it integrate with Microsoft Entra ID?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_mfa",
    section: "access",
    field: "mfaEnforced",
    label: "Can MFA be enforced?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_scim",
    section: "application_integration_profile",
    field: "scimProvisioning",
    label: "Does it support SCIM provisioning?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_local_accounts",
    section: "access",
    field: "localAccountsDisabled",
    label: "Can local accounts be disabled?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_rbac",
    section: "access",
    field: "rbacSupported",
    label: "Does it support RBAC?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_admin_roles",
    section: "access",
    field: "adminRolesSeparated",
    label: "Are admin roles separated?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "sso_deprovisioning",
    section: "access",
    field: "deprovisioningDocumented",
    label: "Are user deprovisioning processes documented?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.ssoAccess"] }
  },
  {
    id: "api_connected_system",
    section: "application_integration_profile",
    field: "apiConnectedSystem",
    label: "What system does the API connect to?",
    type: "text",
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_permission",
    section: "application_integration_profile",
    field: "apiPermissionLevel",
    label: "Is the API read-only, read-write, or admin?",
    type: "select",
    options: ["Unknown", "Read-only", "Read-write", "Admin"],
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_auth",
    section: "application_integration_profile",
    field: "apiAuthenticationMethod",
    label: "What authentication method is used?",
    type: "text",
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_credentials_storage",
    section: "application_integration_profile",
    field: "apiCredentialStorage",
    label: "How are API credentials stored?",
    type: "text",
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_credentials_rotation",
    section: "application_integration_profile",
    field: "apiCredentialRotation",
    label: "How often are credentials rotated?",
    type: "text",
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_least_privilege",
    section: "application_integration_profile",
    field: "apiLeastPrivilege",
    label: "Are API scopes least privileged?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_logging",
    section: "application_integration_profile",
    field: "apiCallsLogged",
    label: "Are API calls logged?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_webhooks",
    section: "application_integration_profile",
    field: "webhooksSigned",
    label: "Are webhooks signed?",
    type: "select",
    options: ["Unknown", "Yes", "No", "Not applicable"],
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "api_rate_limiting",
    section: "application_integration_profile",
    field: "rateLimitingSupported",
    label: "Is rate limiting supported?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.apiAccess"] }
  },
  {
    id: "remote_ip_ranges",
    section: "application_integration_profile",
    field: "vendorIpRanges",
    label: "What vendor IP ranges are required?",
    type: "text",
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "remote_ports",
    section: "application_integration_profile",
    field: "portsProtocols",
    label: "What ports and protocols are required?",
    type: "text",
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "remote_time_bound",
    section: "access",
    field: "remoteAccessTimeBound",
    label: "Is access time-bound?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "remote_approval",
    section: "access",
    field: "remoteAccessApprovalRequired",
    label: "Is approval required before access?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "remote_session_logs",
    section: "access",
    field: "remoteSessionsLogged",
    label: "Are sessions logged?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "remote_mfa",
    section: "access",
    field: "remoteMfaRequired",
    label: "Is MFA required?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "remote_disable",
    section: "access",
    field: "remoteAccessQuickDisable",
    label: "Can access be disabled quickly?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: ["access.vpnAccess", "access.remoteDesktopAccess"] }
  },
  {
    id: "privileged_actions_logged",
    section: "application_integration_profile",
    field: "privilegedActionsLogged",
    label: "Are privileged actions logged?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: privilegedAccessFields.map((field) => `access.${field}`) }
  },
  {
    id: "privileged_change_control",
    section: "application_integration_profile",
    field: "changeControl",
    label: "Is there change control?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: privilegedAccessFields.map((field) => `access.${field}`) }
  },
  {
    id: "privileged_emergency_access",
    section: "application_integration_profile",
    field: "emergencyAccess",
    label: "Is there emergency access?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: privilegedAccessFields.map((field) => `access.${field}`) }
  },
  {
    id: "privileged_monitoring",
    section: "application_integration_profile",
    field: "activityMonitored",
    label: "Is activity monitored?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: privilegedAccessFields.map((field) => `access.${field}`) }
  },
  {
    id: "privileged_business_impact",
    section: "business_process_dependency",
    field: "misuseBusinessImpact",
    label: "What business impact could occur if access is misused?",
    type: "text",
    visibleWhen: { any: privilegedAccessFields.map((field) => `access.${field}`) }
  },
  {
    id: "privileged_risk_acceptance",
    section: "contract_legal",
    field: "riskAcceptanceRequired",
    label: "Is risk acceptance required?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { any: privilegedAccessFields.map((field) => `access.${field}`) }
  },
  {
    id: "data_no_company",
    section: "data",
    field: "noCompanyData",
    label: "No company data",
    type: "checkbox"
  },
  {
    id: "data_public",
    section: "data",
    field: "publicData",
    label: "Public data",
    type: "checkbox"
  },
  {
    id: "data_internal",
    section: "data",
    field: "internalData",
    label: "Internal data",
    type: "checkbox"
  },
  {
    id: "data_confidential",
    section: "data",
    field: "confidentialData",
    label: "Confidential data",
    type: "checkbox"
  },
  {
    id: "data_personal",
    section: "data",
    field: "personalInformation",
    label: "Personal information",
    type: "checkbox"
  },
  {
    id: "data_financial",
    section: "data",
    field: "financialData",
    label: "Financial data",
    type: "checkbox"
  },
  {
    id: "data_customer",
    section: "data",
    field: "customerData",
    label: "Customer data",
    type: "checkbox"
  },
  {
    id: "data_operational",
    section: "data",
    field: "operationallySensitiveData",
    label: "Operationally sensitive data",
    type: "checkbox"
  },
  {
    id: "data_hosted",
    section: "data",
    field: "dataHostingLocation",
    label: "Where is data hosted?",
    type: "text",
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_overseas",
    section: "data",
    field: "dataTransferredOverseas",
    label: "Is data transferred overseas?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_subprocessors",
    section: "data",
    field: "subprocessorsUsed",
    label: "Are subprocessors used?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_retention",
    section: "data",
    field: "dataRetentionPeriod",
    label: "How long is data retained?",
    type: "text",
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_deletion",
    section: "data",
    field: "dataDeletionSupported",
    label: "Can data be deleted?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_breach_notification",
    section: "contract_legal",
    field: "breachNotificationIncluded",
    label: "Is breach notification included?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_dpa_required",
    section: "contract_legal",
    field: "dpaRequired",
    label: "Is a Data Processing Agreement required?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_ai_training",
    section: "data",
    field: "usedForAiTraining",
    label: "Will data be used for AI/model training?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "data_exports_logged",
    section: "data",
    field: "dataExportsLogged",
    label: "Are data exports logged?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { sensitiveData: true }
  },
  {
    id: "evidence_soc2",
    section: "security_assurance_evidence",
    field: "soc2Type2Available",
    label: "Can the vendor provide a current SOC 2 Type II report?",
    type: "select",
    options: ["Unknown", "Yes", "No", "Claimed only"]
  },
  {
    id: "evidence_iso",
    section: "security_assurance_evidence",
    field: "iso27001Available",
    label: "Can the vendor provide current ISO 27001 certification?",
    type: "select",
    options: ["Unknown", "Yes", "No", "Claimed only"]
  },
  {
    id: "business_dependency",
    section: "business_process_dependency",
    field: "businessDependency",
    label: "What business process depends on this application?",
    type: "text",
    visibleWhen: { criticality: ["High", "Critical"] }
  },
  {
    id: "support_model",
    section: "business_process_dependency",
    field: "supportModel",
    label: "What support model is required?",
    type: "text",
    visibleWhen: { criticality: ["High", "Critical"] }
  },
  {
    id: "sla",
    section: "business_process_dependency",
    field: "slaRequired",
    label: "What SLA is required?",
    type: "text",
    visibleWhen: { criticality: ["High", "Critical"] }
  },
  {
    id: "bcp_dr",
    section: "business_process_dependency",
    field: "bcpDrAvailable",
    label: "Is BCP/DR information available?",
    type: "select",
    options: ["Unknown", "Yes", "No"],
    visibleWhen: { criticality: ["High", "Critical"] }
  }
];
