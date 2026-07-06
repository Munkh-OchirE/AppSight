# Application Risk Snapshot Phase Checklist

Use this checklist during coding. Complete each phase before moving on unless a blocker requires a small supporting change from a later phase.

## Phase 1: Project Setup, Database, Dashboard, Assessment CRUD

- [ ] Confirm project uses Next.js, React, TypeScript, Tailwind CSS.
- [ ] Add Prisma and SQLite.
- [ ] Create `.env.example` with README variables.
- [ ] Ensure `.env` is ignored.
- [ ] Create `prisma/schema.prisma` with README models.
- [ ] Add `@@unique([assessmentId, section, field])` and `@@index([assessmentId])` to `Answer`.
- [ ] Add `@@index([assessmentId])` to `EvidenceItem`, `RiskFinding`, `LlmOutput`, `Report`, and `AuditLog`.
- [ ] Add `@@index([assessmentId, type])` to `EvidenceItem`.
- [ ] Add `rejectionDueDate` and `rejectionOwner` to `Assessment`.
- [ ] Add Prisma client helper at `src/lib/db.ts`.
- [ ] Add Zod schemas for assessment create/update.
- [ ] Implement `POST /api/assessments`.
- [ ] Implement `GET /api/assessments`.
- [ ] Implement `GET /api/assessments/:id`.
- [ ] Implement `PATCH /api/assessments/:id`.
- [ ] Ensure PATCH rejects derived fields: `riskScore`, `riskRating`, `assessmentLevel`, approved/rejected status values, decision fields, `isRequired`, and `requirementLevel`.
- [ ] Ensure PATCH updates only reviewer-controlled evidence fields and verifies evidence ownership.
- [ ] Add dashboard page at `/`.
- [ ] Add intake page at `/assessments/new`.
- [ ] Add basic audit log helper.
- [ ] Record `assessment_created`.
- [ ] Run Prisma generate.
- [ ] Run migration.
- [ ] Manually create and list an assessment.

## Phase 2: Gemini Provider, LLM Health Endpoint, AI Intake

- [ ] Install Gemini SDK with `npm install @google/genai`.
- [ ] Add `src/lib/llm/index.ts`.
- [ ] Add `src/lib/llm/providers/gemini.ts`.
- [ ] Add `src/lib/llm/prompts.ts`.
- [ ] Add `src/lib/llm/jsonParsing.ts`.
- [ ] Add Zod schema for AI intake output.
- [ ] Implement `GET /api/llm/health`.
- [ ] Ensure `/api/llm/health` is not called automatically on every page load.
- [ ] Implement `POST /api/assessments/ai-intake`.
- [ ] Store AI intake fields as answers with state and confidence.
- [ ] Store vendor-claimed evidence as claimed, not verified.
- [ ] Record `ai_intake_generated`.
- [ ] Confirm missing Gemini key returns safe error.
- [ ] Confirm frontend never receives or references the Gemini API key.

## Phase 3: Evidence Discovery and Draft Review

- [ ] Add `src/lib/discovery/safeFetch.ts`.
- [ ] Block non-http protocols.
- [ ] Block localhost and private IP ranges.
- [ ] Block `169.254.169.254`.
- [ ] Resolve hostnames before each request and block unsafe resolved IPs.
- [ ] Block loopback, link-local, multicast, reserved, metadata, IPv6 unsafe ranges, and IPv4-mapped private IPv6 addresses.
- [ ] Re-check protocol, hostname, and resolved IP after every redirect.
- [ ] Explicitly block `0.0.0.0`, `::1`, `fc00::/7`, `fe80::/10`, `file://`, `ftp://`, and `gopher://`.
- [ ] Add timeout, redirect limit, response size limit, max pages.
- [ ] Add clear user-agent string.
- [ ] Add `src/lib/discovery/crawler.ts`.
- [ ] Add `src/lib/discovery/evidenceClassifier.ts`.
- [ ] Add `src/lib/discovery/discoveryService.ts`.
- [ ] Implement `POST /api/assessments/:id/run-evidence-discovery`.
- [ ] Store discovered evidence as `EvidenceItem`.
- [ ] Record `evidence_discovery_run`.
- [ ] Add draft builder.
- [ ] Add `/assessments/[id]/draft`.
- [ ] Show field states clearly.
- [ ] Allow reviewer correction and confirmation.
- [ ] Confirm public SOC 2/ISO claims are not verified.

## Phase 4: Dynamic Questionnaire and Smart Evidence Requirements

- [ ] Add `src/config/questions.ts`.
- [ ] Add `src/config/questionRules.ts`.
- [ ] Add `src/lib/dynamicQuestions/ruleEvaluator.ts`.
- [ ] Add `src/lib/dynamicQuestions/questionEngine.ts`.
- [ ] Implement `POST /api/assessments/:id/submit-answers`.
- [ ] Add `/assessments/[id]/wizard`.
- [ ] Add `src/config/evidenceRules.ts`.
- [ ] Add `src/lib/evidence/smartEvidenceRequest.ts`.
- [ ] Add `/assessments/[id]/evidence`.
- [ ] Verify no system access hides access detail questions.
- [ ] Verify no system access clears/prevents all other access options.
- [ ] Verify no company data hides DPA/subprocessor/data questions.
- [ ] Verify no company data clears/prevents all other data classifications.
- [ ] Verify hidden stale answers are excluded from risk and evidence calculations.
- [ ] Verify SSO shows identity questions.
- [ ] Verify API shows API and data-flow questions.
- [ ] Verify privileged access shows logging/change/monitoring questions.
- [ ] Verify high/critical criticality shows support/SLA/BCP/DR questions.
- [ ] Verify low-risk public website does not require SOC 2/ISO.
- [ ] Verify sensitive data requires DPA and stronger evidence.
- [ ] Verify public SOC 2/ISO claims are not complete without reviewer verification.
- [ ] Verify one verified SOC 2 Type II or ISO 27001 item satisfies an either/or assurance requirement.

