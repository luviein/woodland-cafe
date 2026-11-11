import { describe, expect, it } from 'vitest';
import { createDevCommands, runCommand } from './commands';
import { cropRemaining, plantCrop, tendCrop } from '../logic/garden';
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
  it('spawns a validated species through the active floor action', () => {
    const actions = noDevActions();
    const spawned: string[] = [];
    actions.spawnCustomer = animal => { spawned.push(animal); return `Spawned ${animal}`; };
    const commands = createDevCommands({ floorTimeScale: 1 }, [], actions);
    for (const name of ['frog', 'badger', 'raccoon']) expect(runCommand(commands, `spawn ${name}`)).toBe(`Spawned ${name}`);
    expect(runCommand(commands, 'spawn racoon')).toBe('Spawned raccoon');
    expect(runCommand(commands, 'spawn dragon')).toMatch(/Usage/);
    expect(runCommand(commands, 'spawn frog badger')).toMatch(/Usage/);
    expect(spawned).toEqual(['frog', 'badger', 'raccoon', 'raccoon']);
    actions.spawnCustomer = null;
    expect(runCommand(commands, 'spawn frog')).toBe('Open the cafe floor first');
  });
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

describe('garden commands', () => {
  const gardenSetup = () => {
    let state = createNewGame();
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(), game: { get: () => state, set: next => { state = next; } },
    });
    return { commands, get: () => state, set: (next: GameState) => { state = next; } };
  };

  it('adds seeds with a default count and validates crops, counts and locks', () => {
    const { commands, get } = gardenSetup();
    expect(runCommand(commands, 'seed MUSHROOM')).toBe('Mushroom seeds = 1');
    runCommand(commands, 'seed mushroom 4');
    expect(get().garden.seeds.mushroom).toBe(5);
    const before = get();
    for (const input of ['seed', 'seed bread', 'seed mushroom 0', 'seed mushroom -1',
      'seed mushroom 1.5', 'seed mushroom Infinity', 'seed mushroom 9007199254740992', 'seed mushroom 1 extra']) {
      expect(runCommand(commands, input)).toMatch(/Usage/);
      expect(get()).toBe(before);
    }
    expect(runCommand(commands, 'seed tomato')).toMatch(/Unlock tomato first/);
    runCommand(commands, 'unlock tomato');
    runCommand(commands, 'seed tomato 2');
    expect(get().garden.seeds.tomato).toBe(2);
    expect(get().leaves).toBe(before.leaves);
  });

  it('rejects seed totals that cannot be saved safely', () => {
    const { commands, get } = gardenSetup();
    runCommand(commands, `seed mushroom ${Number.MAX_SAFE_INTEGER}`);
    expect(runCommand(commands, 'seed mushroom')).toBe('Too many seeds');
    expect(get().garden.seeds.mushroom).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('skips watered timers but leaves harvesting, unwatered beds and stock alone', () => {
    const { commands, get, set } = gardenSetup();
    runCommand(commands, 'seed mushroom 2');
    const now = Date.now();
    set(tendCrop(plantCrop(plantCrop(get(), 0, 'mushroom'), 1, 'mushroom'), 0, now));
    const before = get();
    expect(runCommand(commands, 'grow extra')).toBe('Usage: grow');
    expect(get()).toBe(before);
    expect(runCommand(commands, 'grow')).toBe('1 watered crops ready to harvest');
    expect(cropRemaining(get().garden.plots[0]!, Date.now())).toBe(0);
    expect(get().garden.plots[1]).toBe(before.garden.plots[1]);
    expect(get().garden.plots[2]).toBeNull();
    expect(get().stock).toBe(before.stock);
    const harvested = tendCrop(get(), 0, Date.now());
    expect(harvested.stock.mushroom).toBe(before.stock.mushroom + 4);
    expect(tendCrop(harvested, 0, Date.now())).toBe(harvested);
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
    expect(runCommand(commands, 'furniture')).toMatch(/^table: stored 0, in the cafe 4\nchair: stored 0, in the cafe 8\nchristmasTree: stored 0, in the cafe 0\n/);
    const placed = state.furniture.placed;
    expect(runCommand(commands, 'furniture Table 3')).toMatch(/Table in storage = 3/);
    expect(state.furniture.stored).toMatchObject({ table: 3, chair: 0 });
    expect(runCommand(commands, 'furniture christmastree 2')).toMatch(/Christmas Tree in storage = 2/);
    expect(state.furniture.placed).toBe(placed); // the cafe itself is untouched
    expect(state.leaves).toBe(3);
    expect(runCommand(commands, 'furniture table 0')).toMatch(/= 0/);
    expect(runCommand(commands, 'furniture sofa 2')).toMatch(/Usage: furniture \[design n\], designs: table, chair, christmasTree/);
    expect(runCommand(commands, 'furniture chair -1')).toMatch(/Usage/);
  });

  it('hire and fire change who is employed, for free', () => {
    let state: GameState = { ...createNewGame(), leaves: 3 };
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      game: { get: () => state, set: (s) => (state = s) },
    });
    expect(runCommand(commands, 'hire Cleaner')).toMatch(/Cleaner hired/);
    expect(runCommand(commands, 'hire mascot')).toMatch(/Mascot hired/);
    expect(state.employees).toEqual(['mascot', 'cleaner']);
    expect(runCommand(commands, 'fire mascot')).toBe('Mascot let go');
    expect(state.employees).toEqual(['cleaner']);
    expect(state.leaves).toBe(3);
    expect(runCommand(commands, 'hire chef')).toBe('Usage: hire <mascot|cleaner>');
    expect(runCommand(commands, 'fire')).toBe('Usage: fire <mascot|cleaner>');
  });

  it('save and wipesave call the save slot', () => {
    const calls: string[] = [];
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      save: { now: () => calls.push('now'), wipe: () => calls.push('wipe') },
    });
    expect(runCommand(commands, 'save')).toBe('Saved');
    expect(runCommand(commands, 'wipesave')).toMatch(/Save deleted/);
    expect(calls).toEqual(['now', 'wipe']);
    expect(runCommand(createDevCommands({ floorTimeScale: 1 }, []), 'save')).toMatch(/not running/);
  });

  it('tutorial shows the step, and sets it', () => {
    let state = createNewGame();
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      game: { get: () => state, set: (s) => (state = s) },
    });
    expect(runCommand(commands, 'tutorial')).toBe('Tutorial: intro');
    expect(runCommand(commands, 'tutorial skip')).toBe('Tutorial: done');
    expect(runCommand(commands, 'tutorial restart')).toBe('Tutorial: intro');
    expect(runCommand(commands, 'tutorial freePlay')).toBe('Tutorial: freePlay');
    expect(state.tutorial).toBe('freePlay');
    expect(runCommand(commands, 'tutorial juggling')).toMatch(/Usage/);
  });

  it('sound lists the sounds and plays a named one', () => {
    const played: string[] = [];
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      playSound: (name) => played.push(name),
    });
    expect(runCommand(commands, 'sound')).toMatch(/Sounds: .*servePerfect/);
    expect(runCommand(commands, 'sound order')).toBe('Played order');
    expect(runCommand(commands, 'sound kazoo')).toMatch(/No sound "kazoo"/);
    expect(played).toEqual(['order']);
  });

  it('goto accepts the map and every place, and nothing else', () => {
    const went: string[] = [];
    const commands = createDevCommands({ floorTimeScale: 1 }, [], {
      ...noDevActions(),
      goto: (place) => went.push(place),
    });
    expect(runCommand(commands, 'goto Forest')).toBe('Went to forest');
    runCommand(commands, 'goto map');
    expect(runCommand(commands, 'goto garden')).toBe('Went to garden');
    expect(runCommand(commands, 'goto moon')).toMatch(/Usage: goto <map\|cafe\|garden\|forest\|marketplace>/);
    expect(went).toEqual(['forest', 'map', 'garden']);
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
