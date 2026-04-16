import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_AUTH, EXIT_INPUT, EXIT_NOT_FOUND, EXIT_OK } from './errors.js';
import { fail, getFormat, isJson, setFormat, success } from './output.js';

beforeEach(() => setFormat('human'));

describe('setFormat / getFormat / isJson', () => {
  it('defaults to human', () => {
    expect(getFormat()).toBe('human');
    expect(isJson()).toBe(false);
  });

  it('switches to json', () => {
    setFormat('json');
    expect(getFormat()).toBe('json');
    expect(isJson()).toBe(true);
  });
});

describe('exit code constants', () => {
  it('are correctly valued', () => {
    expect(EXIT_OK).toBe(0);
    expect(EXIT_AUTH).toBe(1);
    expect(EXIT_NOT_FOUND).toBe(2);
    expect(EXIT_INPUT).toBe(3);
  });
});

describe('JSON envelope shape', () => {
  it('success envelope has ok:true, data, error:null', () => {
    setFormat('json');
    const written: string[] = [];
    const exitCode: number[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      exitCode.push(code as number);
      throw new Error('process.exit called');
    });

    expect(() => success({ id: 'light-001', state: 'on' })).toThrow('process.exit called');
    const envelope = JSON.parse(written[0]);
    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual({ id: 'light-001', state: 'on' });
    expect(envelope.error).toBeNull();
    expect(exitCode[0]).toBe(0);

    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('fail envelope has ok:false, data:null, error message', () => {
    setFormat('json');
    const written: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    expect(() => fail('Not authenticated. Run: philips-hue auth login', EXIT_AUTH)).toThrow();
    const envelope = JSON.parse(written[0]);
    expect(envelope.ok).toBe(false);
    expect(envelope.data).toBeNull();
    expect(envelope.error).toBe('Not authenticated. Run: philips-hue auth login');

    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('human mode success does not write JSON envelope', () => {
    setFormat('human');
    const written: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    let rendererCalled = false;
    expect(() =>
      success({ id: 'x' }, () => {
        rendererCalled = true;
      }),
    ).toThrow('process.exit called');
    expect(rendererCalled).toBe(true);
    expect(written).toHaveLength(0);

    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
