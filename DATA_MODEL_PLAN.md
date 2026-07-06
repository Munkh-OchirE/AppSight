# Application Risk Snapshot Data Model Plan

## Overview

The MVP data model uses Prisma with SQLite. `Assessment` is the aggregate root. Most other records belong to an assessment and represent normalized answers, evidence, risk findings, LLM outputs, reports, and audit events.

The design intentionally keeps the schema simple:

- Use strings for enums so the MVP can evolve quickly.
- Store structured snapshots as JSON strings where needed.
- Keep secrets out of the database.
- Keep audit logs lightweight.

## Model: Assessment

Purpose: root record for an application/vendor risk assessment.

Key fields:

- `id`: CUID primary key.
- `applicationName`, `vendorName`, `description`: required intake fields.
- `applicationUrl`, `vendorWebsite`, `trustCentreUrl`: optional URL fields used by discovery and reporting.
- `businessOwner`, `procurementStage`, `vendorStatus`, `criticality`: intake and workflow metadata.
- `assessmentLevel`: derived from deterministic risk rules.
- `riskScore`, `riskRating`: deterministic backend-calculated result.
- `status`: lifecycle value: `draft`, `in_review`, `approved`, `approved_with_exceptions`, `rejected`.
- Decision fields: `decisionStatus`, `decisionBy`, `decisionAt`, `decisionJustification`, `rejectionReason`, `remediationActions`, `rejectionDueDate`, `rejectionOwner`, `approvedWithExceptions`.
- `createdAt`, `updatedAt`: record timestamps.

Relationships:

- Has many `Answer`.
- Has many `EvidenceItem`.
- Has many `RiskFinding`.
- Has many `LlmOutput`.
- Has many `Report`.
- Has many `AuditLog`.

Notes:

- Frontend should not directly set approved/rejected status.
- Decision fields are written by `decisionService`.
- Risk fields are written by `riskScoring`.

Prisma guidance:

```prisma
rejectionDueDate DateTime?
rejectionOwner   String?
```

## Model: Answer

Purpose: stores intake, AI-detected, reviewer-confirmed, and questionnaire answers.

Key fields:

- `assessmentId`: parent assessment.
- `section`: logical group such as `vendor_profile`, `access`, `data`, `security_evidence`, `contract_legal`, `integration`, `business_dependency`.
- `field`: stable field identifier.
- `value`: stringified scalar or JSON value.
- `state`: source/trust state, such as `user_confirmed`, `ai_detected`, `ai_inferred`, `vendor_claimed`, `publicly_found`, `uploaded_by_user`, `verified_by_reviewer`, `unknown`, `not_applicable`.
- `confidence`: optional `high`, `medium`, `low`.
- `source`: optional source label or URL.
- `confirmed`: reviewer confirmation flag.
- `createdAt`, `updatedAt`.

Relationship:

- Belongs to `Assessment`.

Prisma guidance:

```prisma
@@unique([assessmentId, section, field])
@@index([assessmentId])
```

Usage:

- AI intake creates draft answers.
- Draft review updates values and marks confirmed answers.
- Dynamic wizard stores follow-up answers.
- Risk, evidence requirements, report, and approval readiness read answers.

Precedence:

1. `confirmed = true` and `state = user_confirmed`.
2. `state = verified_by_reviewer`.
3. `state = uploaded_by_user`.
4. `state = publicly_found`.
5. `state = vendor_claimed`.
6. `state = ai_detected`.
7. `state = ai_inferred`.
8. `state = unknown`.

## Model: EvidenceItem

Purpose: records public, claimed, uploaded placeholder, missing, required, and verified evidence.

Key fields:

- `assessmentId`: parent assessment.
- `type`: evidence name, such as `SOC 2 Type II`, `ISO 27001`, `DPA`, `Subprocessor list`, `API security documentation`, `BCP/DR evidence`.
- `status`: evidence status, such as `not_found`, `publicly_claimed`, `public_document_found`, `requires_login_or_nda`, `uploaded_by_user`, `verified_by_reviewer`, `expired`, `not_applicable`, `unknown`.
- `confidence`: optional discovery/classification confidence.
- `sourceUrl`: public source URL when available.
- `sourceTextSnippet`: short safe excerpt, not full raw page content.
- `uploadedFileName`: placeholder for future upload flows.
- `issuer`, `issueDate`, `expiryDate`, `scope`: reviewer-entered or extracted metadata when available.
- `notes`: reviewer or classifier notes.
- `recommendedAction`: next action, such as request latest SOC 2 Type II report.
- `isRequired`: derived flag from smart evidence requirements.
- `requirementLevel`: `required`, `recommended`, `optional`, `not_applicable`, `already_found`, `needs_verification`, `missing`.
- `verified`: reviewer-controlled verification flag.
- `createdAt`, `updatedAt`.

Relationship:

- Belongs to `Assessment`.

Rules:

