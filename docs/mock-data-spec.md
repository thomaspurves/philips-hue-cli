# Mock Hue Bridge Data Specification

The mock simulates a home with 3 rooms and 8 lights.

## Rooms
| Room ID     | Name     | Lights                                    |
|-------------|----------|-------------------------------------------|
| room-001    | Kitchen  | light-001, light-002, light-003           |
| room-002    | Bedroom  | light-004, light-005                      |
| room-003    | Living Room | light-006, light-007, light-008        |

## Lights
| Light ID    | Name              | Type           | Room      | Default State |
|-------------|-------------------|----------------|-----------|---------------|
| light-001   | Kitchen Counter   | Hue White      | Kitchen   | on            |
| light-002   | Kitchen Ceiling   | Hue White      | Kitchen   | on            |
| light-003   | Kitchen Strip     | Hue Lightstrip | Kitchen   | off           |
| light-004   | Bedroom Lamp      | Hue Color      | Bedroom   | off           |
| light-005   | Bedroom Ceiling   | Hue White      | Bedroom   | off           |
| light-006   | Living Room Lamp  | Hue White      | Living Room | on          |
| light-007   | Living Room Floor | Hue Color      | Living Room | off         |
| light-008   | Living Room TV    | Hue Lightstrip | Living Room | on          |

## State persistence
Mock state is stored at `~/.philips-hue/mock-state.json`.
On first run, if the file doesn't exist, initialize from defaults above.
All `set` commands mutate this file and return the new state.

## Auth simulation
`auth login` creates `~/.philips-hue/credentials.json` with:
```json
{ "access_token": "mock-token-xxx", "authenticated": true, "user": "demo@philipshue.com" }
```
All other commands check this file exists before executing.
If missing, exit with code 1 and error: "Not authenticated. Run: philips-hue auth login"
