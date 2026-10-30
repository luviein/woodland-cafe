import { describe, expect, it } from 'vitest';
import { createDevCommands, runCommand } from './commands';
import type { Score } from '../logic/types';
import type { DevActions } from './devActions';
import type { DevSettings } from './devSettings';

const setup = () => {
  const settings: DevSettings = { floorTimeScale: 1 };
  const tunables: Record<string, number> = { eatSecondsMax: 10, patienceSeconds: 20 };
  return { settings, tunables, commands: createDevCommands(settings, tunables) };
};

describe('runCommand', () => {
  it('ignores empty input', () => {
    const { commands } = setup();
    expect(runCommand(commands, '   ')).toBe('');
  });

  it('reports unknown commands', () => {
    const { commands } = setup();
    expect(runCommand(commands, 'fly')).toMatch(/Unknown command 'fly'/);
  });

  it('is case-insensitive and tolerates extra spaces', () => {
    const { commands, settings } = setup();
    runCommand(commands, '  SPEED    3 ');
    expect(settings.floorTimeScale).toBe(3);
  });

  it('help lists every command', () => {
    const { commands } = setup();
    const text = runCommand(commands, 'help');
    for (const name of Object.keys(commands)) expect(text).toContain(name);
  });
});

describe('speed', () => {
  it('sets the floor time scale', () => {
    const { commands, settings } = setup();
    expect(runCommand(commands, 'speed 5')).toBe('Floor speed set to x5');
    expect(settings.floorTimeScale).toBe(5);
  });

  it('accepts decimals, e.g. slow motion', () => {
    const { commands, settings } = setup();
    runCommand(commands, 'speed 0.5');
    expect(settings.floorTimeScale).toBe(0.5);
  });

  it('shows the current speed with no argument', () => {
    const { commands } = setup();
    expect(runCommand(commands, 'speed')).toBe('Floor speed is x1');
  });

  it('rejects bad values and leaves the speed unchanged', () => {
    const { commands, settings } = setup();
    for (const bad of ['abc', '0', '-2', '50']) {
      expect(runCommand(commands, `speed ${bad}`)).toMatch(/must be a number/);
    }
    expect(settings.floorTimeScale).toBe(1);
  });
});

describe('config / set / reset', () => {
  it('config lists every setting with its value', () => {
    const { commands } = setup();
    expect(runCommand(commands, 'config')).toBe('eatSecondsMax = 10\npatienceSeconds = 20');
  });

  it('set changes the live config object, ignoring name case', () => {
    const { commands, tunables } = setup();
    expect(runCommand(commands, 'set eatsecondsmax 15')).toBe('eatSecondsMax = 15');
    expect(tunables.eatSecondsMax).toBe(15);
  });

  it('config marks changed values with the value from the file', () => {
    const { commands } = setup();
    runCommand(commands, 'set patienceSeconds 30');
    expect(runCommand(commands, 'config')).toContain('patienceSeconds = 30  (file: 20)');
  });

  it('set rejects unknown names, bad values and missing arguments', () => {
    const { commands, tunables } = setup();
    expect(runCommand(commands, 'set fooBar 3')).toMatch(/No setting called 'fooBar'/);
    expect(runCommand(commands, 'set eatSecondsMax abc')).toMatch(/must be a number/);
    expect(runCommand(commands, 'set eatSecondsMax -1')).toMatch(/must be a number/);
    expect(runCommand(commands, 'set eatSecondsMax')).toMatch(/Usage/);
    expect(tunables.eatSecondsMax).toBe(10);
  });

  it('reset restores every setting and the speed', () => {
    const { commands, tunables, settings } = setup();
    runCommand(commands, 'set eatSecondsMax 99');
    runCommand(commands, 'speed 5');
    runCommand(commands, 'reset');
    expect(tunables).toEqual({ eatSecondsMax: 10, patienceSeconds: 20 });
    expect(settings.floorTimeScale).toBe(1);
  });
});

describe('serve / mess / clean', () => {
  const withActions = () => {
    const served: Score[] = [];
    const messyCalls: boolean[] = [];
    const actions: DevActions = {
      serve: (score) => served.push(score),
      setMessy: (messy) => {
        messyCalls.push(messy);
        return 3;
      },
    };
    const commands = createDevCommands({ floorTimeScale: 1 }, {}, actions);
    return { commands, served, messyCalls };
  };

  it('serve defaults to perfect and accepts any score', () => {
    const { commands, served } = withActions();
    expect(runCommand(commands, 'serve')).toBe('Served (perfect)');
    runCommand(commands, 'serve CLOSE');
    runCommand(commands, 'serve wrong');
    expect(served).toEqual(['perfect', 'close', 'wrong']);
  });

  it('serve rejects anything else', () => {
    const { commands, served } = withActions();
    expect(runCommand(commands, 'serve great')).toMatch(/Usage/);
    expect(served).toEqual([]);
  });

  it('mess and clean report how many seats changed', () => {
    const { commands, messyCalls } = withActions();
    expect(runCommand(commands, 'mess')).toBe('Messed up 3 seat(s)');
    expect(runCommand(commands, 'clean')).toBe('Cleaned 3 seat(s)');
    expect(messyCalls).toEqual([true, false]);
  });

  it('say so when the scene they need is not running', () => {
    const { commands } = setup(); // no actions registered
    expect(runCommand(commands, 'serve')).toMatch(/prep station is open/);
    expect(runCommand(commands, 'mess')).toMatch(/cafe floor/);
    expect(runCommand(commands, 'clean')).toMatch(/cafe floor/);
  });
});
