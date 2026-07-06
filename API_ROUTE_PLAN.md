# Application Risk Snapshot API Route Plan

## API Conventions

General conventions:

- Validate request payloads with Zod.
- Return JSON unless the route is markdown export.
- Use safe error messages.
- Use `local-demo-user` as actor for MVP audit and decisions.
- Never return secrets, API keys, tokens, webhook URLs, or auth headers.
- Recalculate risk, evidence requirements, and approval readiness server-side when needed.

Common error response:

```json
{
  "error": "Safe user-facing message."
}
```

## `POST /api/assessments`

Purpose: create a new assessment from intake form.

Request:

```json
{
  "applicationName": "Example App",
  "vendorName": "Example Vendor",
  "applicationUrl": "https://app.example.com",
  "vendorWebsite": "https://example.com",
  "trustCentreUrl": "https://trust.example.com",
  "description": "SaaS finance platform for invoice approvals.",
  "businessOwner": "Finance",
  "criticality": "High",
  "procurementStage": "Pilot",
  "vendorStatus": "new"
}
```

Response:

```json
{
  "assessment": {
    "id": "assessment_id",
    "applicationName": "Example App",
    "vendorName": "Example Vendor",
    "status": "draft",
    "createdAt": "2026-07-03T00:00:00.000Z"
  }
}
```

Core logic:

- Validate required fields: application name, vendor name, description.
- Validate URL fields when present.
- Create `Assessment`.
- Create `assessment_created` audit log.

## `GET /api/assessments`

Purpose: list assessments for dashboard.

Request: no body. Optional query parameters can be added later for status/search.

Response:

```json
{
  "assessments": [],
  "summary": {
    "total": 0,
    "draft": 0,
    "inReview": 0,
    "approved": 0,
    "approvedWithExceptions": 0,
    "rejected": 0,
    "highRisk": 0,
    "criticalRisk": 0
  }
}
```

Core logic:

- Load recent assessments ordered by updated date.
- Calculate dashboard counts from database records.

## `GET /api/assessments/:id`

Purpose: load one assessment with related records.

Request: no body.

Response:

```json
{
  "assessment": {},
  "answers": [],
  "evidenceItems": [],
  "riskFindings": [],
  "latestSummary": null,
  "auditLogs": []
}
```

Core logic:

- Validate `id`.
- Load assessment and relations.
- Return 404 if not found.

## `PATCH /api/assessments/:id`

Purpose: update assessment metadata and reviewer-corrected draft values.

Request:

```json
{
  "assessment": {
    "businessOwner": "Finance",
    "criticality": "High",
    "procurementStage": "Pilot"
  },
  "answers": [
    {
      "section": "access",
      "field": "ssoAccess",
      "value": true,
      "state": "user_confirmed",
      "confidence": "high",
      "confirmed": true
    }
  ],
  "evidenceItems": [
    {
      "id": "evidence_id",
      "status": "verified_by_reviewer",
      "verified": true,
      "notes": "Reviewer confirmed current SOC 2 Type II report."
    }
  ]
}
```

Response:

```json
{
  "assessment": {},
  "answers": [],
  "evidenceItems": []
}
```

Core logic:

- Validate allowed assessment fields only.
- Upsert answers by assessment, section, and field.
- Do not accept or trust client-provided derived fields: `riskScore`, `riskRating`, `assessmentLevel`, approved/rejected status values, decision fields, `isRequired`, or `requirementLevel`.
- PATCH may update reviewer-controlled evidence fields only: `status`, `notes`, `verified`, `issueDate`, `expiryDate`, `scope`, `issuer`, `uploadedFileName`, and `recommendedAction`.
- Verify each evidence item belongs to the assessment before updating it.
- Do not allow direct update of approved/rejected status, risk score, assessment level, evidence requirement state, or decision fields here.

## `POST /api/assessments/ai-intake`

Purpose: extract likely assessment fields from user description.

Request:

```json
{
  "assessmentId": "assessment_id",
  "description": "We want to use a SaaS finance platform...",
  "applicationName": "FinanceFlow",
  "vendorName": "Example Vendor"
}
```

Response:

```json
{
  "assessmentId": "assessment_id",
  "extracted": {
    "access": {},
    "data": {},
    "securityEvidence": {},
    "followUpQuestions": []
  }
}
```

Core logic:

- Load assessment if `assessmentId` is present.
- Build prompt using untrusted user description.
- Call Gemini server-side only.
- Parse JSON and validate with Zod.
- Store structured outputs as `Answer` rows and optional `LlmOutput`.
- Mark vendor-claimed evidence as claimed, not verified.
- Write `ai_intake_generated` audit event.

## `POST /api/assessments/:id/run-evidence-discovery`

Purpose: find public vendor assurance evidence.

Request:

```json
{
  "vendorWebsite": "https://example.com",
  "trustCentreUrl": "https://trust.example.com"
}
```

Response:

