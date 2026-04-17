import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mockStatePath } from '../lib/paths.js';
import {
  defaultState,
  findLight,
  findRoom,
  lightsForRoom,
  loadState,
  migrateState,
  saveState,
} from './state.js';
import type { RawState } from './state.js';

describe('defaultState', () => {
  it('has 3 rooms and 8 lights', () => {
    const s = defaultState();
    expect(s.rooms).toHaveLength(3);
    expect(s.lights).toHaveLength(8);
  });

  it('includes state_version: 1', () => {
    expect(defaultState().state_version).toBe(1);
  });

  it('kitchen lights match spec', () => {
    const s = defaultState();
    const kitchen = s.rooms.find((r) => r.id === 'room-001');
    expect(kitchen?.name).toBe('Kitchen');
    expect(kitchen?.lightIds).toEqual(['light-001', 'light-002', 'light-003']);
  });
});

describe('saveState / loadState', () => {
  it('round-trips state through disk', () => {
    const original = defaultState();
    original.lights[0].state = 'off';
    saveState(original);
    const loaded = loadState();
    expect(loaded.lights[0].state).toBe('off');
  });

  it('writes defaults when file is missing', () => {
    const loaded = loadState();
    expect(loaded.rooms).toHaveLength(3);
    expect(loaded.lights).toHaveLength(8);
  });

  it('returns existing state when file exists', () => {
    const state = defaultState();
    state.lights[1].state = 'off';
    saveState(state);
    const loaded = loadState();
    expect(loaded.lights[1].state).toBe('off');
  });

  it('gracefully handles corrupt JSON by reinitialising defaults', () => {
    const path = mockStatePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '{ not valid json', 'utf8');
    const loaded = loadState();
    expect(loaded.rooms).toHaveLength(3);
  });
});

describe('migrateState', () => {
  it('adds state_version: 1 to a v0 (unversioned) state', () => {
    const v0: RawState = { rooms: defaultState().rooms, lights: defaultState().lights };
    const result = migrateState(v0);
    expect(result.state_version).toBe(1);
    expect(result.rooms).toHaveLength(3);
    expect(result.lights).toHaveLength(8);
  });

  it('returns v1 state unchanged', () => {
    const v1 = defaultState();
    const result = migrateState(v1);
    expect(result).toEqual(v1);
  });

  it('falls back to defaultState for an unknown future version', () => {
    const future: RawState = { ...defaultState(), state_version: 99 };
    const result = migrateState(future);
    expect(result).toEqual(defaultState());
  });

  it('loadState migrates a v0 file on disk', () => {
    const path = mockStatePath();
    mkdirSync(dirname(path), { recursive: true });
    const v0 = defaultState();
    const raw = v0 as Record<string, unknown>;
    raw.state_version = undefined;
    writeFileSync(path, JSON.stringify(raw), 'utf8');
    const loaded = loadState();
    expect(loaded.state_version).toBe(1);
  });
});

describe('findLight', () => {
  it('finds a light by id', () => {
    const s = defaultState();
    expect(findLight(s, 'light-003')?.name).toBe('Kitchen Strip');
  });

  it('returns undefined for unknown id', () => {
    expect(findLight(defaultState(), 'light-999')).toBeUndefined();
  });
});

describe('findRoom', () => {
  it('finds a room case-insensitively', () => {
    const s = defaultState();
    expect(findRoom(s, 'kitchen')?.id).toBe('room-001');
    expect(findRoom(s, 'KITCHEN')?.id).toBe('room-001');
    expect(findRoom(s, 'living room')?.id).toBe('room-003');
  });

  it('returns undefined for unknown room', () => {
    expect(findRoom(defaultState(), 'attic')).toBeUndefined();
  });
});

describe('lightsForRoom', () => {
  it('returns all lights in a room', () => {
    const s = defaultState();
    const lights = lightsForRoom(s, 'Bedroom');
    expect(lights.map((l) => l.id)).toEqual(['light-004', 'light-005']);
  });

  it('returns empty array for unknown room', () => {
    expect(lightsForRoom(defaultState(), 'Garage')).toEqual([]);
  });
});
