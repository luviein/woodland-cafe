# Woodland Cafe

A cozy 2D pixel-art cafe game, run by woodland creatures for woodland creatures.
Built with Phaser 3 + TypeScript, Vite and Vitest.

See [GAME_DESIGN.md](GAME_DESIGN.md) for the full design and milestone list.

## Running

```sh
npm install      # once
npm run dev      # start the game at http://localhost:5173 (reloads on save)
npm test         # run unit tests once
npm run test:watch  # re-run tests on every save
npm run build    # type-check + production build into dist/
```

Requires Node 20.19+ or 22.12+ (Node 24 LTS recommended).

## Controls (prep station)

| Action              | Mouse / touch        | Keyboard        |
| ------------------- | -------------------- | --------------- |
| Add a layer         | Tap an ingredient bin | `1` `2` `3`    |
| Serve               | Serve button         | `Enter`         |
| Clear the plate     | Reset button         | `Backspace`     |
| Recipe Book         | Recipes button       | `R` (toggle), `Esc` (close) |

## Project layout

```
src/
  main.ts            Phaser game config (pixel art, scaling, scenes)
  integerScale.ts    keeps scaling to whole numbers when the window allows
  config/display.ts  base resolution (640x360) and tile size (16)
  data/              all game content and tuning: ingredients, recipes,
                     modifiers, upgrades, dialogue, order + scoring config
  logic/             pure game rules, no Phaser; each has a *.test.ts
  ui/                reusable drawing pieces (buttons, bubble, plate, book)
  scenes/            Phaser scenes that wire logic and ui together
```

The rule of thumb: **content goes in `data/`, rules go in `logic/` (with
tests), drawing goes in `ui/`, and scenes only connect them.**