```json
{
  "assessmentId": "assessment_id",
  "pagesFetched": 8,
  "evidenceItems": [
    {
      "type": "SOC 2 Type II",
      "status": "publicly_claimed",
      "confidence": "medium",
      "sourceUrl": "https://example.com/trust",
      "notes": "Vendor mentions SOC 2 Type II. Report was not publicly available.",
      "recommendedAction": "Request the latest SOC 2 Type II report and verify scope, reporting period, exceptions, and complementary user entity controls."
    }
  ]
}
```

Core logic:

- Load assessment.
- Resolve URLs from request or assessment.
- Fetch only through `safeFetch`.
- Extract links with Cheerio.
- Prioritize relevant links and common paths.
- Fetch up to configured max pages.
- Classify evidence.
- Upsert or create `EvidenceItem` records.
- Write `evidence_discovery_run` audit event.

## `POST /api/assessments/:id/submit-answers`

Purpose: save dynamic questionnaire answers.

Request:

```json
{
  "answers": [
    {
      "section": "data",
      "field": "financialData",
      "value": true,
      "state": "user_confirmed",
      "confirmed": true
    }
  ]
}
```

Response:

```json
{
  "answers": [],
  "visibleQuestions": [],
  "requiredEvidencePreview": []
}
```

Core logic:

- Validate answer payload.
- Normalize mutually exclusive options before persistence: `No system access` clears/prevents SSO, API, VPN, remote desktop, admin, production, cloud environment, and OT/digital systems access.
- Normalize mutually exclusive data options before persistence: `No company data` clears/prevents public, internal, confidential, personal, financial, customer, and operationally sensitive data.
- Upsert answers by section and field.
- Re-run question engine to return visible next questions.
- Re-run smart evidence requirements for preview.
- Set assessment status to `in_review` if still draft and enough answers exist.

## `POST /api/assessments/:id/calculate-risk`

Purpose: calculate deterministic risk score, rating, level, and findings.

Request:

```json
{
  "force": true
}
```

Response:

```json
{
  "riskScore": 68,
  "riskRating": "High",
  "assessmentLevel": "Level 3 - Enhanced Review",
  "riskFindings": []
}
```

Core logic:

- Load assessment, answers, evidence.
- Use final cleaned answer state, not hidden stale answers.
- Calculate smart evidence requirements.
- Apply deterministic risk rules with category caps.
- Score Access Risk from the highest selected access risk plus small modifiers for additional selected access types, capped at 45.
- Score Integration Risk using configured point values, capped at 30.
- Score Business Criticality Risk as Low +0, Medium +10, High +20, Critical +30.
- Treat `SOC 2 Type II or ISO 27001` as one independent assurance requirement; one verified acceptable item satisfies it.
- Avoid duplicate penalties for missing both SOC 2 Type II and ISO 27001 unless a specific rule requires both.
- Replace existing `RiskFinding` records.
- Update assessment risk fields.
- Write `risk_score_calculated` audit event.

## `POST /api/assessments/:id/generate-summary`

Purpose: create LLM summary with checkpoints.

Request:

```json
{
  "regenerate": true
}
```

Response:

```json
{
  "summary": {
    "executiveSummary": "",
    "keyRiskDrivers": [],
    "evidenceSummary": "",
    "missingEvidence": [],
    "requiredControls": [],
    "vendorFollowUpQuestions": [],
    "approvalRecommendationWording": "",
    "riskAcceptanceWording": ""
  },
  "checkpoints": []
}
```

Core logic:

- Run required checkpoints.
- Load assessment, answers, evidence, risk.
- Recalculate risk if missing.
- Calculate required evidence.
- Build prompt with fixed score/rating/findings.
- Call Gemini server-side.
- If a Gemini health check is needed inside this request, perform it once and reuse the result for checkpoints.
- Parse JSON and validate with Zod.
- Save `LlmOutput` with checkpoints.
- Write `llm_summary_generated` audit event on success.
- On failure, return safe checkpoint list.

## `GET /api/assessments/:id/approval-readiness`

Purpose: tell UI whether assessment can be approved cleanly or with exceptions.

Request: no body.

Response:

```json
{
  "canApproveCleanly": false,
  "requiresExceptionApproval": true,
  "blockingItems": [],
  "warningItems": [],
  "riskRating": "High",
  "riskScore": 68,
  "recommendedDecision": "approve_with_exceptions"
}
```

Core logic:

- Load assessment, answers, evidence.
- Recalculate risk if missing.
- Calculate required evidence.
- Apply evidence completion rules: reviewer-verified evidence, reviewer-confirmed uploaded evidence, explicitly allowed public documentation, or reviewer-approved not applicable.
- Treat publicly claimed SOC 2 Type II or ISO 27001 as incomplete until reviewer verified.
- Treat `SOC 2 Type II or ISO 27001` as one independent assurance requirement where either verified acceptable item satisfies the rule.
- Check missing and unverified mandatory items.
- Check required integration answers and high-risk unknowns.
- Return readiness result without changing decision status.

## `POST /api/assessments/:id/decision`

Purpose: approve, approve with exceptions, or reject an assessment.

Approval request:

```json
{
  "decision": "approve",
  "justification": "Approved for pilot with accepted exceptions.",
  "acknowledgedExceptions": true
}
```

