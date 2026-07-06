# Application Risk Snapshot Architecture

## MVP Principles

Application Risk Snapshot is a lightweight, AI-assisted application and vendor risk assessment app for cyber security reviewers. The MVP should stay practical: deterministic backend rules make decisions, Gemini helps draft structured text, reviewers confirm evidence, and every risky workflow remains explainable.

Core constraints:

- Next.js, React, TypeScript, Tailwind CSS, Prisma, SQLite, Zod, Cheerio.
- Public hosted Gemini API only, called from backend routes.
- No local LLM, no frontend API keys, no LLM-driven approval or scoring.
- No heavy production security features beyond the README's MVP controls.
- Public evidence discovery is assurance-page discovery, not vulnerability scanning.

## High-Level Architecture

```text
Browser UI
  |
  | Next.js pages and React components
  v
Next.js API routes
  |
  +-- Zod request validation
  +-- Prisma data access
  +-- Audit log service
  +-- Deterministic rule engines
  +-- Server-side LLM provider
  +-- Safe public evidence discovery
  |
  v
SQLite database

External services:
  - Gemini public hosted API, server-side only
  - Public vendor websites, fetched through safeFetch only
  - ServiceNow/SNOW placeholder
  - Jira placeholder
  - Teams placeholder
```

Primary workflow:

1. User creates assessment from `/assessments/new`.
2. Backend stores initial assessment and records `assessment_created`.
3. AI intake extracts draft fields using Gemini and Zod validation.
4. Evidence discovery safely fetches public trust/security/compliance pages.
5. Draft builder combines user input, AI intake, and evidence findings.
6. Reviewer confirms or corrects the draft.
7. Dynamic wizard asks only relevant questions.
8. Smart evidence engine calculates required/recommended evidence.
9. Risk scoring engine calculates deterministic score and findings.
10. Gemini summary generates wording with checkpoints, without changing score or decision.
11. Report builder renders report and markdown export.
12. Approval readiness is recalculated server-side before approve/reject.
13. Decision service updates status and writes audit log.

## Frontend Pages

### `/`

Dashboard showing:

- Total assessments.
- Draft, in-review, approved, approved with exceptions, rejected counts.
- High-risk and critical-risk counts.
- Recent assessments table.
- Create New Assessment button.

### `/assessments/new`

New assessment intake page:

- Application name.
- Vendor name.
- Application/product URL.
- Vendor website.
- Optional trust centre/security page URL.
- Intended-use description.
- Business owner.
- Criticality, procurement stage, vendor status when known.
- Primary action: Generate Draft Assessment.

Expected behavior:

- Validate required fields client-side for usability and server-side with Zod.
- Create assessment, then call AI intake and navigate to draft review.
- Keep all Gemini calls behind backend routes.

### `/assessments/[id]/draft`

Draft review page:

- Shows vendor profile, access, data, evidence, contract/legal, integration, and criticality draft values.
- Displays field state labels: Detected, Inferred, Claimed, Publicly found, Unknown, Needs confirmation, User confirmed, Verified, Not applicable.
- Allows reviewer to correct and confirm values.
- Shows evidence discovery results and recommended actions.
- Includes Approve and Reject buttons, with backend readiness checks.

### `/assessments/[id]/wizard`

Dynamic questionnaire page:

- Sections: Vendor profile, Access, Data, Security assurance evidence, Contract/legal, Integration profile, Business process dependency.
- Shows/hides questions using `questionEngine` and `questionRules`.
- Persists answers through `/api/assessments/:id/submit-answers`.
- Provides calculate-risk and continue-to-report actions.
- Includes Approve and Reject buttons.

### `/assessments/[id]/evidence`

Evidence profile page:

- Lists discovered, claimed, uploaded placeholder, missing, required, recommended, not applicable, and verified evidence.
- Allows reviewer-controlled verification and not-applicable marking through assessment patch or answer/evidence update flows.
- Shows "publicly claimed is not verified" messaging for SOC 2 Type II and ISO 27001.

