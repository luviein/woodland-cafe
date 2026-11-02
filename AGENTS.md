# Woodland Cafe — guide for coding agents

A cosy 2D pixel-art cafe game with woodland critters. The player (a hedgehog)
takes orders on the cafe floor, builds dishes at the prep station, earns
**Leaves** (the currency), shops at the Marketplace, forages in the Forest and
decorates the cafe. Built with **Phaser 3 + TypeScript**, **Vite** and
**Vitest**. Repo: `luviein/woodland-cafe`, branch `main`.

**`GAME_DESIGN.md` is the source of truth** for how the game works (rules,
numbers, screens, art direction, milestones). Read the relevant section before
changing a feature, and keep it in sync (see Workflow).

## Commands

```
npm run dev        # dev server (also serves editor.html, sprites.html, the dev console, Arrange mode)
npm run typecheck  # tsc --noEmit
npx vitest run     # all tests (~600, fast, no browser)
npm run build      # typecheck + production build
```

Before every commit: typecheck, tests and build must pass. Don't start or
restart the user's dev server yourself; they run it. A change to
`vite.config.ts` needs them to restart it: say so.

Environment: Windows (Git Bash / PowerShell). "LF will be replaced by CRLF"
warnings from git are harmless. Some files have CRLF line endings: when a
script edits files by string matching, normalise `\r\n` to `\n` first.

## Code layout

- `src/logic/` — **pure game logic**, no Phaser: functions take state and
  return new state (orders, scoring, day clock, furniture placement, shop,
  saving...). Unit-tested next to each file (`*.test.ts`).
