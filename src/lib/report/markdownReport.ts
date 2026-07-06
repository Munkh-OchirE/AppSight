import type {
  ReportEvidenceRequirement,
  ReportFinding,
  RiskSnapshotReport
} from "@/lib/report/reportBuilder";

function valueOrUnknown(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

function listLines<T>(items: T[], render: (item: T) => string) {
  if (items.length === 0) {
    return "- None";
  }

  return items.map(render).join("\n");
}

function findingLine(finding: ReportFinding) {
  const recommendation = finding.recommendation
    ? ` Recommendation: ${finding.recommendation}`
    : "";

  return `- **${finding.title}** (${finding.severity}, +${finding.scoreImpact}): ${finding.reason}${recommendation}`;
}

function evidenceLine(requirement: ReportEvidenceRequirement) {
  return `- **${requirement.type}**: ${requirement.requirementLevel.replaceAll(
    "_",
    " "
  )}. ${requirement.notes}`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export function buildMarkdownReport(report: RiskSnapshotReport) {
  return `# Application Risk Snapshot: ${report.assessment.applicationName}

Generated: ${formatDate(report.generatedAt)}

## Application Profile

- Application name: ${report.assessment.applicationName}
- Vendor name: ${report.assessment.vendorName}
- Business owner: ${valueOrUnknown(report.assessment.businessOwner)}
- Procurement stage: ${valueOrUnknown(report.assessment.procurementStage)}
- Criticality: ${valueOrUnknown(report.assessment.criticality)}
- Assessment level: ${report.assessment.assessmentLevel}
- Risk score: ${report.assessment.riskScore}
- Risk rating: ${report.assessment.riskRating}
- Decision status: ${valueOrUnknown(report.assessment.decisionStatus ?? report.assessment.status)}

## Executive Summary

${report.executiveSummary}

## Key Risk Drivers

${listLines(report.keyRiskDrivers, findingLine)}

## Access Summary

${report.summaries.access}

## Data Summary

${report.summaries.data}

## Integration Summary

${report.summaries.integration}

## Evidence Summary

${report.summaries.evidence}

## Required Evidence

${listLines(report.evidence.required, evidenceLine)}

## Missing Evidence

${listLines(report.evidence.missing, evidenceLine)}

## Not Applicable Evidence

${listLines(report.evidence.notApplicable, evidenceLine)}

## Contract/Legal Gaps

${listLines(report.contractLegalGaps, findingLine)}

## Required Controls

${listLines(report.requiredControls, (control) => `- ${control}`)}

## Vendor Follow-up Questions

${listLines(report.vendorFollowUpQuestions, (question) => `- ${question}`)}

## Approval Recommendation

${report.approvalRecommendation}

## Approval/Rejection Details

- Approved with exceptions: ${report.approvalDetails.approvedWithExceptions ? "Yes" : "No"}
- Decision by: ${valueOrUnknown(report.assessment.decisionBy)}
- Decision at: ${formatDate(report.assessment.decisionAt)}
- Decision justification: ${valueOrUnknown(report.assessment.decisionJustification)}
- Rejection reason: ${valueOrUnknown(report.assessment.rejectionReason)}
- Remediation actions: ${valueOrUnknown(report.assessment.remediationActions)}
- Rejection owner: ${valueOrUnknown(report.approvalDetails.rejectionOwner)}
- Rejection due date: ${formatDate(report.approvalDetails.rejectionDueDate)}

## All Risk Findings

${listLines(report.riskFindings, findingLine)}
`;
}

export function safeMarkdownFilename(report: RiskSnapshotReport) {
  const base = `${report.assessment.applicationName}-${report.assessment.vendorName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${base || "application-risk-snapshot"}-risk-snapshot.md`;
}
