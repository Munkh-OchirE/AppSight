# AGENTS.md

## Project purpose

This repository contains the application. Codex may help maintain it by finding real issues, fixing bugs, improving tests, improving documentation, and implementing small low-risk improvements.

## Autonomous maintenance rules

Codex may autonomously find and fix only one low-risk issue per run.

Allowed autonomous work:
- Small bug fixes
- Broken tests
- Lint/type/build fixes
- Documentation fixes
- Minor UI fixes
- Small validation improvements
- Small refactors with tests

Do not autonomously change:
- Authentication
- Authorization
- Secrets or environment variable handling
- Database migrations
- Destructive data logic
- Deployment infrastructure
- Payment or billing logic
- Security controls
- Encryption
- Large architecture
- Public API contracts

If a finding touches a restricted area, report it only and do not modify code.

## Issue discovery rules

When asked to find and fix an issue:
1. Inspect the repository.
2. Identify real issues based on code evidence.
3. Choose only one issue per run.
4. Prefer the smallest safe fix.
5. Do not invent vague improvements.
6. Do not make broad refactors.
7. Do not change unrelated files.

## Testing

Before finishing, run:

```bash
bash .github/scripts/codex-test.sh

## Pull request rules

Every PR must include:

- Summary
- Issue found
- Evidence
- What changed
- Tests run
- Risk level
- Files changed
- Anything that needs human review

## Merge rule

Codex must never merge pull requests.

Human merge is required.

Codex may:
- Create branches
- Commit changes to Codex branches
- Open pull requests
- Update pull requests after review or failed tests
- Comment on pull requests

Codex must not:
- Push directly to main
- Merge pull requests
- Enable auto-merge
- Delete protected branches

## Definition of done

A task is done only when:

- The issue is real and evidence-based.
- The fix is small and focused.
- Tests/build/lint pass where available.
- No secrets are committed.
- No restricted areas were changed.
- A pull request is ready for human review.
