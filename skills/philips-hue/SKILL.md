---
name: philips-hue
description: >
  Control Philips Hue smart lights via the `philips-hue` CLI. Use this skill
  whenever the user wants to control lights, turn on/off lights, dim or brighten
  a room, check which lights are on, control smart home lighting, or do anything
  involving Hue or light control — even if they don't explicitly say "CLI" or
  "philips-hue". Trigger phrases: lights, hue, smart home, turn on, turn off,
  light control, what's on, dim the bedroom, set kitchen lights.
---

# philips-hue CLI

Agent-native CLI for Philips Hue (mocked bridge). Always pass `--format json`
so output is machine-readable. Parse responses with `jq`.

## Authentication

Required before any `devices` command.

```bash
philips-hue auth login --format json
# → {"ok":true,"data":{"authenticated":true,"user":"demo@philipshue.com"},"error":null}

philips-hue auth status --format json
philips-hue auth logout --format json
```

## Agent Workflow Patterns

### 1. Turn on all kitchen lights
```bash
philips-hue devices set --room kitchen --state on --format json
```

### 2. What lights are currently on?
```bash
philips-hue devices list --format json | jq '[.data[] | select(.state == "on")]'
```

### 3. Turn off everything
```bash
# No --room and no ID = all lights
philips-hue devices set --state off --format json
```

### 4. Is a specific light on?
```bash
philips-hue devices get light-004 --format json | jq '.data.state'
```

## Commands

### `devices list`
```
philips-hue devices list [--room <name>] [--format json]
```
Returns all lights (or filtered by room) with room metadata.

**JSON data:** array of `{id, name, type, room: {id, name}, state}`

```bash
# All lights
philips-hue devices list --format json

# Kitchen only
philips-hue devices list --room kitchen --format json
```

### `devices get <id>`
```
philips-hue devices get <light-id> [--format json]
```
Returns a single light.

**JSON data:** `{id, name, type, room: {id, name}, state}`

```bash
philips-hue devices get light-001 --format json
```

### `devices set`
```
philips-hue devices set [<id>] [--room <name>] --state <on|off> [--format json]
```
Three modes — mutually exclusive:

| Invocation | Scope |
|-----------|-------|
| `devices set light-001 --state on` | Single light by ID |
| `devices set --room bedroom --state off` | All lights in a room |
| `devices set --state on` | ALL lights |

**JSON data:** `{affected: [{id, name, state, changed}], summary: {count, changed}}`

- `changed: true` means state actually flipped; `false` means already in target state
- Setting a light to its current state is not an error (exit 0, `changed: false`)

### `auth` commands
```
philips-hue auth login   # creates credentials
philips-hue auth status  # check if authenticated
philips-hue auth logout  # removes credentials
```

### `skills install`
```
philips-hue skills install [--path <dir>]
```
Copies this SKILL.md to your agent harness's skill directory.
Auto-detects Claude Code (`~/.claude/`) and Codex (`~/.codex/`).

## Output Contract

Every command returns a JSON envelope when `--format json` is passed:

```json
{"ok": true,  "data": <payload>, "error": null}
{"ok": false, "data": null,      "error": "Human-readable message"}
```

JSON goes to **stdout only**. Errors also go to stderr (human-readable prefix).
The stdout stream is always `jq`-safe — no log lines, no progress messages.

### Exit codes
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Not authenticated |
| 2 | Light or room not found |
| 3 | Invalid input (bad flag, mutual exclusion) |

Check `$?` after each command when scripting.

## Light & Room Reference

| Light ID | Name | Room |
|----------|------|------|
| light-001 | Kitchen Counter | Kitchen |
| light-002 | Kitchen Ceiling | Kitchen |
| light-003 | Kitchen Strip | Kitchen |
| light-004 | Bedroom Lamp | Bedroom |
| light-005 | Bedroom Ceiling | Bedroom |
| light-006 | Living Room Lamp | Living Room |
| light-007 | Living Room Floor | Living Room |
| light-008 | Living Room TV | Living Room |

## Gotchas

- **Auth first.** Every `devices` command requires prior `auth login`. Missing
  credentials → exit 1 with `"Not authenticated. Run: philips-hue auth login"`.

- **Room names are case-insensitive** but must be exact: `kitchen`, `Kitchen`,
  `KITCHEN` all work; `kit` does not (no substring matching).

- **`--state` is `on` or `off`**, not `true`/`false`/`1`/`0`.

- **`devices set` with no ID and no `--room` affects ALL lights.** This is
  intentional — use it to reset the whole house in one shot.

- **Cannot combine ID and `--room`** in `devices set` → exit 3.

- **Always use `--format json`** when scripting. Human-mode output (tables,
  chalk color codes) is not machine-readable.

- **State is persisted** to `~/.philips-hue/mock-state.json` between invocations.
  A `devices set` call followed by `devices list` will reflect the change.

- **`changed: false` is not an error.** If a light is already in the requested
  state, the command succeeds (exit 0) and returns `changed: false` in the
  affected entry.

- **Guard against `null` data before piping to jq transforms.** On error,
  `.data` is `null` — filters like `.data[] | ...` will crash with
  `Cannot iterate over null`. Check `.ok` first:
  ```bash
  philips-hue devices list --format json \
    | jq 'if .ok then [.data[] | {id, name, state}] else error(.error) end'
  ```
  Or check `$?` after the CLI call before running any jq transform on the output.
