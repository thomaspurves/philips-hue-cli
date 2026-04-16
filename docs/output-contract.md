# Output Contract

## JSON envelope (--format json)
Every command returns:
```json
{
  "ok": true,
  "data": { ... },
  "error": null
}
```

On error:
```json
{
  "ok": false,
  "data": null,
  "error": "Human-readable error message"
}
```

## Exit codes
| Code | Meaning             | When                                    |
|------|---------------------|-----------------------------------------|
| 0    | Success             | Command completed normally              |
| 1    | Auth error          | Not logged in, token expired            |
| 2    | Device unreachable  | Light/room not found in mock state      |
| 3    | Invalid input       | Bad flag values, missing required args  |

## Human-readable output (default)
- `devices list`: ASCII table with columns ID, NAME, TYPE, ROOM, STATUS
- `devices get <id>`: Key-value pairs, one per line
- `devices set`: "✓ Set <name> to <state>" per light affected, summary line at end
- `auth login`: Step-by-step status messages with ✓/✗ prefixes

## Idempotency
- `devices set light-001 --state on` when already on: succeeds (exit 0),
  returns current state, does not error
- Response includes `"changed": true|false` to indicate whether state actually changed
