# Application Risk Snapshot Implementation Plan

## Phase 1: Project Setup, Database, Dashboard, Assessment CRUD

Goal: establish the Next.js MVP foundation and core assessment lifecycle.

Deliverables:

- Create or verify Next.js, React, TypeScript, Tailwind CSS project structure.
- Add Prisma and SQLite.
- Add `.env.example` with README-defined variables.
- Add `prisma/schema.prisma` using the README models.
- Add `Answer` unique constraint on `assessmentId + section + field`.
- Add `assessmentId` indexes to child tables and `assessmentId + type` index to `EvidenceItem`.
- Add `rejectionDueDate` and `rejectionOwner` to `Assessment`.
- Add `src/lib/db.ts` Prisma client helper.
- Add base app layout and dashboard page at `/`.
- Add assessment CRUD API routes:
  - `POST /api/assessments`
  - `GET /api/assessments`
  - `GET /api/assessments/:id`
  - `PATCH /api/assessments/:id`
- Restrict PATCH so clients cannot update derived risk, decision, status, or evidence requirement fields.
- Add intake page at `/assessments/new`.
- Add basic audit helper and `assessment_created` event.

Checks:

- Prisma generate succeeds.
- Initial migration succeeds.
- Creating and listing assessments works.
- PATCH only updates allowed assessment, answer, and reviewer-controlled evidence fields.
- Dashboard counts draft and decision statuses.

## Phase 2: Gemini Provider, LLM Health Endpoint, AI Intake

Goal: add server-side LLM plumbing and AI intake extraction.

Deliverables:

- Add LLM provider modules under `src/lib/llm`.
- Install and implement Gemini provider using `@google/genai`.
- Add prompt builder for AI intake.
- Add JSON parsing and Zod validation for LLM output.
- Add `GET /api/llm/health`.
- Do not call the LLM health route automatically on every page load; reserve it for diagnostics, settings/debug, or a single summary-generation check.
- Add `POST /api/assessments/ai-intake`.
- Store extracted fields as `Answer` records with state and confidence.
- Record `ai_intake_generated` audit event.

Checks:

- Missing Gemini API key returns safe health error.
- Configured provider returns provider/model/key/test-call status without exposing key.
- AI intake never sets final risk score, approval, status, or verified evidence.
- Vendor-claimed SOC 2/ISO is stored as `vendor_claimed`, not verified.

## Phase 3: Evidence Discovery and Draft Review

Goal: discover public assurance evidence and present a reviewer-editable draft.

Deliverables:

- Add `src/lib/discovery/safeFetch.ts`.
- Add `crawler.ts`, `evidenceClassifier.ts`, and `discoveryService.ts`.
- Add `POST /api/assessments/:id/run-evidence-discovery`.
- Fetch homepage, prioritized links, common paths, and optional trust centre URL.
- Store `EvidenceItem` records with status, confidence, source URL, snippet, notes, recommended action.
- Add draft builder under `src/lib/assessment/draftBuilder.ts`.
- Add draft review page at `/assessments/[id]/draft`.
- Allow reviewer corrections and confirmations through existing patch/answer APIs.
- Record `evidence_discovery_run` audit event.

Checks:

- Crawler resolves hostnames and blocks localhost, private, loopback, link-local, multicast, reserved, metadata, IPv6 unsafe ranges, IPv4-mapped private IPv6 addresses, and non-http protocols.
- Crawler re-checks protocol, hostname, and resolved IP after every redirect.
- Crawler respects timeout, redirect limit, response size limit, and max pages.
- Publicly claimed SOC 2/ISO remains unverified.
- Draft page clearly distinguishes AI-detected, inferred, vendor-claimed, publicly found, unknown, confirmed, verified, and not applicable values.

## Phase 4: Dynamic Questionnaire and Smart Evidence Requirements

Goal: make assessment depth adapt to access, data, integration, and criticality.

Deliverables:

- Add `src/config/questions.ts`.
- Add `src/config/questionRules.ts`.
- Add `src/lib/dynamicQuestions/ruleEvaluator.ts`.
- Add `src/lib/dynamicQuestions/questionEngine.ts`.
- Add `POST /api/assessments/:id/submit-answers`.
- Add dynamic wizard page at `/assessments/[id]/wizard`.
- Add `src/config/evidenceRules.ts`.
- Add `src/lib/evidence/smartEvidenceRequest.ts`.
- Add evidence profile page at `/assessments/[id]/evidence`.

Checks:

- No system access is mutually exclusive with and clears/prevents SSO/API/VPN/remote/admin/production/cloud/OT access.
- No company data is mutually exclusive with and clears/prevents all other data classifications.
- Hidden stale answers are not used for evidence requirements or risk scoring.
- SSO, API, privileged, sensitive-data, and high-criticality answers show relevant follow-ups.
- Low-risk public website does not require SOC 2 or ISO 27001.
- High-risk SaaS with sensitive data requires stronger evidence.
- Required evidence completion follows reviewer verification rules; public claims alone are not complete.
- For `SOC 2 Type II or ISO 27001`, one verified acceptable item satisfies the requirement unless a rule explicitly requires both.

## Phase 5: Risk Scoring and Report Generation

Goal: calculate explainable deterministic risk and render the risk snapshot report.

Deliverables:

