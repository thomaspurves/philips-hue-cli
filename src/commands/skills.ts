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

  skills
    .command('update')
    .description('Update an already-installed SKILL.md to the bundled version.')
    .option('--path <dir>', 'explicit target directory (overrides auto-detection)')
    .action((opts: { path?: string }) => updateAction(opts));
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

function resolveSkillTarget(
  opts: { path?: string },
  home: string,
): { source: string; target: string; harness: HarnessName } {
  const source = skillsSourceDir();
  if (!existsSync(source)) {
    return fail(`Skill source not found at: ${source}`, EXIT_NOT_FOUND);
  }
  if (opts.path !== undefined) {
    return { source, target: opts.path, harness: 'unknown' };
  }
  const { target, harness } = detectHarness(home);
  return { source, target, harness };
}

function copySkill(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

export function installAction(opts: { path?: string }, home = homedir()): never {
  const { source, target, harness } = resolveSkillTarget(opts, home);
  copySkill(source, target);
  if (harness === 'unknown' && opts.path === undefined) {
    printErr(`Could not detect agent harness. Copy manually:\n  cp -r ${source} ${target}`);
  }
  return success({ installed: true, target, harness }, () => {
    printLine(check(`Installed philips-hue skill to ${target}`));
    if (harness !== 'unknown') printLine(`Harness: ${harness}`);
  });
}

export function updateAction(opts: { path?: string }, home = homedir()): never {
  const { source, target, harness } = resolveSkillTarget(opts, home);
  copySkill(source, target);
  if (harness === 'unknown' && opts.path === undefined) {
    printErr(`Could not detect agent harness. Copy manually:\n  cp -r ${source} ${target}`);
  }
  return success({ updated: true, target, harness }, () => {
    printLine(check(`Updated philips-hue skill at ${target}`));
    if (harness !== 'unknown') printLine(`Harness: ${harness}`);
  });
}
