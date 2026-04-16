import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mockStatePath } from '../lib/paths.js';

export type LightType = 'Hue White' | 'Hue Color' | 'Hue Lightstrip';
export type LightState = 'on' | 'off';

export interface Light {
  id: string;
  name: string;
  type: LightType;
  roomId: string;
  state: LightState;
}

export interface Room {
  id: string;
  name: string;
  lightIds: string[];
}

export interface MockState {
  rooms: Room[];
  lights: Light[];
}

export function defaultState(): MockState {
  return {
    rooms: [
      { id: 'room-001', name: 'Kitchen', lightIds: ['light-001', 'light-002', 'light-003'] },
      { id: 'room-002', name: 'Bedroom', lightIds: ['light-004', 'light-005'] },
      { id: 'room-003', name: 'Living Room', lightIds: ['light-006', 'light-007', 'light-008'] },
    ],
    lights: [
      {
        id: 'light-001',
        name: 'Kitchen Counter',
        type: 'Hue White',
        roomId: 'room-001',
        state: 'on',
      },
      {
        id: 'light-002',
        name: 'Kitchen Ceiling',
        type: 'Hue White',
        roomId: 'room-001',
        state: 'on',
      },
      {
        id: 'light-003',
        name: 'Kitchen Strip',
        type: 'Hue Lightstrip',
        roomId: 'room-001',
        state: 'off',
      },
      {
        id: 'light-004',
        name: 'Bedroom Lamp',
        type: 'Hue Color',
        roomId: 'room-002',
        state: 'off',
      },
      {
        id: 'light-005',
        name: 'Bedroom Ceiling',
        type: 'Hue White',
        roomId: 'room-002',
        state: 'off',
      },
      {
        id: 'light-006',
        name: 'Living Room Lamp',
        type: 'Hue White',
        roomId: 'room-003',
        state: 'on',
      },
      {
        id: 'light-007',
        name: 'Living Room Floor',
        type: 'Hue Color',
        roomId: 'room-003',
        state: 'off',
      },
      {
        id: 'light-008',
        name: 'Living Room TV',
        type: 'Hue Lightstrip',
        roomId: 'room-003',
        state: 'on',
      },
    ],
  };
}

export function loadState(): MockState {
  const path = mockStatePath();
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as MockState;
  } catch {
    const state = defaultState();
    saveState(state);
    return state;
  }
}

export function saveState(state: MockState): void {
  const path = mockStatePath();
  mkdirSync(join(path, '..'), { recursive: true });
  const tmp = join(tmpdir(), `philips-hue-state-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  renameSync(tmp, path);
}

export function findLight(state: MockState, id: string): Light | undefined {
  return state.lights.find((l) => l.id === id);
}

export function findRoom(state: MockState, name: string): Room | undefined {
  const lower = name.toLowerCase();
  return state.rooms.find((r) => r.name.toLowerCase() === lower);
}

export function lightsForRoom(state: MockState, roomName: string): Light[] {
  const room = findRoom(state, roomName);
  if (!room) return [];
  return state.lights.filter((l) => room.lightIds.includes(l.id));
}

export function roomForLight(state: MockState, light: Light): Room | undefined {
  return state.rooms.find((r) => r.id === light.roomId);
}
