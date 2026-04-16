import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach } from 'vitest';

beforeEach(() => {
  process.env.PHILIPS_HUE_HOME = mkdtempSync(join(tmpdir(), 'philips-hue-test-'));
});
