# Philips Hue CLI — Agent-Native Smart Light Control

## What this is
A CLI (`philips-hue`) that lets AI agents control Philips Hue smart lights.
The PRIMARY user is an AI agent (Claude Code, Codex, OpenClaw) running
bash commands. The secondary user is a human at a terminal. This is a POC
with a stubbed/mocked Hue backend — no real API calls.

## Tech stack
- Runtime: Node.js 20+ (TypeScript 5.x, strict mode)
- CLI framework: Commander.js
- Output: Human-friendly tables by default, JSON with `--format json`
- Package: npm (scoped @philipshue/cli)
- Tests: Vitest
- Linting: Biome

## Architecture
- `src/commands/`   — one file per command group (auth, devices)
- `src/lib/`        — business logic, mock data layer, output formatting
- `src/mock/`       — stubbed Hue bridge data (rooms, lights, states)
- `skills/`         — SKILL.md for agent integration (ships with the CLI)
- `bin/philips-hue` — entry point

## Key design decisions
- `--format json` is a FIRST-CLASS feature, not an afterthought
- All commands return structured JSON with consistent envelope:
  `{ "ok": bool, "data": ..., "error": string|null }`
- Exit codes are semantic: 0=success, 1=auth-error, 2=device-unreachable, 3=invalid-input
- Device list includes room/group metadata (not just flat names)
- `devices set` accepts `--room <name>` for bulk operations
- `devices set` returns the resulting state, not just "OK"
- The mock layer is a simple JSON file that persists to ~/.philips-hue/mock-state.json

## Commands to verify your work
- Type check: `npx tsc --noEmit`
- Lint: `npx biome check src/`
- Test: `npx vitest run`
- Manual smoke test: `node bin/philips-hue devices list --format json | jq .`

## Workflow
- Write tests alongside implementation (not after)
- Run typecheck after every file change
- When creating the SKILL.md in skills/, follow the agentskills.io spec:
  keep it under 500 lines, use YAML frontmatter, include gotchas section
- Prefer small composable functions over large command handlers

## Prohibited
- No `any` types
- No default exports (named exports only)
- No console.log for debugging (use the structured output helpers)
- Never put mock data inline in command files — always import from src/mock/
- Do not create an MCP server — this is CLI-only by design
