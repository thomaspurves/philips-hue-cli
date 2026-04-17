import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFormat } from '../lib/output.js';
import { loginAction, logoutAction, statusAction } from './auth.js';

function captureExit() {
  const stdout: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
    stdout.push(String(c));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('exit');
  });
  return {
    stdout,
    restore() {
      stdoutSpy.mockRestore();
      exitSpy.mockRestore();
    },
  };
}

function jsonLine(lines: string[]): Record<string, unknown> {
  const line = lines.find((l) => l.trim().startsWith('{'));
  if (!line) throw new Error(`No JSON line found in: ${JSON.stringify(lines)}`);
  return JSON.parse(line) as Record<string, unknown>;
}

beforeEach(() => setFormat('human'));

describe('auth login', () => {
  it('writes credentials and returns success envelope (json)', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => loginAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    expect((env.data as Record<string, unknown>).authenticated).toBe(true);
    expect((env.data as Record<string, unknown>).user).toBe('demo@philipshue.com');
    expect(env.error).toBeNull();
    cap.restore();
  });

  it('token matches expected format', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => loginAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const token = (env.data as Record<string, unknown>).access_token as string;
    expect(token).toMatch(/^mock-token-[0-9a-f]{16}$/);
    cap.restore();
  });

  it('human mode prints check mark', () => {
    setFormat('human');
    const cap = captureExit();
    expect(() => loginAction()).toThrow('exit');
    const out = cap.stdout.join('');
    expect(out).toContain('Authenticated as demo@philipshue.com');
    cap.restore();
  });
});

describe('auth status', () => {
  it('returns error when not authenticated (json)', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => statusAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    expect(env.error).toContain('Not authenticated');
    cap.restore();
  });

  it('returns authenticated status after login (json)', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => loginAction()).toThrow('exit');
    cap.stdout.length = 0;
    expect(() => statusAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    expect((env.data as Record<string, unknown>).authenticated).toBe(true);
    cap.restore();
  });

  it('status response does NOT include access_token', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => loginAction()).toThrow('exit');
    cap.stdout.length = 0;
    expect(() => statusAction()).toThrow('exit');
    const data = jsonLine(cap.stdout).data as Record<string, unknown>;
    expect(data).not.toHaveProperty('access_token');
    expect(data).toHaveProperty('authenticated');
    expect(data).toHaveProperty('user');
    cap.restore();
  });

  it('status error envelope includes error_code AUTH_REQUIRED', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => statusAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.error_code).toBe('AUTH_REQUIRED');
    cap.restore();
  });
});

describe('auth logout', () => {
  it('always returns success (json)', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => logoutAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    expect((env.data as Record<string, unknown>).authenticated).toBe(false);
    cap.restore();
  });

  it('after logout, status returns error', () => {
    setFormat('json');
    // login → logout → status
    const cap = captureExit();
    expect(() => loginAction()).toThrow('exit');
    cap.stdout.length = 0;
    expect(() => logoutAction()).toThrow('exit');
    cap.stdout.length = 0;
    expect(() => statusAction()).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    cap.restore();
  });
});
