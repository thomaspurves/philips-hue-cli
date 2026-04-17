import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EXIT_UPGRADE_REQUIRED } from './errors.js';
import { fail, printErr } from './output.js';
import { versionManifestPath } from './paths.js';
import { CLI_VERSION } from './version.js';

export interface VersionManifest {
  latest: string;
  min_required: string;
  min_required_reason?: string;
  upgrade_url?: string;
}

export interface CachedManifest extends VersionManifest {
  fetched_at: number; // Unix ms timestamp
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const UPGRADE_COMMAND = 'npm install -g @philipshue/cli';

export function compareSemver(a: string, b: string): number {
  const parts = (v: string) => v.split('.').map(Number);
  const [aMaj, aMin, aPatch] = parts(a);
  const [bMaj, bMin, bPatch] = parts(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPatch - bPatch;
}

export function readCachedManifest(): CachedManifest | null {
  try {
    return JSON.parse(readFileSync(versionManifestPath(), 'utf8')) as CachedManifest;
  } catch {
    return null;
  }
}

export function writeCachedManifest(manifest: CachedManifest): void {
  try {
    const path = versionManifestPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf8');
  } catch {
    // Non-critical: if we can't write the cache, proceed without it
  }
}

export function isCacheStale(cached: CachedManifest): boolean {
  return Date.now() - cached.fetched_at > CACHE_TTL_MS;
}

// Enforce a manifest against a given CLI version.
// Hard deprecation: exits with EXIT_UPGRADE_REQUIRED.
// Soft deprecation: prints a stderr notice and continues.
export function enforceManifest(manifest: VersionManifest, currentVersion: string): void {
  if (compareSemver(currentVersion, manifest.min_required) < 0) {
    const reason = manifest.min_required_reason ? ` ${manifest.min_required_reason}.` : '';
    const url = manifest.upgrade_url ? `\nDetails: ${manifest.upgrade_url}` : '';
    fail(
      `philips-hue ${currentVersion} is no longer supported (min required: ${manifest.min_required}).${reason}\nUpgrade: ${UPGRADE_COMMAND}${url}`,
      EXIT_UPGRADE_REQUIRED,
    );
  } else if (compareSemver(currentVersion, manifest.latest) < 0) {
    printErr(`Update available: ${currentVersion} → ${manifest.latest}. Run: ${UPGRADE_COMMAND}`);
  }
}

// Stub — returns null until a remote manifest endpoint exists.
// Replace with a real fetch(MANIFEST_URL) call when the backend is wired up.
export async function fetchManifest(): Promise<VersionManifest | null> {
  return null;
}

export async function checkVersion(): Promise<void> {
  let manifest: VersionManifest | null = null;
  const cached = readCachedManifest();

  if (cached && !isCacheStale(cached)) {
    manifest = cached;
  } else {
    const fetched = await fetchManifest();
    if (fetched) {
      manifest = fetched;
      writeCachedManifest({ ...fetched, fetched_at: Date.now() });
    } else if (cached) {
      // Use stale cache rather than silently skipping the check
      manifest = cached;
    }
  }

  if (manifest) {
    enforceManifest(manifest, CLI_VERSION);
  }
}