### `/assessments/[id]/report`

Risk snapshot report page:

- Shows risk score, risk rating, assessment level, decision status, summaries, evidence status, missing items, required controls, follow-up questions, and approval/rejection details.
- Shows LLM summary checkpoint failures when generation fails.
- Provides markdown export link.
- Includes Approve and Reject buttons.

## Backend API Routes

Core assessment routes:

- `POST /api/assessments`
- `GET /api/assessments`
- `GET /api/assessments/:id`
- `PATCH /api/assessments/:id`
- `POST /api/assessments/ai-intake`
- `POST /api/assessments/:id/run-evidence-discovery`
- `POST /api/assessments/:id/submit-answers`
- `POST /api/assessments/:id/calculate-risk`
- `POST /api/assessments/:id/generate-summary`
- `GET /api/assessments/:id/approval-readiness`
- `POST /api/assessments/:id/decision`
- `GET /api/assessments/:id/report`
- `GET /api/assessments/:id/export/markdown`

Platform routes:

- `GET /api/llm/health`
- `POST /api/integrations/servicenow/push-result`
- `POST /api/integrations/snow/push-result`
- `POST /api/integrations/jira/create-actions`
- `POST /api/integrations/teams/send-notification`

All mutating routes should:

- Validate request payloads with Zod.
- Load assessment server-side when route is assessment-scoped.
- Avoid trusting client-provided score, status, approval readiness, or evidence verification decisions without recalculation.
- Return safe user-facing errors.

## Prisma Database Design

Use SQLite through Prisma. Keep the schema close to the README:

- `Assessment`: root record for intake, status, risk, decision fields, timestamps.
- `Answer`: normalized confirmed/draft assessment answers by section and field.
- `EvidenceItem`: public or reviewer-provided evidence status and metadata.
- `RiskFinding`: deterministic scoring outputs with category, severity, score impact, reason, recommendation.
- `LlmOutput`: LLM input/output JSON and checkpoint JSON for traceability.
- `Report`: generated report artifacts, especially markdown.
- `AuditLog`: lightweight action history.

Relationship shape:

```text
Assessment 1--many Answer
Assessment 1--many EvidenceItem
Assessment 1--many RiskFinding
Assessment 1--many LlmOutput
Assessment 1--many Report
Assessment 1--many AuditLog
```

Implementation notes:

- Store structured JSON as strings for SQLite simplicity in MVP.
- Use `status` for lifecycle: `draft`, `in_review`, `approved`, `approved_with_exceptions`, `rejected`.
- Use `decisionStatus` for decision detail when needed.
- Store remediation tracking for rejected assessments with `rejectionDueDate DateTime?` and `rejectionOwner String?`.
- Store no secrets, API keys, tokens, or authorization headers.
- `sourceTextSnippet` should be short and sanitized; avoid storing full raw pages.
- Add `@@unique([assessmentId, section, field])` and `@@index([assessmentId])` to `Answer` so upserts are reliable.
- Add `@@index([assessmentId])` to all child tables: `EvidenceItem`, `RiskFinding`, `LlmOutput`, `Report`, and `AuditLog`.
- Add `@@index([assessmentId, type])` to `EvidenceItem` for requirement and discovery lookups.

## LLM Provider Design

LLM code should live under `src/lib/llm`.

Recommended modules:

- `index.ts`: provider selection by `LLM_PROVIDER`.
- `providers/gemini.ts`: Gemini implementation using `GEMINI_API_KEY` and `GEMINI_MODEL`.
- `prompts.ts`: prompt builders for AI intake and summary.
- `jsonParsing.ts`: safe JSON extraction/parsing helper.
- `checkpoints.ts`: checkpoint lifecycle helper for summary generation.

Provider interface:

```text
generateJson(prompt, schema, options) -> validated JSON result
healthCheck() -> provider/model/key/test-call status
```

Rules:

