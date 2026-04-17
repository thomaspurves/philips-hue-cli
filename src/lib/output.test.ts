import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_AUTH, EXIT_INPUT, EXIT_NOT_FOUND, EXIT_OK } from './errors.js';
import { fail, getFormat, isJson, setFormat, success, validateFormat } from './output.js';
import { CLI_VERSION, SCHEMA_VERSION } from './version.js';

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

  it('fail envelope has ok:false, data:null, error message, and error_code', () => {
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
    expect(envelope.error_code).toBe('AUTH_REQUIRED');

    stdoutSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('fail maps exit codes to error_code strings', () => {
    setFormat('json');
    const cases: Array<[number, string]> = [
      [EXIT_AUTH, 'AUTH_REQUIRED'],
      [EXIT_NOT_FOUND, 'NOT_FOUND'],
      [EXIT_INPUT, 'INVALID_INPUT'],
    ];
    for (const [code, expected] of cases) {
      const written: string[] = [];
      const spy = vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
        written.push(String(c));
        return true;
      });
      vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      expect(() => fail('msg', code)).toThrow();
      expect(JSON.parse(written[0]).error_code).toBe(expected);
      spy.mockRestore();
    }
  });

  it('success envelope does not include error_code', () => {
    setFormat('json');
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
      written.push(String(c));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    expect(() => success({ x: 1 })).toThrow();
    const envelope = JSON.parse(written[0]);
    expect(envelope.error_code).toBeUndefined();
    vi.restoreAllMocks();
  });

  it('success envelope includes schema_version and cli_version', () => {
    setFormat('json');
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
      written.push(String(c));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    expect(() => success({ x: 1 })).toThrow();
    const envelope = JSON.parse(written[0]);
    expect(envelope.schema_version).toBe(SCHEMA_VERSION);
    expect(envelope.cli_version).toBe(CLI_VERSION);
    vi.restoreAllMocks();
  });

  it('fail envelope includes schema_version and cli_version', () => {
    setFormat('json');
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
      written.push(String(c));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    expect(() => fail('err', EXIT_AUTH)).toThrow();
    const envelope = JSON.parse(written[0]);
    expect(envelope.schema_version).toBe(SCHEMA_VERSION);
    expect(envelope.cli_version).toBe(CLI_VERSION);
    vi.restoreAllMocks();
  });
});

describe('validateFormat', () => {
  it('accepts "human" and "json"', () => {
    expect(validateFormat('human')).toBe('human');
    expect(validateFormat('json')).toBe('json');
  });

  it('calls fail with EXIT_INPUT for unknown format', () => {
    setFormat('json');
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
      written.push(String(c));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    expect(() => validateFormat('xml')).toThrow('exit');
    const envelope = JSON.parse(written[0]);
    expect(envelope.ok).toBe(false);
    expect(envelope.error_code).toBe('INVALID_INPUT');
    expect(envelope.error).toContain('xml');
    vi.restoreAllMocks();
  });
});

describe('JSON envelope — human mode', () => {
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
