# SKILL.md Specification for the Hue CLI

The skills/ directory ships with the npm package. It contains a SKILL.md
that teaches AI agents how to use the CLI. This follows the agentskills.io
open standard.

## Requirements
- YAML frontmatter with `name` and `description`
- Description must include trigger phrases: "lights", "hue", "turn on",
  "turn off", "smart home", "light control"
- Under 500 lines / 5000 tokens
- Must include: available commands, common workflows, error handling,
  gotchas section
- Must NOT include: general knowledge about what lights are, HTTP basics,
  explanation of CLI concepts

## Agent workflow patterns to document
1. "Turn on all kitchen lights" → `devices set --room kitchen --state on --format json`
2. "What lights are on?" → `devices list --format json` then filter
3. "Turn off everything" → `devices set --state off --format json` (no room = all)
4. "Is the bedroom light on?" → `devices get light-004 --format json`

## Progressive disclosure
If error handling gets complex, move detailed error reference to
`skills/references/error-codes.md` and reference it from SKILL.md:
"See references/error-codes.md if the CLI returns a non-zero exit code"