- Only backend routes call the provider.
- Implement Gemini through the current `@google/genai` SDK.
- API key is read from `.env` only.
- API key is never returned, logged, stored, or placed into audit records.
- `GEMINI_MODEL` remains configurable and defaults to `gemini-3.5-flash`.
- Gemini output must be parsed and validated with Zod.
- LLM can draft wording, follow-up questions, and summaries.
- LLM cannot calculate score, choose rating, approve/reject, mark evidence verified, or change assessment status.
- Do not call `/api/llm/health` automatically on every page load. Use it from a diagnostics action, a settings/debug page, or a single manual check during summary generation.

## Evidence Discovery Design

Evidence discovery code should live under `src/lib/discovery`.

Recommended modules:

- `safeFetch.ts`: URL/protocol/DNS/IP/timeout/redirect/size safety wrapper.
- `crawler.ts`: homepage link extraction and limited page fetching.
- `evidenceClassifier.ts`: keyword and pattern classifier.
- `discoveryService.ts`: orchestration and database persistence.

MVP flow:

1. Start from vendor homepage and optional trust centre URL.
2. Fetch only `http://` and `https://` URLs through `safeFetch`.
3. Extract links with Cheerio.
4. Prioritize links containing trust, security, compliance, privacy, legal, subprocessors, dpa, data-processing, iso, soc, status, vulnerability, disclosure, bug-bounty, ai, responsible-disclosure.
5. Try common paths: `/security`, `/trust`, `/compliance`, `/privacy`, `/legal`, `/subprocessors`, `/dpa`, `/status`.
6. Fetch up to `DISCOVERY_MAX_PAGES`.
7. Apply `DISCOVERY_TIMEOUT_MS`, redirect limit, response size limit, and clear user agent.
8. Classify evidence into `EvidenceItem` records.

Safety boundaries:

- Resolve the hostname before each request and block unsafe resolved IPs, not just unsafe URL strings.
- Re-check protocol, hostname, and resolved IP after every redirect.
- Block private, loopback, link-local, multicast, reserved, metadata, and IPv6 unsafe ranges.
- Explicitly block `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `0.0.0.0`, `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped private IPv6 addresses, `file://`, `ftp://`, `gopher://`, and all non-http protocols.
- Do not scan, attack, fuzz, brute force, port scan, or crawl aggressively.
- Treat vendor website content as untrusted.

Evidence statuses:

- `not_found`
- `publicly_claimed`
- `public_document_found`
- `requires_login_or_nda`
- `uploaded_by_user`
- `verified_by_reviewer`
- `expired`
- `not_applicable`
- `unknown`

Important distinction:

- SOC 2 Type II is an assurance report/attestation, not a certificate.
- ISO 27001 is a certification.
- Publicly claimed SOC 2 or ISO 27001 should usually become `needs_verification`, not verified.

## Dynamic Questionnaire Design

Question configuration should live under `src/config/questions.ts` and `src/config/questionRules.ts`. Evaluation should live under `src/lib/dynamicQuestions`.

Question model:

```text
id
section
field
label
type
options
requiredWhen
hiddenWhen
dependsOn
helpText
```

Rules:

- If `No system access`, hide all access-detail questions.
- `No system access` is mutually exclusive with SSO, API, VPN, remote desktop, admin, production, cloud environment, and OT/digital systems access. Selecting it must clear or prevent those options.
- If SSO access, show SAML/OIDC, Entra ID, MFA, SCIM, local accounts, RBAC, admin separation, deprovisioning.
- If API access, show connected system, permission level, auth method, credential storage/rotation, scopes, logging, signed webhooks, rate limiting.
- If VPN or remote desktop, show IP ranges, ports/protocols, time-bound access, approval, session logs, MFA, disablement.
- If admin, production, cloud, or OT/digital systems, show privileged logging, change control, emergency access, monitoring, business impact, risk acceptance.
- If `No company data`, hide DPA, subprocessor, residency, deletion, retention.
- `No company data` is mutually exclusive with public, internal, confidential, personal, financial, customer, and operationally sensitive data. Selecting it must clear or prevent those options.
- If sensitive data, show hosting, overseas transfer, subprocessors, retention, deletion, breach notification, DPA, AI/model training, export logging.
- If high or critical criticality, show business dependency, support, SLA, BCP/DR.
- Risk scoring and evidence requirements must use the final cleaned answer state, not hidden stale answers.

