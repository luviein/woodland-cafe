import type { Score } from '../logic/types';
import type { DevActions } from './devActions';
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
 * `tunables` is a live config object (e.g. FLOOR_CONFIG): `set` changes its
 * fields in place, and since the game reads that same object every frame,
 * changes apply immediately.
 */
export function createDevCommands(
  settings: DevSettings,
  tunables: Record<string, number>,
  actions: DevActions = { serve: null, setMessy: null },
): CommandRegistry {
  // Remember the starting values so `reset` can put them back.
  const defaults = { ...tunables };

  /** Finds a config key ignoring case, so "eatsecondsmax" works too. */
  const findKey = (name: string): string | undefined =>
    Object.keys(tunables).find((k) => k.toLowerCase() === name.toLowerCase());

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
      description: 'List all floor settings and their current values',
      run: () =>
        Object.entries(tunables)
          .map(([key, value]) => {
            const changed = value !== defaults[key] ? `  (file: ${defaults[key]})` : '';
            return `${key} = ${value}${changed}`;
          })
          .join('\n'),
    },

    set: {
      usage: 'set <name> <value>',
      description: "Change a floor setting live, e.g. 'set eatSecondsMax 15'",
      run: ([name, value]) => {
        if (name === undefined || value === undefined) {
          throw new Error("Usage: set <name> <value>. Type 'config' to see the names.");
        }
        const key = findKey(name);
        if (!key) throw new Error(`No setting called '${name}'. Type 'config' to see the names.`);
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) throw new Error('Value must be a number, 0 or more');
        tunables[key] = n;
        return `${key} = ${n}`;
      },
    },

    reset: {
      usage: 'reset',
      description: 'Put every floor setting and the speed back to normal',
      run: () => {
        Object.assign(tunables, defaults);
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
  };
  return commands;
}
