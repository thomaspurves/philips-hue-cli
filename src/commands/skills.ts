import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Command } from 'commander';
import { EXIT_NOT_FOUND } from '../lib/errors.js';
import { check, fail, printErr, printLine, success } from '../lib/output.js';

export function registerSkills(program: Command): void {
  const skills = program.command('skills').description('Manage agent skill integration.');

  skills
    .command('install')
    .description('Install the philips-hue SKILL.md into your agent harness.')
    .option('--path <dir>', 'explicit target directory (overrides auto-detection)')
    .action((opts: { path?: string }) => installAction(opts));
}

export function skillsSourceDir(): string {
  const file = fileURLToPath(import.meta.url);
  const projectRoot = resolve(dirname(file), '..', '..');
  return join(projectRoot, 'skills', 'philips-hue');
}

export type HarnessName = 'claude-code' | 'codex' | 'unknown';

export interface HarnessResult {
  harness: HarnessName;
  target: string;
}

export function detectHarness(home: string): HarnessResult {
  if (existsSync(join(home, '.claude'))) {
    return {
      harness: 'claude-code',
      target: join(home, '.claude', 'skills', 'philips-hue'),
    };
  }
  if (existsSync(join(home, '.codex'))) {
    return {
      harness: 'codex',
      target: join(home, '.codex', 'skills', 'philips-hue'),
    };
  }
  return {
    harness: 'unknown',
    target: join(home, '.claude', 'skills', 'philips-hue'),
  };
}

export function installAction(opts: { path?: string }, home = homedir()): never {
  const source = skillsSourceDir();

  if (!existsSync(source)) {
    return fail(`Skill source not found at: ${source}`, EXIT_NOT_FOUND);
  }

  let target: string;
  let harness: HarnessName;

  if (opts.path !== undefined) {
    target = opts.path;
    harness = 'unknown';
  } else {
    const detected = detectHarness(home);
    target = detected.target;
    harness = detected.harness;
  }

  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });

  if (harness === 'unknown' && opts.path === undefined) {
    printErr(`Could not detect agent harness. Copy manually:\n  cp -r ${source} ${target}`);
  }

  return success({ installed: true, target, harness }, () => {
    printLine(check(`Installed philips-hue skill to ${target}`));
    if (harness !== 'unknown') {
      printLine(`Harness: ${harness}`);
    }
  });
}