- `src/data/` — tunable data and content: recipes, ingredients, prices,
  furniture designs (`furniture.ts`), shops/stalls (`shops.ts`), places
  (`locations.ts`, `outdoorAreas.ts`, `forageSpots.ts`), the cafe room grid
  (`cafeLayout.ts`, a text grid), configs. `data.test.ts` checks it's valid.
  - `src/data/texts/*.json` — **all words** (Grandma's tutorial lines,
    customers' lines). Edited by the user in the text editor
    (`/editor.html`); rules in `texts/rules.ts`. **Don't commit the user's
    text edits unless they ask** ("commit the text changes"); run tests first.
  - `src/data/layouts/<screen>.json` — saved positions from Arrange mode (below).
- `src/scenes/` — Phaser scenes (Title, WorldMap, Floor, Prep, Outdoor,
  Decorate, DaySummary, Hud, Boot). Thin: they draw and route input, logic
  lives in `logic/`. Shared game state via `scenes/gameStore.ts`.
- `src/ui/` — reusable UI pieces (Button, ShopPanel, CataloguePanel,
  StoryBox, SpeechBubble, LeafText, cafeTiles, theme colours/text styles).
- `src/art/` — pixel art. Sprites are **letter grids** in
  `src/art/sprites/*.ts` (`PixelSprite`: a legend letter -> colour, frames as
  rows of strings, `.` = see-through). `spriteArt.ts` registers every sprite
  by name; `palette.ts` is the colour palette (legends may also use `#rrggbb`).
  A PNG at `src/art/drawn/<name>.png` overrides the code-drawn sprite.
  `checks.ts` has the quality checks (holes, stray pixels, symmetrical faces)
  run by the tests and the sprite gallery.
- `src/layout/` — positions by name and Arrange mode hooks (below).
- `src/debug/` — dev console (`` ` `` key: `help` lists commands such as
  `leaves 500`, `furniture christmasTree 2`, `goto marketplace`,
  `season all|date`, `arrange`), Arrange mode. Dev builds only.
- `src/editor/`, `src/gallery/` — the text editor and sprite gallery pages.
- `tools/*.mjs` — Vite plugins for the dev-only save routes (texts, layouts).

State: **one central, serializable game state** (plain data). Saves are
versioned (`logic/save.ts`, `SAVE_VERSION`): when the state's shape changes,
bump the version and make older saves load with sensible defaults; add a test.

## Rules that every change must follow

1. **Positions by name (Arrange mode, GAME_DESIGN.md §9.3).** Every screen,
   now and future: anything placed on screen gets its position from
   `layoutPoint(screen, name, default)` (`src/layout/positions.ts`), never a
   bare number in a scene, and is registered with
   `arrangeable(scene, screen, name, point, ...objects)`
   (`src/layout/arrangeable.ts`). Graphics-drawn things also pass
   `sizeBox(...)`; overlay panels use `arrangeablePanel(...)`. Data that logic
   uses (stall, forage spot, place positions) is read through `layoutPoint`
   getters so logic follows moves. Add `arrangeRule(...)` when a position must
   keep a rule. Create `src/data/layouts/<screen>.json` as `{}` for a new
   screen. The user moves things with F2 and saves; respect their saved files.
2. **Design first.** A change to how the game works goes into
   `GAME_DESIGN.md` first, as its own commit, then the code.
3. **Pure logic + tests.** New rules go in `src/logic/` with tests; scenes stay thin.
4. **Pixel art is reviewed pixel by pixel** by the user. Render sprites big
   and look before reporting (see Art below). Keep sprite sizes consistent with
   neighbours (cafe tiles are 24px; critters ~27-38 px tall; things wider than
   their tile are fine).
5. **Leaves** are written as the 🍃 emoji in strings and drawn as the leaf
   sprite by `LeafText` — use it for any text showing an amount of Leaves.

## Art pipeline

The user makes or generates art and sends images; they become letter-grid
sprites. Tools (plain Node, no installs) are in
`.claude/skills/pixel-sprites/` — read its `SKILL.md`; the scripts work from
any agent:

- `scripts/decode.ps1 <image> <out.rgb>` (PowerShell) → raw RGB + size
- `scripts/find.cjs` → finds the drawings in an image
- `scripts/convert.cjs <job.json>` → sprite rows: `native` (art already pixel
  art at its own grid) or `shrink` (big drawings to a target width)
- `scripts/render.cjs <file.ts> <NAME> <out.png>` → a sprite drawn big, to look at
- `scripts/pixel.cjs` → clean-ups (despeck, fillHoles, outlineEdges,
  mirrorFace, backFromFront, walkSteps...) and sprite file read/write
- `references/defects.md` → **every defect the user has caught so far**
  (broken outlines, missing pixels in thin lines, background bleed, views
  that don't match...). Check new art against it.

Keep fixes in a regeneration script rather than hand-editing big grids, so a
rerun keeps them. Register new sprites in `spriteArt.ts` and give them a
gallery group in `src/gallery/main.ts`.

## How the user likes to work

- The user is a developer growing their software-engineering skills: explain
  key decisions briefly in code comments and in summaries.
- **Small steps.** After each step: typecheck, tests, build, **commit, then
  `git push` to origin/main**. One step per commit, with a clear message
  saying what changed and why.
- **Before a new milestone or big feature, show a short plan and wait for
  their OK.** Ask (with clear options) when a design rule is ambiguous.
- They test in the browser themselves and send screenshots. After a change,
  say what to look at and how to try it (dev console shortcuts help).
- Match the surrounding code: its naming, comment style (comments explain
  *why*, in plain words) and idioms. Spelling in comments is British
  ("colour").
- Report honestly: say what you checked and what you couldn't (e.g. "not
  seen in the running game").

## Where things stand

Done: milestones 1-11 (prep, floor, connected cafe, Leaves and day cycle,
stock and world map, Marketplace shops, furniture and decorating, employees,
saving, art/animation/sound, tutorial and mini story), the player's own critter
art, the Christmas edition (stall, catalogue book with page turning, 14
items placed on floor / back wall / counter), new Marketplace stall art,
and Arrange mode on every screen.

Open / next options:
- **Cafe room painter** (optional step 5 of Arrange mode): paint the room's
  tiles (walls, counter, door, queue spots) instead of editing
  `src/data/cafeLayout.ts`; would allow a bigger room. Ask the user first.
- Later features are listed in `GAME_DESIGN.md` §7 (customer groups, more
  furniture and a bigger room, staff roles, farming, choose your animal,
  wardrobe, music, pixel font, multiplayer places with chat safety, desktop
  build — postponed).
