import type { DevSettings } from './devSettings';

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
 * All dev commands. Settings are passed in (rather than imported) so tests
 * can use their own settings object. To add a command, add an entry here.
 */
export function createDevCommands(settings: DevSettings): CommandRegistry {
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
  };
  return commands;
}
