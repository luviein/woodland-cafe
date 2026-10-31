import { describe, expect, it } from 'vitest';
import { createDevCommands, runCommand } from './commands';
import type { Score } from '../logic/types';
import { createNewGame, type GameState } from '../logic/gameState';
import { noDevActions, type DevActions } from './devActions';
import type { DevSettings } from './devSettings';

const setup = () => {
  const settings: DevSettings = { floorTimeScale: 1 };
  const tunables: Record<string, number> = { eatSecondsMax: 10, patienceSeconds: 20 };
  return { settings, tunables, commands: createDevCommands(settings, [tunables]) };
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

describe('several config objects', () => {
  const twoConfigs = () => {
    const floor: Record<string, number> = { eatSecondsMax: 10 };
    const day: Record<string, number> = { dayLengthSeconds: 180 };
    return { floor, day, commands: createDevCommands({ floorTimeScale: 1 }, [floor, day]) };
  };

  it('config lists them all and set finds the right one', () => {
    const { floor, day, commands } = twoConfigs();
    expect(runCommand(commands, 'config')).toBe('eatSecondsMax = 10\ndayLengthSeconds = 180');
    runCommand(commands, 'set dayLengthSeconds 60');
    expect(day.dayLengthSeconds).toBe(60);
    expect(floor).toEqual({ eatSecondsMax: 10 });
  });

  it('reset restores every one of them', () => {
    const { floor, day, commands } = twoConfigs();
    runCommand(commands, 'set eatSecondsMax 1');
    runCommand(commands, 'set dayLengthSeconds 1');
    runCommand(commands, 'reset');
    expect(floor).toEqual({ eatSecondsMax: 10 });
    expect(day).toEqual({ dayLengthSeconds: 180 });
  });

  it('refuses a setting name used in two configs', () => {
    expect(() => createDevCommands({ floorTimeScale: 1 }, [{ a: 1 }, { a: 2 }])).toThrow(/'a' is in more than one/);
  });
});

describe('serve / mess / clean / time / endday', () => {
  const withActions = () => {
    const served: Score[] = [];
    const messyCalls: boolean[] = [];
    let endDayCalls = 0;
    const actions: DevActions = {
      ...noDevActions(),
      serve: (score) => served.push(score),
      setMessy: (messy) => {
        messyCalls.push(messy);
        return 3;
      },
      dayTime: () => 'Day 2, 9:40 (open)',
      endDay: () => {
        endDayCalls++;
      },
    };
    const commands = createDevCommands({ floorTimeScale: 1 }, [], actions);
    return { commands, served, messyCalls, endDayCalls: () => endDayCalls };
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

  it('time shows the clock and endday jumps to closing', () => {
    const { commands, endDayCalls } = withActions();
    expect(runCommand(commands, 'time')).toBe('Day 2, 9:40 (open)');
    expect(runCommand(commands, 'endday')).toMatch(/Doors closed/);
    expect(endDayCalls()).toBe(1);
  });

  it('stock lists every ingredient and sets one', () => {
    let state: GameState = createNewGame();
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      game: { get: () => state, set: (s) => (state = s) },
    });
    expect(runCommand(commands, 'stock')).toContain('bread = 30');
    expect(runCommand(commands, 'stock JAM 0')).toBe('Jam stock = 0');
    expect(state.stock.jam).toBe(0);
    expect(runCommand(commands, 'stock jelly 1')).toMatch(/No ingredient called 'jelly'/);
    expect(runCommand(commands, 'stock jam -1')).toMatch(/Usage/);
    expect(runCommand(commands, 'leaves 7')).toBe('Wallet = 7');
    expect(state.leaves).toBe(7);
    expect(runCommand(commands, 'leaves 1.5')).toMatch(/Usage/);
  });

  it('unlock gives an ingredient or the Toaster for free', () => {
    let state: GameState = { ...createNewGame(), leaves: 3 };
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      game: { get: () => state, set: (s) => (state = s) },
    });
    expect(runCommand(commands, 'unlock Toaster')).toMatch(/Toaster unlocked/);
    expect(runCommand(commands, 'unlock tuna')).toMatch(/Tuna unlocked/);
    expect(state.upgrades).toEqual(['toaster']);
    expect(state.ingredients).toContain('tuna');
    expect(state.stock.tuna).toBe(0);
    expect(state.leaves).toBe(3); // free
    runCommand(commands, 'unlock toaster'); // twice is fine
    expect(state.upgrades).toEqual(['toaster']);
    expect(runCommand(commands, 'unlock bread')).toMatch(/Usage: unlock <chilli\|tuna\|tomato\|toaster>/);
    expect(runCommand(commands, 'unlock')).toMatch(/Usage/);
  });

  it('furniture lists pieces and sets how many are stored, for free', () => {
    let state: GameState = { ...createNewGame(), leaves: 3 };
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      game: { get: () => state, set: (s) => (state = s) },
    });
    expect(runCommand(commands, 'furniture')).toBe('table: stored 0, in the cafe 4\nchair: stored 0, in the cafe 8');
    const placed = state.furniture.placed;
    expect(runCommand(commands, 'furniture Table 3')).toMatch(/Tables in storage = 3/);
    expect(state.furniture.stored).toEqual({ table: 3, chair: 0 });
    expect(state.furniture.placed).toBe(placed); // the cafe itself is untouched
    expect(state.leaves).toBe(3);
    expect(runCommand(commands, 'furniture table 0')).toMatch(/= 0/);
    expect(runCommand(commands, 'furniture sofa 2')).toMatch(/Usage: furniture \[table\|chair n\]/);
    expect(runCommand(commands, 'furniture chair -1')).toMatch(/Usage/);
  });

  it('goto accepts the map and every place, and nothing else', () => {
    const went: string[] = [];
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      goto: (place) => went.push(place),
    });
    expect(runCommand(commands, 'goto Forest')).toBe('Went to forest');
    runCommand(commands, 'goto map');
    expect(runCommand(commands, 'goto moon')).toMatch(/Usage: goto <map\|cafe\|forest\|marketplace>/);
    expect(went).toEqual(['forest', 'map']);
  });

  it('say so when the scene they need is not running', () => {
    const { commands } = setup(); // no actions registered
    expect(runCommand(commands, 'serve')).toMatch(/prep station is open/);
    expect(runCommand(commands, 'mess')).toMatch(/cafe floor/);
    expect(runCommand(commands, 'clean')).toMatch(/cafe floor/);
    expect(runCommand(commands, 'time')).toMatch(/cafe floor/);
    expect(runCommand(commands, 'endday')).toMatch(/cafe floor/);
    expect(runCommand(commands, 'stock')).toMatch(/not running/);
    expect(runCommand(commands, 'leaves 3')).toMatch(/not running/);
    expect(runCommand(commands, 'goto map')).toMatch(/not running/);
  });
});
