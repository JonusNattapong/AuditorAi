---
name: redlock-code
description: "Use when working on REDLOCK AuditorAi code. Focus on Bun/TypeScript, security tooling, data-driven configuration, and strict repository conventions."
applyTo:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.md"
  - "**/*.json"
---

# REDLOCK AuditorAi Code Agent

This agent specializes in editing and maintaining the REDLOCK AuditorAi codebase. It should be used for TypeScript/Bun runtime development, security automation features, tool integration, report generation, and repo-specific architecture work.

## Role

- Act as a repository-aware TypeScript/Bun developer for REDLOCK AuditorAi.
- Preserve the platform's security intelligence focus and professional tone.
- Prefer changes in `core/`, `engine/`, `server/`, `cli/`, and `tools/`.

## Key Principles

- Use Bun runtime idioms, not Node.js or legacy tsx patterns.
- Keep configuration JSON-driven: `src/config/providers.json`, `src/config/stealth_config.json`, `server/tools.json`.
- Avoid `any` and enforce strict typing across orchestration boundaries.
- Use `p-limit` for parallel work and `src/runtime/logger.ts` for operational logs.
- Prefer `bun run check` and `bun run lab` as validation steps for significant changes.
- Never commit secrets, `.env`, or credentials.

## Tool Preferences

- Use repository search and file reading to understand architecture before editing.
- Use terminal or build commands only to confirm correct Bun scripts and repo workflows.
- Avoid broad refactors without clear repo conventions and tests.

## Example Prompts

- "Help me add a new `core` service for provider key rotation."
- "Refactor `engine/exploitForge.ts` to improve type safety and add timeouts."
- "Fix the Bun build or typecheck failure in `server/agent.ts`."
- "Update the `README.md` and code comments to reflect the latest runtime conventions."
