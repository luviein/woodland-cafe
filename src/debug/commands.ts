import { INGREDIENT_IDS, INGREDIENTS } from '../data/ingredients';
import { LOCATION_IDS } from '../data/locations';
import type { GameState } from '../logic/gameState';
import type { Score } from '../logic/types';
import { noDevActions, type DevActions } from './devActions';
import type { DevSettings } from './devSettings';

const SCORES: readonly Score[] = ['perfect', 'close', 'wrong'];

/**
 * A dev console command. `run` gets the words typed after the command name
 * and returns a message to show. Throwing an Error shows its message instead.
 */
export interface Command {
  usage: string;
  description: string;
  run(args: string[]): string;
}

export type CommandRegistry = Record<string, Command>;

/**
 * Runs one line typed into the console, e.g. "speed 5". Pure apart from
 * whatever the command itself changes, so the parsing and error handling are
 * easy to test without a browser.
 */
export function runCommand(commands: CommandRegistry, input: string): string {
  const [name, ...args] = input.trim().split(/\s+/);
  if (!name) return '';
  const command = commands[name.toLowerCase()];
  if (!command) return `Unknown command '${name}'. Type 'help' for a list.`;
  try {
    return command.run(args);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * All dev commands. Settings and config are passed in (rather than imported)
 * so tests can use their own objects. To add a command, add an entry here.
 *
 * `configs` are live config objects (e.g. FLOOR_CONFIG, DAY_CONFIG): `set`
 * changes their fields in place, and since the game reads those same objects
 * every frame, changes apply immediately. Setting names must be unique across
 * them, so `set <name>` never has to ask which one you meant.
 */
export function createDevCommands(
  settings: DevSettings,
  configs: Record<string, number>[],
  actions: DevActions = noDevActions(),
): CommandRegistry {
  const names = configs.flatMap((c) => Object.keys(c));
  const duplicate = names.find((n, i) => names.indexOf(n) !== i);
  if (duplicate) throw new Error(`Setting '${duplicate}' is in more than one config`);

  // Remember the starting values so `reset` can put them back.
  const defaults = configs.map((c) => ({ ...c }));

  /** Finds the config holding a setting, ignoring case, so "eatsecondsmax" works too. */
  const find = (name: string): { config: Record<string, number>; key: string } | undefined => {
    for (const config of configs) {
      const key = Object.keys(config).find((k) => k.toLowerCase() === name.toLowerCase());
      if (key) return { config, key };
    }
    return undefined;
  };

  const game = (): { get: () => GameState; set: (state: GameState) => void } => {
    if (!actions.game) throw new Error('The game is not running yet');
    return actions.game;
  };
  /** A whole number, 0 or more, or a usage error. */
  const count = (value: string | undefined, usage: string): number => {
    const n = Number(value);
    if (value === undefined || !Number.isInteger(n) || n < 0) throw new Error(`Usage: ${usage} (a whole number, 0 or more)`);
    return n;
  };

  const commands: CommandRegistry = {
    help: {
      usage: 'help',
      description: 'List all commands',
      run: () =>
        Object.values(commands)
          .map((c) => `${c.usage} - ${c.description}`)
          .join('\n'),
    },

    speed: {
      usage: 'speed [n]',
      description: 'Run the cafe floor n times faster (1 = normal). No n: show current',
      run: ([value]) => {
        if (value === undefined) return `Floor speed is x${settings.floorTimeScale}`;
        const n = Number(value);
        // Very high values make each frame jump many seconds at once; 20 is
        // plenty for testing and keeps the simulation readable.
        if (!Number.isFinite(n) || n <= 0 || n > 20) {
          throw new Error('Speed must be a number above 0 and at most 20');
        }
        settings.floorTimeScale = n;
        return `Floor speed set to x${n}`;
      },
    },

    config: {
      usage: 'config',
      description: 'List all floor and day settings and their current values',
      run: () =>
        configs
          .flatMap((config, i) =>
            Object.entries(config).map(([key, value]) => {
              const file = defaults[i][key];
              const changed = value !== file ? `  (file: ${file})` : '';
              return `${key} = ${value}${changed}`;
            }),
          )
          .join('\n'),
    },

    set: {
      usage: 'set <name> <value>',
      description: "Change a floor or day setting live, e.g. 'set eatSecondsMax 15'",
      run: ([name, value]) => {
        if (name === undefined || value === undefined) {
          throw new Error("Usage: set <name> <value>. Type 'config' to see the names.");
        }
        const found = find(name);
        if (!found) throw new Error(`No setting called '${name}'. Type 'config' to see the names.`);
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) throw new Error('Value must be a number, 0 or more');
        found.config[found.key] = n;
        return `${found.key} = ${n}`;
      },
    },

    reset: {
      usage: 'reset',
      description: 'Put every floor and day setting and the speed back to normal',
      run: () => {
        configs.forEach((config, i) => Object.assign(config, defaults[i]));
        settings.floorTimeScale = 1;
        return 'Floor settings and speed reset';
      },
    },

    serve: {
      usage: 'serve [perfect|close|wrong]',
      description: 'At the prep station: serve the order as if it scored that (default perfect)',
      run: ([value = 'perfect']) => {
        const score = SCORES.find((s) => s === value.toLowerCase());
        if (!score) throw new Error('Usage: serve [perfect|close|wrong]');
        if (!actions.serve) throw new Error('Only works while the prep station is open');
        actions.serve(score);
        return `Served (${score})`;
      },
    },

    mess: {
      usage: 'mess',
      description: 'Mess up every free seat (to test "no clean seats")',
      run: () => {
        if (!actions.setMessy) throw new Error('Only works on the cafe floor');
        return `Messed up ${actions.setMessy(true)} seat(s)`;
      },
    },

    clean: {
      usage: 'clean',
      description: 'Wipe every mess on the floor',
      run: () => {
        if (!actions.setMessy) throw new Error('Only works on the cafe floor');
        return `Cleaned ${actions.setMessy(false)} seat(s)`;
      },
    },

    stock: {
      usage: 'stock [ingredient n]',
      description: "Show ingredient stock, or set one, e.g. 'stock jam 0'",
      run: ([name, value]) => {
        const state = game().get();
        if (name === undefined) {
          return INGREDIENT_IDS.map((id) => `${id} = ${state.stock[id]}`).join('\n');
        }
        const id = INGREDIENT_IDS.find((i) => i === name.toLowerCase());
        if (!id) throw new Error(`No ingredient called '${name}'. Type 'stock' to see them.`);
        const n = count(value, 'stock <ingredient> <n>');
        game().set({ ...state, stock: { ...state.stock, [id]: n } });
        return `${INGREDIENTS[id].name} stock = ${n}`;
      },
    },

    leaves: {
      usage: 'leaves <n>',
      description: "Set the wallet, e.g. 'leaves 0' to test running out of money",
      run: ([value]) => {
        const n = count(value, 'leaves <n>');
        game().set({ ...game().get(), leaves: n });
        return `Wallet = ${n}`;
      },
    },

    goto: {
      usage: `goto <map|${LOCATION_IDS.join('|')}>`,
      description: 'Jump straight there. goto cafe opens the SAME day (no new day starts)',
      run: ([value]) => {
        const places = ['map', ...LOCATION_IDS] as const;
        const place = places.find((p) => p === value?.toLowerCase());
        if (!place) throw new Error(`Usage: goto <${places.join('|')}>`);
        if (!actions.goto) throw new Error('The game is not running yet');
        actions.goto(place);
        return `Went to ${place}`;
      },
    },

    time: {
      usage: 'time',
      description: 'Show the day number and the cafe clock',
      run: () => {
        if (!actions.dayTime) throw new Error('Only works on the cafe floor');
        return actions.dayTime();
      },
    },

    endday: {
      usage: 'endday',
      description: 'Jump to closing time (customers inside can still be served)',
      run: () => {
        if (!actions.endDay) throw new Error('Only works on the cafe floor');
        actions.endDay();
        return 'Doors closed. The day ends when the last customer leaves.';
      },
    },
  };
  return commands;
}