Rejection request:

```json
{
  "decision": "reject",
  "rejectionReason": "Required security evidence was not provided.",
  "remediationActions": "Vendor must provide SOC 2 Type II report and DPA.",
  "rejectionDueDate": "2026-08-01",
  "rejectionOwner": "Procurement"
}
```

Response:

```json
{
  "assessment": {
    "id": "assessment_id",
    "status": "approved_with_exceptions",
    "decisionBy": "local-demo-user",
    "decisionAt": "2026-07-03T00:00:00.000Z"
  },
  "readiness": {}
}
```

Core logic:

- Recalculate approval readiness.
- Reject path requires `rejectionReason`.
- Approve path requires `justification`.
- If required items are incomplete and acknowledgement is false, return 400.
- If required items are incomplete and acknowledgement is true, set `approved_with_exceptions`.
- If no required items are incomplete, set `approved`.
- Store decision fields, timestamp, `rejectionDueDate`, and `rejectionOwner` when provided.
- Write decision audit event.

## `GET /api/assessments/:id/report`

Purpose: return structured report data for report page.

Request: no body.

Response:

```json
{
  "report": {
    "applicationName": "",
    "vendorName": "",
    "riskScore": 0,
    "riskRating": "Low",
    "decisionStatus": "draft",
    "sections": {}
  }
}
```

Core logic:

- Load assessment and relations.
- Recalculate risk if missing.
- Calculate required evidence.
- Load latest summary if available.
- Build report DTO.

## `GET /api/assessments/:id/export/markdown`

Purpose: export report as markdown.

Request: no body.

Response:

```text
# Application Risk Snapshot: Example App
...
```

Core logic:

- Build report DTO.
- Convert to markdown.
- Save `Report` record with format `markdown`.
- For MVP, saving one `Report` row per markdown export is acceptable. Later, consider replacing the latest markdown report instead of creating duplicates.
- Return markdown response with safe filename.

## `GET /api/llm/health`

Purpose: check configured LLM provider.

Usage:

- Do not call this endpoint automatically on every page load.
- Use it from a diagnostics button, a settings/debug page, or a manual check during summary generation.
- If summary generation performs a health check, avoid repeated unnecessary calls in the same request.

Request: no body.

Success response:

```json
{
  "provider": "gemini",
  "model": "gemini-3.5-flash",
  "apiKeyConfigured": true,
  "testCallSucceeded": true,
  "error": null
}
```

Missing key response:

```json
{
  "provider": "gemini",
  "model": "gemini-3.5-flash",
  "apiKeyConfigured": false,
  "testCallSucceeded": false,
  "error": "Gemini API key is missing. Add GEMINI_API_KEY to .env and restart the server."
}
```

Core logic:

- Read `LLM_PROVIDER`, `GEMINI_MODEL`, `GEMINI_API_KEY` server-side.
- Do a small test call only when key is configured.
- Return no secret material.

## `POST /api/integrations/servicenow/push-result`

Purpose: placeholder to push assessment result to ServiceNow.

Request:

```json
{
  "assessmentId": "assessment_id",
  "applicationName": "Example App",
  "vendorName": "Example Vendor",
  "riskRating": "High",
  "riskScore": 68,
  "decisionStatus": "approved_with_exceptions",
  "summary": "High-risk SaaS with missing required evidence."
}
```

Response:

```json
{
  "ok": true,
  "mode": "mock",
  "message": "ServiceNow config is not set. Mock success returned for MVP."
}
```

Core logic:

- Validate payload.
- Read ServiceNow env config.
- If env is missing, return mock success.
- Do not log credentials.

## `POST /api/integrations/snow/push-result`

Purpose: alias placeholder for SNOW naming.

Request and response: same as ServiceNow route.

Core logic:

- Reuse same service implementation as ServiceNow.
- Keep route because README explicitly lists both names.

## `POST /api/integrations/jira/create-actions`

Purpose: placeholder to create Jira remediation actions.

Request:

```json
{
  "assessmentId": "assessment_id",
  "items": [
    {
      "title": "Request SOC 2 Type II report",
      "description": "Vendor must provide latest report.",
      "severity": "High"
    }
  ]
}
```

Response:

```json
{
  "ok": true,
  "mode": "mock",
  "issueKeys": ["ARS-MOCK-1"]
}
```

Core logic:

- Validate payload.
- Read Jira env config.
- If env is missing, return mock issue keys.
- Do not log Jira token.

## `POST /api/integrations/teams/send-notification`

Purpose: placeholder to send Teams approval/rejection notification.

Request:

```json
{
  "assessmentId": "assessment_id",
  "title": "Assessment approved with exceptions",
  "message": "Example App was approved with exceptions.",
  "riskRating": "High",
  "decisionStatus": "approved_with_exceptions"
}
```

Response:

```json
{
  "ok": true,
  "mode": "mock",
  "message": "Teams webhook is not set. Mock success returned for MVP."
}
```

Core logic:

- Validate payload.
- Read Teams webhook URL from env.
- If env is missing, return mock success.
- Do not log webhook URL.
