import { CUSTOMER_ART } from '../art/spriteArt';
import { DESIGN_IDS, FURNITURE } from '../data/furniture';
import { EMPLOYEE_ROLES, EMPLOYEES, type EmployeeRole } from '../data/employees';
import { INGREDIENT_IDS, INGREDIENTS } from '../data/ingredients';
import { LOCATION_IDS } from '../data/locations';
import { TOOLS_ON_SALE } from '../data/shops';
import { UPGRADES } from '../data/upgrades';
import type { GameState } from '../logic/gameState';
import { addIngredient, addUpgrade, unlockableIngredients } from '../logic/shop';
import { hire, letGo } from '../logic/employees';
import type { Score } from '../logic/types';
import { isSoundName, SOUND_NAMES } from '../audio/sounds';
import { TUTORIAL_STEPS } from '../data/tutorial';
import { noDevActions, type DevActions } from './devActions';
import type { DevSettings } from './devSettings';

const SCORES: readonly Score[] = ['perfect', 'close', 'wrong'];
/** What `unlock` accepts: everything the Specialty and Tools stalls sell. */
const UNLOCKABLE: readonly string[] = [...unlockableIngredients(), ...TOOLS_ON_SALE];

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

  const role = (value: string | undefined, usage: string): EmployeeRole => {
    const found = EMPLOYEE_ROLES.find((r) => r === value?.toLowerCase());
    if (!found) throw new Error(`Usage: ${usage} <${EMPLOYEE_ROLES.join('|')}>`);
    return found;
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

    spawn: {
      usage: 'spawn <animal>',
      description: 'Spawn one customer: ' + CUSTOMER_ART.join(', '),
      run: args => {
        const requested = args[0]?.toLowerCase();
        const animal = CUSTOMER_ART.find(animal => animal === (requested === 'racoon' ? 'raccoon' : requested));
        if (args.length !== 1 || !animal) return 'Usage: spawn <' + CUSTOMER_ART.join('|') + '>';
        return actions.spawnCustomer ? actions.spawnCustomer(animal) : 'Open the cafe floor first';
      },
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

    arrange: {
      usage: 'arrange',
      description: 'Arrange mode: drag things on this screen to move them, then Save (also F2)',
      run: () => {
        if (!actions.arrange) throw new Error('Arrange mode is not available');
        return actions.arrange();
      },
    },

    season: {
      usage: 'season [all|date]',
      description: 'Seasonal shops (the Christmas stall): open all year, or only in their season by the date',
      run: ([mode]) => {
        if (mode === 'all') settings.allSeasons = true;
        else if (mode === 'date') settings.allSeasons = false;
        else if (mode !== undefined) throw new Error('Usage: season [all|date]');
        return settings.allSeasons ? 'Seasonal shops: open all year (go back to the map and in again)' : 'Seasonal shops: only in their season';
      },
    },

    furniture: {
      usage: 'furniture [design n]',
      description: "Show stored and placed furniture, or set how many of a design are in storage, e.g. 'furniture christmasTree 2'",
      run: ([name, value]) => {
        const state = game().get();
        const { placed, stored } = state.furniture;
        if (name === undefined) {
          return DESIGN_IDS.map((design) => {
            const inCafe = placed.filter((p) => p.design === design).length;
            return `${design}: stored ${stored[design]}, in the cafe ${inCafe}`;
          }).join('\n');
        }
        const design = DESIGN_IDS.find((d) => d.toLowerCase() === name.toLowerCase());
        if (!design) throw new Error(`Usage: furniture [design n], designs: ${DESIGN_IDS.join(', ')}`);
        const n = count(value, `furniture ${design} <n>`);
        // Only storage changes: pieces are placed from Decorate, which checks the rules.
        game().set({ ...state, furniture: { placed, stored: { ...stored, [design]: n } } });
        return `${FURNITURE[design].name} in storage = ${n} (place them from the map: Cafe > Decorate)`;
      },
    },

    unlock: {
      usage: `unlock <${UNLOCKABLE.join('|')}>`,
      description: 'Own an ingredient or upgrade for free (no Leaves spent; ingredients come with 0 stock)',
      run: ([value]) => {
        const name = value?.toLowerCase();
        const state = game().get();
        const ingredient = unlockableIngredients().find((i) => i === name);
        if (ingredient) {
          game().set(addIngredient(state, ingredient));
          return `${INGREDIENTS[ingredient].name} unlocked (its recipes now show up in orders)`;
        }
        // Lower-cased match, so "sandwichpress" would work for later upgrades too.
        const upgrade = TOOLS_ON_SALE.find((u) => u.toLowerCase() === name);
        if (upgrade) {
          game().set(addUpgrade(state, upgrade));
          return `${UPGRADES[upgrade].name} unlocked (the prep station shows it from the next order)`;
        }
        throw new Error(`Usage: unlock <${UNLOCKABLE.join('|')}>`);
      },
    },

    tutorial: {
      usage: `tutorial [restart|skip|${TUTORIAL_STEPS.join('|')}]`,
      description: "Show the tutorial step, or set it (restart = the intro). Takes effect right away on the floor; 'goto cafe' to see the intro",
      run: ([value]) => {
        const current = game().get().tutorial;
        if (!value) return `Tutorial: ${current}`;
        const word = value.toLowerCase();
        const step = word === 'restart' ? 'intro' : word === 'skip' ? 'done' : TUTORIAL_STEPS.find((s) => s.toLowerCase() === word);
        if (!step) throw new Error(`Usage: tutorial [restart|skip|${TUTORIAL_STEPS.join('|')}]`);
        game().set({ ...game().get(), tutorial: step });
        return `Tutorial: ${step}`;
      },
    },

    hire: {
      usage: `hire <${EMPLOYEE_ROLES.join('|')}>`,
      description: 'Hire an employee (free, like the Notice Board). They show up the next time the cafe opens',
      run: ([value]) => {
        const r = role(value, 'hire');
        game().set(hire(game().get(), r));
        return `${EMPLOYEES[r].name} hired (from the next time the cafe opens; 'goto cafe' to see them now)`;
      },
    },

    fire: {
      usage: `fire <${EMPLOYEE_ROLES.join('|')}>`,
      description: 'Let an employee go (free). They leave the next time the cafe opens',
      run: ([value]) => {
        const r = role(value, 'fire');
        game().set(letGo(game().get(), r));
        return `${EMPLOYEES[r].name} let go`;
      },
    },

    save: {
      usage: 'save',
      description: 'Save now, even mid-day (normally the game only saves between days)',
      run: () => {
        if (!actions.save) throw new Error('The game is not running yet');
        actions.save.now();
        return 'Saved';
      },
    },

    wipesave: {
      usage: 'wipesave',
      description: 'Delete the save. The game keeps running; reload to see the title screen with no save',
      run: () => {
        if (!actions.save) throw new Error('The game is not running yet');
        actions.save.wipe();
        return 'Save deleted (anything you do between days saves again)';
      },
    },

    sound: {
      usage: 'sound [name]',
      description: 'List the sound effects, or play one (M mutes; the title screen sets the volume)',
      run: ([name]) => {
        if (!name) return `Sounds: ${SOUND_NAMES.join(', ')}`;
        if (!isSoundName(name)) throw new Error(`No sound "${name}". Sounds: ${SOUND_NAMES.join(', ')}`);
        if (!actions.playSound) throw new Error('The game is not running yet');
        actions.playSound(name);
        return `Played ${name}`;
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
      description: 'End the day now: closing time, every customer leaves, the summary shows',
      run: () => {
        if (!actions.endDay) throw new Error('Only works on the cafe floor');
        actions.endDay();
        return 'Doors closed and everyone sent home. Day over.';
      },
    },
  };
  return commands;
}
