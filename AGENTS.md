# AGENTS.md

## Project purpose

This repository contains the AppSight application. The goal is to keep the application stable, secure, maintainable, and easy to extend.

Codex should help with:
- Finding bugs
- Suggesting improvements
- Creating GitHub issues
- Implementing approved issues
- Improving tests and documentation
- Creating small, reviewable pull requests

## Important workflow rules

- Do not push directly to `main`.
- Do not merge pull requests.
- Work on one issue or task at a time.
- Keep changes small and focused.
- Do not rewrite unrelated code.
- Do not change application behaviour unless the task explicitly asks for it.
- Do not introduce new dependencies unless clearly justified.
- Do not delete files unless clearly required.
- Do not commit secrets, API keys, tokens, passwords, private keys, or `.env` files.

## Before making changes

Before editing code, Codex must:

1. Read this `AGENTS.md`.
2. Read the related GitHub issue or user request.
3. Inspect the relevant code.
4. Identify the root cause or implementation approach.
5. Confirm the change can be made safely and narrowly.

If the task is unclear, Codex should ask for clarification instead of guessing.

## Branch naming

Use this branch naming pattern:

```text
codex/issue-<issue-number>-short-description