## Phase 5: Risk Scoring and Report Generation

- [x] Add `src/config/riskRules.ts`.
- [x] Add `src/lib/risk/riskScoring.ts`.
- [x] Add `src/lib/assessment/assessmentLevel.ts`.
- [x] Implement `POST /api/assessments/:id/calculate-risk`.
- [x] Replace old risk findings on recalculation.
- [x] Update assessment risk score, rating, and level.
- [x] Record `risk_score_calculated`.
- [x] Add `src/lib/report/reportBuilder.ts`.
- [x] Add `src/lib/report/markdownReport.ts`.
- [x] Implement `GET /api/assessments/:id/report`.
- [x] Implement `GET /api/assessments/:id/export/markdown`.
- [x] Add `/assessments/[id]/report`.
- [x] Verify LLM is not used for scoring.
- [x] Verify missing required evidence affects score.
- [x] Verify missing non-required evidence does not affect score.
- [x] Verify Access Risk uses highest selected access risk plus small modifiers and caps at 45.
- [x] Verify Data Risk caps at 35.
- [x] Verify Integration Risk uses explicit values and caps at 30.
- [x] Verify Business Criticality Risk uses Low +0, Medium +10, High +20, Critical +30.
- [x] Verify Evidence Gap Risk caps at 50 and Contract/Legal Gap Risk caps at 40.
- [x] Verify missing SOC 2 Type II or ISO 27001 creates one evidence gap finding when either item satisfies the requirement.
- [x] Verify risk bands match README.
- [x] Verify markdown export includes required sections.

## Phase 6: LLM Summary with Checkpoints

- [x] Add summary prompt.
- [x] Add summary output Zod schema.
- [x] Add checkpoint helper.
- [x] Implement `POST /api/assessments/:id/generate-summary`.
- [x] Include all required checkpoints.
- [x] Save summary output and checkpoint JSON.
- [x] Add `CheckpointTimeline` UI.
- [x] Record `llm_summary_generated` on success.
- [x] Verify missing key shows safe checkpoint failure.
- [x] Verify summary generation avoids repeated LLM health calls in one request.
- [x] Verify summary cannot change score, rating, decision, or verification.
- [x] Verify summary distinguishes verified, claimed, publicly found, missing, not applicable, and unknown evidence.

## Phase 7: Approve/Reject Workflow and Basic Audit Log

- [x] Add `src/lib/approval/approvalReadiness.ts`.
- [x] Add `src/lib/approval/decisionService.ts`.
- [x] Implement `GET /api/assessments/:id/approval-readiness`.
- [x] Implement `POST /api/assessments/:id/decision`.
- [x] Add `DecisionCard`.
- [x] Add `ApprovalModal`.
- [x] Add `RejectModal`.
- [x] Show decision controls on draft page.
- [x] Show decision controls on wizard page.
- [x] Show decision controls on report page.
- [x] Require approval justification.
- [x] Require exception acknowledgement when required items are incomplete.
- [x] Require rejection reason.
- [x] Store rejection due date and owner when provided.
- [x] Store decision timestamp and `local-demo-user`.
- [x] Record approval/rejection audit events.
- [x] Verify frontend cannot directly set approved/rejected status.
- [x] Verify approval readiness uses evidence completion rules and either/or SOC 2 Type II versus ISO 27001 assurance logic.

## Phase 8: ServiceNow/SNOW, Jira, Teams Placeholders

- [x] Add `src/lib/integrations/serviceNow.ts`.
- [x] Add `src/lib/integrations/snow.ts`.
- [x] Add `src/lib/integrations/jira.ts`.
- [x] Add `src/lib/integrations/teams.ts`.
- [x] Implement `POST /api/integrations/servicenow/push-result`.
- [x] Implement `POST /api/integrations/snow/push-result`.
- [x] Implement `POST /api/integrations/jira/create-actions`.
- [x] Implement `POST /api/integrations/teams/send-notification`.
- [x] Return mock success when env config is empty.
- [x] Validate payloads with Zod.
- [x] Confirm no tokens, credentials, or webhook URLs are logged or returned.

## Phase 9: Build Fixes and Final MVP Checks

- [x] Run `npx prisma generate`.
- [x] Run `npx prisma migrate dev --name init`.
- [x] Run available lint/type checks.
- [x] Run `npm run build`.
- [x] Fix all build errors.
- [x] Manually test full assessment creation flow.
- [x] Manually test AI intake with missing key and configured key if available.
- [x] Manually test evidence discovery against a safe public vendor site.
- [x] Manually test draft confirmation.
- [x] Manually test dynamic wizard show/hide rules.
- [x] Manually test smart evidence requirements.
- [x] Manually test deterministic risk calculation.
- [x] Manually test report page.
- [x] Manually test markdown export.
- [x] Manually test approve cleanly.
- [x] Manually test approved with exceptions.
- [x] Manually test reject.
- [x] Manually verify audit log entries.
- [x] Manually verify integration placeholders.
- [x] Search code for accidental `GEMINI_API_KEY` frontend exposure.
- [x] Confirm no heavy production security features were added.
- [x] Confirm no `node_modules` inspection or source churn unrelated to MVP.
