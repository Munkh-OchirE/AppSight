# Application Risk Snapshot Planning Notes

This project follows the supplied Application Risk Snapshot README and the local planning documents. This root README records the targeted planning corrections that must be carried into implementation.

## Current Planning Corrections

### Prisma Schema

- `Answer` must support answer upserts by `assessmentId + section + field`:

```prisma
@@unique([assessmentId, section, field])
@@index([assessmentId])
```

- Child tables must include `@@index([assessmentId])`: `EvidenceItem`, `RiskFinding`, `LlmOutput`, `Report`, and `AuditLog`.
- `EvidenceItem` must also include `@@index([assessmentId, type])`.
- `Assessment` must include remediation tracking fields:

```prisma
rejectionDueDate DateTime?
rejectionOwner   String?
```

### Gemini Provider

- Use the current Gemini SDK:

```bash
npm install @google/genai
```

- Keep `GEMINI_MODEL="gemini-3.5-flash"` configurable.
- Gemini calls must stay server-side only. The frontend must never call Gemini directly or receive the API key.
- Do not call `/api/llm/health` automatically on every page load. Use it from diagnostics, settings/debug, or one manual check during summary generation.

### Evidence Discovery Safety

`safeFetch` must resolve hostnames and block unsafe resolved IPs before each request. It must re-check protocol, hostname, and resolved IP after every redirect.

Explicitly block:

- `localhost`
- `127.0.0.0/8`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`
- `169.254.169.254`
- `0.0.0.0`
- `::1`
- `fc00::/7`
- `fe80::/10`
- IPv4-mapped private IPv6 addresses
- `file://`, `ftp://`, `gopher://`, and all non-http protocols

Crawler behavior remains lightweight: no port scanning, brute forcing, fuzzing, vulnerability scanning, or aggressive crawling.

### Questionnaire Cleanup

- `No system access` is mutually exclusive with SSO, API, VPN, remote desktop, admin, production, cloud environment, and OT/digital systems access.
- `No company data` is mutually exclusive with public, internal, confidential, personal, financial, customer, and operationally sensitive data.
- Risk scoring and evidence requirements must use the final cleaned answer state, not hidden stale answers.

### Evidence Completion

- Where a rule requires `SOC 2 Type II or ISO 27001`, one verified acceptable item satisfies the requirement.
- Do not require both unless a specific rule says both are required.
- Do not apply duplicate penalties for missing both; create one finding such as `Missing independent security assurance evidence`.
- SOC 2 Type II is an assurance report/attestation, not a certificate.
- ISO 27001 is a certification.
- Publicly claimed SOC 2 Type II or ISO 27001 is not verified evidence.
- Required evidence is complete only when it is reviewer verified, uploaded by user and reviewer-confirmed, public documentation is explicitly allowed by the rule, or the reviewer marks it not applicable.

### Risk Scoring

- Access Risk uses the highest selected access risk plus small additive modifiers for additional selected access types.
- Category caps:
  - Access Risk max: 45
  - Data Risk max: 35
  - Integration Risk max: 30
  - Business Criticality Risk max: 30
  - Evidence Gap Risk max: 50
  - Contract/Legal Gap Risk max: 40
- Business criticality scoring:
  - Low: +0
  - Medium: +10
  - High: +20
  - Critical: +30
- Integration scoring:
  - No integration: +0
  - Identity integration: +5
  - API integration: +15
  - Network integration: +20
  - Data flow integration: +15
  - Logging/monitoring integration: +5
  - Privileged access integration: +25
  - Cloud integration: +25
  - Operational technology / digital systems integration: +30
  - Business process dependency: +20
- Risk bands remain:
  - 0-25: Low
  - 26-50: Medium
  - 51-75: High
  - 76+: Critical

### API Restrictions

`PATCH /api/assessments/:id` must not accept or trust derived fields: `riskScore`, `riskRating`, `assessmentLevel`, approved/rejected status values, decision fields, `isRequired`, or `requirementLevel`.

PATCH may update reviewer-controlled evidence fields only: `status`, `notes`, `verified`, `issueDate`, `expiryDate`, `scope`, `issuer`, `uploadedFileName`, and `recommendedAction`. The backend must verify evidence belongs to the assessment.

### Markdown Reports

For MVP, saving one `Report` row per markdown export is acceptable. Later, consider replacing the latest markdown report instead of creating duplicates.