- Publicly claimed SOC 2 Type II is not verified.
- Publicly claimed ISO 27001 is not verified.
- Reviewer verification is the only path to `verified = true`.
- Missing evidence should affect risk only when it is required.
- When a rule requires `SOC 2 Type II or ISO 27001`, one verified acceptable assurance item satisfies the requirement. Do not require both or create duplicate penalties unless a specific rule says both are required.
- SOC 2 Type II is an assurance report/attestation, not a certificate. ISO 27001 is a certification.
- Required evidence is complete only when it is `verified_by_reviewer`, or `uploaded_by_user` and reviewer-confirmed, or `public_document_found` for a rule that explicitly allows public documentation, or marked `not_applicable` by the reviewer where appropriate.
- Required evidence is not complete when `status = publicly_claimed` and `verified = false`.

Prisma guidance:

```prisma
@@index([assessmentId])
@@index([assessmentId, type])
```

## Model: RiskFinding

Purpose: stores explainable outputs from deterministic risk scoring.

Key fields:

- `assessmentId`: parent assessment.
- `title`: concise finding name.
- `severity`: `Low`, `Medium`, `High`, or `Critical`.
- `category`: `Access Risk`, `Data Risk`, `Integration Risk`, `Business Criticality Risk`, `Evidence Gap Risk`, or `Contract/Legal Gap Risk`.
- `scoreImpact`: points added by the finding.
- `reason`: plain-language reason.
- `recommendation`: optional next action or control.
- `createdAt`.

Relationship:

- Belongs to `Assessment`.

Usage:

- Recreated on each risk recalculation.
- Report and LLM summary use findings as fixed inputs.
- LLM must not create authoritative risk findings.

Prisma guidance:

```prisma
@@index([assessmentId])
```

## Model: LlmOutput

Purpose: stores validated LLM outputs and safe traceability data.

Key fields:

- `assessmentId`: parent assessment.
- `type`: `ai_intake`, `summary`, or future LLM output type.
- `provider`: expected `gemini`.
- `model`: configured Gemini model.
- `inputJson`: safe structured input snapshot. Do not include secrets.
- `outputJson`: validated JSON output.
- `checkpointsJson`: checkpoint list for summary generation and failure diagnosis.
- `createdAt`.

Relationship:

- Belongs to `Assessment`.

Rules:

- Do not store API keys, auth headers, or raw sensitive documents.
- Store output only after JSON parsing and Zod validation where possible.
- Summary outputs are wording only, not authoritative risk decisions.

Prisma guidance:

```prisma
@@index([assessmentId])
```

## Model: Report

Purpose: stores generated report artifacts.

Key fields:

- `assessmentId`: parent assessment.
- `format`: `markdown` for MVP, optionally `json` later.
- `content`: generated report content.
- `createdAt`.

Relationship:

- Belongs to `Assessment`.

Usage:

- `GET /api/assessments/:id/report` can build fresh report data.
- `GET /api/assessments/:id/export/markdown` can generate and store markdown report.
- For MVP, saving one `Report` row per markdown export is acceptable. Later, consider replacing the latest markdown report instead of creating duplicates.

Prisma guidance:

```prisma
@@index([assessmentId])
```

## Model: AuditLog

Purpose: lightweight event log for important assessment actions.

Key fields:

- `assessmentId`: parent assessment.
- `action`: event name.
- `actor`: `local-demo-user` for MVP.
- `detailsJson`: safe structured detail.
- `createdAt`.

Relationship:

- Belongs to `Assessment`.

Actions:

- `assessment_created`
- `ai_intake_generated`
- `evidence_discovery_run`
- `risk_score_calculated`
- `llm_summary_generated`
- `assessment_approved`
- `assessment_approved_with_exceptions`
- `assessment_rejected`

Rules:

- Never log secrets.
- Keep details small and operational.
- Use audit logs for reviewer traceability, not a full enterprise audit trail.

Prisma guidance:

```prisma
@@index([assessmentId])
```

## Derived Data and Recalculation

Derived data:

- `Assessment.riskScore`, `riskRating`, `assessmentLevel`.
- `EvidenceItem.isRequired`, `requirementLevel`.
- `RiskFinding` rows.
- Approval readiness response.
- Report content.

Recalculation strategy:

- Recalculate smart evidence requirements before risk scoring and approval readiness.
- Recalculate risk before report generation if missing or stale enough for MVP purposes.
- Recalculate approval readiness inside the decision endpoint every time.
- Do not trust client-provided risk, readiness, or decision values.

## Data Lifecycle

Assessment creation:

1. Create `Assessment`.
2. Write `assessment_created` audit event.
3. Optionally call AI intake and create `Answer` rows.

Draft review:

1. Update `Answer` rows as reviewer confirms or corrects.
2. Update `EvidenceItem` rows when public evidence is classified or reviewer verifies evidence.

Questionnaire:

1. Upsert `Answer` rows by assessment, section, and field.
2. Use question rules to decide visibility.

Risk scoring:

1. Calculate smart evidence requirements.
2. Replace `RiskFinding` rows.
3. Update `Assessment.riskScore`, `riskRating`, and `assessmentLevel`.
4. Write audit event.

Summary/report:

1. Load assessment, answers, evidence, risk findings.
2. Generate LLM summary with checkpoints if requested.
3. Generate report markdown from deterministic data plus validated summary wording.

Decision:

1. Recalculate approval readiness.
2. Apply approve, approved-with-exceptions, or reject rules.
3. Update decision fields.
4. Write audit event.
