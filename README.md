# philips-hue CLI

> **Agent-native CLI for controlling Philips Hue smart lights.**
> Primary user: AI agents (Claude Code, Codex). Secondary user: humans at a terminal.
> This is a POC with a fully mocked Hue bridge — no real hardware required.

---

## Background

This project is a proof-of-concept for a category of CLI tooling that is emerging alongside AI coding agents: **agent-native CLIs** — command-line tools designed from the ground up to be consumed by LLMs, not just humans.

Key agent native conventions:

- `--format json` switches all output to a machine-readable envelope (`{ ok, data, error }`)
- stdout is always `jq`-safe — no progress logs, no color codes, no mixed output
- semantic exit codes (0 = success, 1 = auth error, 2 = not found, 3 = invalid input)
- a bundled `skills/` directory ships a `SKILL.md` that teaches agents how to use the CLI
- a `skills install` command copies the skill into the agent harness (`~/.claude/skills/`, `~/.codex/skills/`)

The goal of this POC is to demonstrate how this pattern applies to smart home / IoT device control, and to use it as a concrete artifact for evaluating the approach.

---

## Quick Start

**Prerequisites:** Node.js 20+, `jq`

```bash
git clone https://github.com/thomaspurves/philips-hue-cli.git
cd philips-hue-cli
npm install
# You'll see 5 moderate audit warnings — these are in the Vitest test runner,
# not the CLI itself. Run `npm audit --omit=dev` to confirm zero runtime vulns.
npm run build
npm link                          # puts `philips-hue` on your PATH
# If npm link fails with EACCES (system Node): sudo npm link
# nvm users won't need sudo.
```

**Authenticate and explore:**

```bash
philips-hue auth login
philips-hue devices list
philips-hue devices list --format json | jq '.data[] | {name, state}'
```

> **State** persists to `~/.philips-hue/mock-state.json` between runs.
> Reset to defaults: `philips-hue devices reset` — or `rm -rf ~/.philips-hue` for a completely clean slate.

**Control lights:**

```bash
# Single light
philips-hue devices set light-004 --state on

# All lights in a room
philips-hue devices set --room kitchen --state off --format json

# Everything off
philips-hue devices set --state off --format json
```

**Install the agent skill (Claude Code):**

```bash
philips-hue skills install
# Auto-detects ~/.claude/ → copies skill to ~/.claude/skills/philips-hue/
```

**Run the smoke test:**

```bash
bash scripts/smoke-test.sh
```

---

## Commands

| Command | Description |
|---------|-------------|
| `auth login` | Simulate OAuth, create credentials |
| `auth status` | Check auth state |
| `auth logout` | Delete credentials |
| `devices list [--room <name>]` | List all lights (optionally filtered by room) |
| `devices get <id>` | Get a single light |
| `devices set [<id>] [--room <name>] --state <on\|off>` | Control lights |
| `devices reset` | Reset all lights to default states |
| `version` | Show CLI version and schema version |
| `skills install [--path <dir>]` | Install SKILL.md into agent harness |
| `skills update [--path <dir>]` | Update an installed SKILL.md to the bundled version |

All commands accept `--format json` for machine-readable output.

### `devices set` modes

| Invocation | Scope |
|-----------|-------|
| `devices set light-001 --state on` | Single light by ID |
| `devices set --room bedroom --state off` | All lights in a room |
| `devices set --state on` | ALL lights |

---

## Mock Environment

The CLI simulates a home with 3 rooms and 8 lights. State persists to `~/.philips-hue/mock-state.json` between invocations.

| Light ID | Name | Room | Default |
|----------|------|------|---------|
| light-001 | Kitchen Counter | Kitchen | on |
| light-002 | Kitchen Ceiling | Kitchen | on |
| light-003 | Kitchen Strip | Kitchen | off |
| light-004 | Bedroom Lamp | Bedroom | off |
| light-005 | Bedroom Ceiling | Bedroom | off |
| light-006 | Living Room Lamp | Living Room | on |
| light-007 | Living Room Floor | Living Room | off |
| light-008 | Living Room TV | Living Room | on |

---

## JSON Output Contract

