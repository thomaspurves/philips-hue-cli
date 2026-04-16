import type { Command } from 'commander';
import { requireAuth } from '../lib/auth.js';
import { EXIT_INPUT, EXIT_NOT_FOUND } from '../lib/errors.js';
import { check, fail, renderTable, success } from '../lib/output.js';
import type { Light } from '../mock/state.js';
import {
  defaultState,
  findLight,
  findRoom,
  lightsForRoom,
  loadState,
  roomForLight,
  saveState,
} from '../mock/state.js';

export function registerDevices(program: Command): void {
  const devices = program.command('devices').description('Manage and control Hue lights.');

  devices
    .command('list')
    .description('List all lights, optionally filtered by room.')
    .option('--room <name>', 'filter by room name')
    .action((opts: { room?: string }) => {
      requireAuth();
      listAction(opts);
    });

  devices
    .command('get <id>')
    .description('Get details for a single light.')
    .action((id: string) => {
      requireAuth();
      getAction(id);
    });

  devices
    .command('set [id]')
    .description('Set the state of one or more lights.')
    .option('--room <name>', 'target all lights in a room')
    .requiredOption('--state <state>', 'desired state: on or off')
    .action((id: string | undefined, opts: { room?: string; state: string }) => {
      requireAuth();
      setAction(id, opts);
    });

  devices
    .command('reset')
    .description('Reset all lights to their default states.')
    .action(() => {
      requireAuth();
      resetAction();
    });
}

export interface LightWithRoom {
  id: string;
  name: string;
  type: string;
  room: { id: string; name: string };
  state: string;
}

function lightWithRoom(light: Light, roomName: string, roomId: string): LightWithRoom {
  return {
    id: light.id,
    name: light.name,
    type: light.type,
    room: { id: roomId, name: roomName },
    state: light.state,
  };
}

export function listAction(opts: { room?: string }): never {
  const state = loadState();
  let lights: Light[];

  if (opts.room !== undefined) {
    const room = findRoom(state, opts.room);
    if (!room) {
      return fail(`Room "${opts.room}" not found`, EXIT_NOT_FOUND);
    }
    lights = lightsForRoom(state, opts.room);
  } else {
    lights = state.lights;
  }

  const rows: LightWithRoom[] = lights.map((l) => {
    const room = roomForLight(state, l);
    return lightWithRoom(l, room?.name ?? '?', room?.id ?? '?');
  });

  return success(rows, () => {
    renderTable(rows, [
      { header: 'ID', width: 10, get: (r) => r.id },
      { header: 'NAME', width: 22, get: (r) => r.name },
      { header: 'TYPE', width: 16, get: (r) => r.type },
      { header: 'ROOM', width: 14, get: (r) => r.room.name },
      { header: 'STATUS', width: 6, get: (r) => r.state },
    ]);
  });
}

export function getAction(id: string): never {
  const state = loadState();
  const light = findLight(state, id);
  if (!light) {
    return fail(`Light "${id}" not found`, EXIT_NOT_FOUND);
  }
  const room = roomForLight(state, light);
  const data = lightWithRoom(light, room?.name ?? '?', room?.id ?? '?');

  return success(data, () => {
    process.stdout.write(`id:    ${data.id}\n`);
    process.stdout.write(`name:  ${data.name}\n`);
    process.stdout.write(`type:  ${data.type}\n`);
    process.stdout.write(`room:  ${data.room.name}\n`);
    process.stdout.write(`state: ${data.state}\n`);
  });
}

export interface SetResult {
  affected: Array<{ id: string; name: string; state: string; changed: boolean }>;
  summary: { count: number; changed: number };
}

export function setAction(id: string | undefined, opts: { room?: string; state: string }): never {
  const { room, state: targetState } = opts;

  if (targetState !== 'on' && targetState !== 'off') {
    return fail(`Invalid state "${targetState}". Must be "on" or "off".`, EXIT_INPUT);
  }

  if (id !== undefined && room !== undefined) {
    return fail('Cannot specify both a light id and --room', EXIT_INPUT);
  }

  const mockState = loadState();
  let targets: Light[];

  if (id !== undefined) {
    const light = findLight(mockState, id);
    if (!light) {
      return fail(`Light "${id}" not found`, EXIT_NOT_FOUND);
    }
    targets = [light];
  } else if (room !== undefined) {
    const foundRoom = findRoom(mockState, room);
    if (!foundRoom) {
      return fail(`Room "${room}" not found`, EXIT_NOT_FOUND);
    }
    targets = lightsForRoom(mockState, room);
  } else {
    targets = mockState.lights;
  }

  const affected: SetResult['affected'] = targets.map((light) => {
    const changed = light.state !== targetState;
    light.state = targetState;
    return { id: light.id, name: light.name, state: light.state, changed };
  });

  saveState(mockState);

  const result: SetResult = {
    affected,
    summary: { count: affected.length, changed: affected.filter((a) => a.changed).length },
  };

  return success(result, () => {
    for (const a of affected) {
      process.stdout.write(`${check(`Set ${a.name} to ${a.state}`)}\n`);
    }
    process.stdout.write(
      `${result.summary.changed} of ${result.summary.count} light(s) changed.\n`,
    );
  });
}

export function resetAction(): never {
  const state = defaultState();
  saveState(state);
  const count = state.lights.length;
  return success({ reset: true, count }, () => {
    process.stdout.write(`${check(`Reset ${count} lights to default state`)}\n`);
  });
}
