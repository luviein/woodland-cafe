# Woodland Cafe

A cozy 2D pixel-art cafe game, run by woodland creatures for woodland creatures.
Built with Phaser 3 + TypeScript, Vite and Vitest.

See [GAME_DESIGN.md](GAME_DESIGN.md) for the full design and milestone list.

## Running

```sh
npm install      # once
npm run dev      # start the game at http://localhost:5173 (reloads on save)
npm test         # run unit tests once (does NOT type-check)
npm run typecheck   # type-check everything, tests included
npm run test:watch  # re-run tests on every save
npm run build    # type-check + production build into dist/
```

Requires Node 20.19+ or 22.12+ (Node 24 LTS recommended).

## Controls (cafe floor)

| Action              | Mouse / touch |
| ------------------- | ------------- |
| Walk                | Tap a floor tile |
| Take an order       | Tap the customer at the counter (marked "!"); you walk behind the counter and take it. "?" = no clean seat yet |
| Clean a messy table | Tap the table (or one of its seats); tap elsewhere to cancel |

**A day** runs from 8:00 to 17:00 (3 real minutes; clock top-left, under the
Leaves). At 17:00 the doors close: nobody new comes in, but whoever is inside
can still be served. Once the last customer leaves, the day summary shows what
happened; **Exit cafe** (or `Enter`) opens the world map. Tap the **Cafe**
signpost there to start the next day on a fresh floor. Leaves and stock carry
over.

## Controls (world map, Forest, Marketplace)

| Action              | Mouse / touch |
| ------------------- | ------------- |
| Go somewhere        | Tap its signpost on the map (the green one is where you are) |
| Walk (Forest, Marketplace) | Tap anywhere |
| Pick up a Leaf      | Walk over it (+1 🍃). New ones keep appearing |
| Back to the map     | Map button (top-right) |

## Controls (prep station)

Opens on top of the floor when you take an order, and closes shortly after the
customer reacts (tap or press any key to close it sooner). The floor keeps running underneath, so patience keeps dropping
while you cook. A wrong dish sends the customer away angry.

| Action              | Mouse / touch        | Keyboard        |
| ------------------- | -------------------- | --------------- |
| Add a layer         | Tap an ingredient bin | `1` `2` `3`    |
| Serve               | Serve button         | `Enter`         |
| Clear the plate     | Reset button         | `Backspace`     |
| Recipe Book         | Recipes button       | `R` (toggle), `Esc` (close) |

**Ingredient stock:** the number over each bin is how many are left ("x5").
At 0 it shows the rush-delivery price instead ("🍃2"), paid from your Leaves
when you serve. "Out" means no stock and not enough Leaves: the bin is greyed
out. Stock is used when you serve (Reset gives layers back). If a customer's
dish can't be made at all, they leave when you take their order.

## Dev console (testing only)

Under `npm run dev`, press **`` ` ``** (backtick) or click **`>_`** (bottom-left)
to open a command box. Up/Down recall previous commands; `` ` `` or `Esc` closes it.
It isn't included in production builds.

| Command     | What it does |
| ----------- | ------------ |
| `help`      | List all commands |
| `speed [n]` | Run the cafe floor (critters, timers) n times faster, e.g. `speed 5`; `speed 1` = normal; no n shows the current speed |
| `config`    | List every floor, day, stock and leaf setting (`src/data/floorConfig.ts`, `dayConfig.ts`, `stockConfig.ts`, `leafConfig.ts`) and its current value; changed ones show the file's value too |
| `set <name> <value>` | Change a setting live, e.g. `set eatSecondsMax 15` or `set dayLengthSeconds 30` |
| `reset`     | Put all settings and the speed back to normal |
| `serve [perfect\|close\|wrong]` | At the prep station: serve as if the dish scored that (default `perfect`), skipping the cooking |
| `mess`      | Mess up every free seat, to test the "no clean seats" case |
| `clean`     | Wipe every mess on the floor |
| `stock [ingredient n]` | Show ingredient stock, or set one, e.g. `stock jam 0` |
| `leaves <n>` | Set the wallet, e.g. `leaves 0` |
| `time`      | Show the day number and the cafe clock |
| `endday`    | Jump to closing time (customers inside can still be served) |

**Tuning workflow:** play with `set` until it feels right, check `config`, then
copy the values you like into `src/data/floorConfig.ts` or `src/data/dayConfig.ts`. Changes made with
`set` are lost on reload.

To add a command, add an entry in `createDevCommands` in `src/debug/commands.ts`.

## Project layout

```
src/
  main.ts            Phaser game config (pixel art, scaling, scenes)
  integerScale.ts    keeps scaling to whole numbers when the window allows
  config/display.ts  base resolution (640x360) and tile size (16)
  data/              all game content and tuning: ingredients, recipes,
                     modifiers, upgrades, dialogue, prices, order, scoring,
                     tip, floor and day config
  logic/             pure game rules, no Phaser; each has a *.test.ts
                     (e.g. gameState: day/Leaves/owned; day: clock and
                     closing; dayStats: the summary's numbers)
  ui/                reusable drawing pieces (buttons, bubble, plate, book,
                     wallet, clock)
  scenes/            Phaser scenes that wire logic and ui together: Floor,
                     Prep and DaySummary (both overlays on the floor),
                     WorldMap, Outdoor (Forest and Marketplace), and
                     gameStore (shares the game state between scenes)
  debug/             dev console and its commands (dev builds only)
```

The rule of thumb: **content goes in `data/`, rules go in `logic/` (with
tests), drawing goes in `ui/`, and scenes only connect them.**