Answer precedence:

1. Reviewer-confirmed answer.
2. Reviewer-verified evidence.
3. Uploaded-by-user evidence.
4. Public document found.
5. Publicly claimed evidence.
6. AI detected.
7. AI inferred.
8. Unknown.

## Smart Evidence Requirement Design

Evidence rule config should live in `src/config/evidenceRules.ts`; engine should live in `src/lib/evidence/smartEvidenceRequest.ts`.

Engine inputs:

- Assessment core fields.
- Confirmed answers.
- Evidence items and statuses.
- Access profile.
- Data profile.
- Integration profile.
- Business criticality.

Engine outputs per evidence type:

- `required`
- `recommended`
- `optional`
- `not_applicable`
- `already_found`
- `needs_verification`
- `missing`

Core rules:

- Do not request SOC 2 or ISO 27001 from every vendor.
- No system access + no company data + low criticality means SOC 2, ISO 27001, and DPA are usually not applicable.
- Confidential, personal, customer, or financial data requires DPA, subprocessors, data deletion, breach notification, and independent security assurance evidence. Where the rule is `SOC 2 Type II or ISO 27001`, one verified acceptable item satisfies the requirement; do not require both unless a specific rule says so.
- API access requires API security documentation and usually API logging/credential rotation evidence.
- High or critical business criticality requires BCP/DR, support/SLA, and incident response evidence.
- Admin, production, cloud, or OT access requires logging evidence, incident cooperation, and right-to-audit as required/recommended.
- Missing evidence only increases risk when requirement level is `required`.
- Public claims usually become `needs_verification`.
- Required evidence is complete only when it is `verified_by_reviewer`, or `uploaded_by_user` and reviewer-confirmed, or `public_document_found` for a rule that explicitly allows public documentation, or marked `not_applicable` by the reviewer where appropriate.
- Required evidence is not complete when `status = publicly_claimed` and `verified = false`.
- Publicly claimed SOC 2 Type II or ISO 27001 is never complete without reviewer verification.

## Risk Scoring Design

Risk rule config should live in `src/config/riskRules.ts`; engine should live in `src/lib/risk/riskScoring.ts`.

Risk components:

- Access Risk.
- Data Risk.
- Integration Risk.
- Business Criticality Risk.
- Evidence Gap Risk.
- Contract/Legal Gap Risk.

Scoring characteristics:

- Deterministic and explainable.
- Backend-only.
- Produces score, band, assessment level, and `RiskFinding[]`.
- Replaces previous generated findings for the assessment when recalculated.
- Records `risk_score_calculated` audit action.
- Uses final cleaned answers after mutually exclusive options are resolved.
- Access Risk uses the highest selected access risk plus small additive modifiers for additional selected access types.
- Category caps prevent accidental score inflation.

Category caps:

- Access Risk max: 45.
- Data Risk max: 35.
- Integration Risk max: 30.
- Business Criticality Risk max: 30.
- Evidence Gap Risk max: 50.
- Contract/Legal Gap Risk max: 40.

Business criticality scoring:

- Low: +0.
- Medium: +10.
- High: +20.
- Critical: +30.

Integration scoring before cap:

- No integration: +0.
- Identity integration: +5.
- API integration: +15.
- Network integration: +20.
- Data flow integration: +15.
- Logging/monitoring integration: +5.
- Privileged access integration: +25.
- Cloud integration: +25.
- Operational technology / digital systems integration: +30.
- Business process dependency: +20.