- Add `src/config/riskRules.ts`.
- Add `src/lib/risk/riskScoring.ts`.
- Add `src/lib/assessment/assessmentLevel.ts`.
- Add `POST /api/assessments/:id/calculate-risk`.
- Store risk score, rating, assessment level, and `RiskFinding` records.
- Add `src/lib/report/reportBuilder.ts`.
- Add `src/lib/report/markdownReport.ts`.
- Add `GET /api/assessments/:id/report`.
- Add `GET /api/assessments/:id/export/markdown`.
- Add report page at `/assessments/[id]/report`.
- Record `risk_score_calculated` audit event.

Checks:

- LLM is not used for score, rating, level, or findings.
- Missing evidence increases score only when evidence is required.
- Access Risk uses the highest selected access risk plus small modifiers, capped at 45.
- Data Risk is capped at 35.
- Integration Risk uses explicit integration values and is capped at 30.
- Business Criticality Risk uses Low +0, Medium +10, High +20, Critical +30.
- Evidence Gap Risk is capped at 50 and Contract/Legal Gap Risk is capped at 40.
- Missing `SOC 2 Type II or ISO 27001` creates one evidence gap finding, not duplicate penalties.
- Risk bands are Low, Medium, High, Critical using README thresholds.
- Markdown export includes the required report sections.

## Phase 6: LLM Summary with Checkpoints

Goal: generate business-readable summary text while preserving deterministic decisions.

Deliverables:

- Add summary prompt builder to `src/lib/llm/prompts.ts`.
- Add checkpoint helper to `src/lib/llm/checkpoints.ts`.
- Add `POST /api/assessments/:id/generate-summary`.
- Save summary as `LlmOutput` with `checkpointsJson`.
- Show checkpoint timeline using `CheckpointTimeline`.
- Record `llm_summary_generated` audit event on success.

Required checkpoints:

- `assessment_loaded`
- `answers_loaded`
- `evidence_loaded`
- `risk_loaded_or_recalculated`
- `required_evidence_calculated`
- `llm_provider_selected`
- `api_key_configured`
- `gemini_health_check_passed`
- `summary_prompt_built`
- `gemini_response_received`
- `json_extracted`
- `json_parsed`
- `zod_validation_passed`
- `summary_saved`
- `summary_rendered`

Checks:

- Missing API key fails with safe checkpoint output.
- Summary generation does not repeatedly call LLM health in the same request.
- LLM summary cannot change risk score, rating, decision, or evidence verification.
- Summary distinguishes verified, claimed, publicly found, missing, not applicable, and unknown evidence.

## Phase 7: Approve/Reject Workflow and Basic Audit Log

Goal: enforce decision rules server-side and record basic audit history.

Deliverables:

- Add `src/lib/approval/approvalReadiness.ts`.
- Add `src/lib/approval/decisionService.ts`.
- Add `GET /api/assessments/:id/approval-readiness`.
- Add `POST /api/assessments/:id/decision`.
- Add `DecisionCard`, `ApprovalModal`, and `RejectModal`.
- Show decision controls on draft, wizard, and report pages.
- Expand audit helper if needed.

Checks:

- Approval readiness is recalculated server-side.
- Approval readiness uses evidence completion rules and either/or SOC 2 Type II versus ISO 27001 assurance logic.
- Missing mandatory items require acknowledgement and justification.
- Missing mandatory items with acknowledgement set `approved_with_exceptions`.
- Clean approvals set `approved`.
- Rejections require reason.
- Rejections can store remediation due date and owner.
- Audit events are written for approved, approved with exceptions, and rejected.

## Phase 8: ServiceNow/SNOW, Jira, Teams Placeholders

Goal: add safe integration stubs without heavy integration work.

Deliverables:

- Add `src/lib/integrations/serviceNow.ts`.
- Add `src/lib/integrations/snow.ts`.
- Add `src/lib/integrations/jira.ts`.
- Add `src/lib/integrations/teams.ts`.
- Add routes:
  - `POST /api/integrations/servicenow/push-result`
  - `POST /api/integrations/snow/push-result`
  - `POST /api/integrations/jira/create-actions`
  - `POST /api/integrations/teams/send-notification`

Checks:

- Empty env config returns safe mock success.
- No credentials, tokens, webhook URLs, or secrets are logged or returned.
- Payload validation prevents malformed requests.

## Phase 9: Build Fixes and Final MVP Checks

Goal: stabilize the MVP and confirm README acceptance criteria.

Deliverables:

- Run Prisma generate and migration.
- Run lint/type/build checks available in the project.
- Fix build errors.
- Manually exercise end-to-end assessment flow.
- Confirm no source exposes `GEMINI_API_KEY` to frontend.
- Confirm `.env.example` exists and `.env` is not committed.
- Confirm no heavy production security features were added.

Acceptance checks:

- User can create an assessment.
- AI generates a draft when Gemini is configured or shows safe error when not.
- Evidence discovery finds public assurance pages safely.
- Draft review and dynamic questions work.
- Evidence requirements are use-case-based.
- Risk score is deterministic and explainable.
- Summary works or shows checkpoint failure.
- Report and markdown export work.
- Approve/reject workflow works.
- Basic audit logs are created.
- Integration placeholders exist.
- `npm run build` passes.
