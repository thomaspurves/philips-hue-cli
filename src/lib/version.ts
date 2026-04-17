import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

export const CLI_VERSION: string = pkg.version;

// Bumped whenever the JSON envelope shape or command output contract changes
// in a backwards-incompatible way. Agents can assert schema_version === "1".
export const SCHEMA_VERSION = '1';