Evidence gap scoring:

- Where the requirement is `SOC 2 Type II or ISO 27001`, one verified acceptable item satisfies it.
- Do not apply duplicate penalties for missing both SOC 2 Type II and ISO 27001 when the rule requires either one.
- Use one finding such as `Missing independent security assurance evidence`.

Risk bands:

- `0-25`: Low.
- `26-50`: Medium.
- `51-75`: High.
- `76+`: Critical.

Assessment levels:

- Level 1 - Light Review.
- Level 2 - Standard Review.
- Level 3 - Enhanced Review.
- Level 4 - Critical Review.

LLM summary may restate score and findings but must never calculate, override, or suppress them.

## Approval/Rejection Workflow

Approval code should live under `src/lib/approval`.

`approvalReadiness.ts` recalculates:

- Required evidence completion.
- Required evidence completion using reviewer verification rules, not public claims alone.
- Publicly claimed but unverified SOC 2 Type II and ISO 27001.
- `SOC 2 Type II or ISO 27001` as one independent assurance requirement where either verified acceptable item satisfies the rule.
- Required DPA, subprocessors, API security documentation, BCP/DR, incident response, MFA, deletion, breach notification, right-to-audit.
- Required integration questions.
- High-risk unknowns.
- Risk score and rating if stale.
- Recommended decision: `approve`, `approve_with_exceptions`, or `reject_review_required`.

`decisionService.ts` enforces:

- Frontend cannot directly set approved status.
- Backend recalculates approval readiness.
- Missing required items + no acknowledgement returns 400.
- Missing required items + acknowledgement sets `approved_with_exceptions`.
- No missing required items sets `approved`.
- Reject requires rejection reason and sets `rejected`.
- Rejection may also store `rejectionDueDate` and `rejectionOwner` for remediation tracking.
- Actor is `local-demo-user` for MVP.
- Decision timestamp is stored.
- Audit log is recorded.

Decision buttons appear on draft, wizard, and report pages.

## Basic Audit Log

Audit service should live in `src/lib/audit/auditLog.ts`.

Actions:

- `assessment_created`
- `ai_intake_generated`
- `evidence_discovery_run`
- `risk_score_calculated`
- `llm_summary_generated`
- `assessment_approved`
- `assessment_approved_with_exceptions`
- `assessment_rejected`

Fields:

- `assessmentId`
- `action`
- `actor`
- `detailsJson`
- `createdAt`

Rules:

- Keep logs lightweight.
- Store only safe operational details.
- Do not store secrets, API keys, auth headers, full raw documents, or sensitive prompt internals.

## Report Design

Report builder should live under `src/lib/report`.

Report includes:

- Application name, vendor name, owner, procurement stage, criticality.
- Assessment level, risk score, risk rating, decision status.
- Executive summary.
- Key risk drivers.
- Access, data, and integration summaries.
- Evidence summary.
- Required, missing, and not applicable evidence.
- Contract/legal gaps.
- Required controls.
- Vendor follow-up questions.
- Approval recommendation wording.
- Approval/rejection details.

Markdown export should be generated server-side and returned as `text/markdown` or a downloadable markdown response. For MVP, saving one `Report` row per markdown export is acceptable. Later, consider replacing the latest markdown report instead of creating duplicates.

## Integration Placeholders

Keep integrations simple for MVP.

ServiceNow/SNOW:

- Routes: `/api/integrations/servicenow/push-result`, `/api/integrations/snow/push-result`.
- Read env config.
- If env is empty, return safe mock success.
- Do not hardcode or log credentials.

Jira:

- Route: `/api/integrations/jira/create-actions`.
- Purpose is remediation tasks for missing evidence, controls, and follow-ups.
- If env is empty, return safe mock issue keys.
- Do not log token.

Teams:

- Route: `/api/integrations/teams/send-notification`.
- Purpose is approval/rejection notification.
- If webhook is empty, return safe mock success.
- Do not log webhook URL.