Every response includes `schema_version` and `cli_version` so consumers can assert compatibility before parsing `data`:

```json
{ "ok": true,  "data": <payload>, "error": null,  "schema_version": "1", "cli_version": "0.1.0" }
{ "ok": false, "data": null,      "error": "msg", "error_code": "AUTH_REQUIRED", "schema_version": "1", "cli_version": "0.1.0" }
```

`error_code` is present only on failure envelopes. Values: `AUTH_REQUIRED`, `NOT_FOUND`, `INVALID_INPUT`, `UPGRADE_REQUIRED`.

| Exit code | Meaning | `error_code` |
|-----------|---------|--------------|
| 0 | Success | *(not present)* |
| 1 | Not authenticated | `AUTH_REQUIRED` |
| 2 | Light or room not found | `NOT_FOUND` |
| 3 | Invalid input | `INVALID_INPUT` |
| 4 | CLI version no longer supported | `UPGRADE_REQUIRED` |

> **Agent tip:** Always check `.ok` or `$?` before piping `.data` to a jq transform —
> on error, `.data` is `null` and `.data[] | ...` will throw.

---

## Security & Non-Functional Notes

- **Credentials file** is written to `~/.philips-hue/credentials.json` with mode `0o600` (user-only read/write). The `chmod` call fails silently on platforms that don't support POSIX permissions (e.g. Windows NTFS).
- **`auth status` intentionally omits `access_token`** from its response — only `authenticated` and `user` are returned. Tests enforce this invariant.
- **`PHILIPS_HUE_HOME` env var** overrides the default `~/.philips-hue/` directory. Set it in CI or test harnesses for hermetic isolation:
  ```bash
  PHILIPS_HUE_HOME=$(mktemp -d) philips-hue auth login --format json
  ```

---

## Agent Integration

The `skills/philips-hue/SKILL.md` file follows the [agentskills.io](https://agentskills.io) open standard. It teaches agents:

- when to use the CLI (trigger phrases, use cases)
- the 4 core workflow patterns
- the output contract and exit codes
- gotchas (auth required first, exact room name matching, `null` data guard)

Install into your agent harness:

```bash
philips-hue skills install              # auto-detects Claude Code / Codex
philips-hue skills install --path <dir> # explicit target
```

---

## What's Implemented vs. Stubbed

### Implemented

- Full CLI skeleton (TypeScript strict, Commander.js, Node 20+)
- Auth commands with credential persistence and auth guard on all device commands
- `devices list`, `devices get`, `devices set` (single / room / all), idempotent state changes
- Mock state layer — 3 rooms, 8 lights, JSON persistence, case-insensitive room matching
- JSON output envelope enforced on every command; stdout always `jq`-clean
- `skills install` — harness auto-detection (Claude Code, Codex), recursive file copy
- `skills/philips-hue/SKILL.md` — agentskills.io spec, workflow patterns, gotchas
- 104 passing tests (Vitest) covering commands, exit codes, idempotency, harness detection, version enforcement
- TypeScript strict + Biome lint passing
- `scripts/smoke-test.sh` — hermetic end-to-end test

### Stubbed / Not Implemented

| Area | Status |
|------|--------|
| Real Hue bridge | No HTTP calls — all state is a local JSON file |
| OAuth | Simulated — `auth login` writes a mock token, no real handshake |
| Brightness / color / CT | Not implemented — only `on`/`off` |
| Scenes, schedules, timers | Not implemented |
| Bridge discovery (mDNS/SSDP) | Not implemented |
| `npm publish` | Package not published — requires local build |
| Binary distribution | No bundled binary — requires Node 20 on target machine |

---

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # biome check src/
npm test            # vitest run
npm run build       # tsc → dist/
bash scripts/smoke-test.sh
```

Set `PHILIPS_HUE_HOME` to an isolated directory to keep tests hermetic:

```bash
PHILIPS_HUE_HOME=$(mktemp -d) npx vitest run
```

---

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript 5.x strict
- **CLI framework:** Commander.js
- **Tests:** Vitest
- **Linting:** Biome
- **Output:** Human tables (default) + JSON envelope (`--format json`)
