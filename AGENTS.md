# Woodland Cafe — guide for coding agents

A cosy 2D pixel-art cafe game with customisable woodland critters. The player
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
npx vitest run     # all tests (Node environment, no browser)
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

## Technical development scope

The user generates and approves artwork separately. Do technical integration
only: do not generate replacement artwork, redraw, recolour or invent missing
sprite views. Request approved assets when a fix needs visual changes. The
legacy art tools below do not override this constraint.

Never delete, reset or overwrite player progress without explicit approval.
This includes clearing storage, `wipesave`, destructive migrations and silently
replacing an unreadable save with a new game. Use isolated test data.

Inspect related code and design before editing. Reuse working architecture;
avoid unnecessary rewrites or dependencies without justification. Preserve
strict TypeScript, typed content IDs and immutable, serializable state.
Inject randomness/time into pure logic where needed. Use the domain helpers
in `gameStore.ts`: garden, museum and Christmas purchases have special
cafe-day checkpoint behaviour. Do not use `saveNow` merely to force autosave.

## Project skills — select automatically

Read the relevant skill before work in its domain; the user need not invoke
it explicitly. Combine skills for tasks spanning domains and briefly announce
which apply. Descriptions support automatic discovery; full instructions load
when selected. Explicit invocation such as `$game-ui` also works.

| Skill | Use for |
| --- | --- |
| [game-systems](.agents/skills/game-systems/SKILL.md) | Mechanics, progression, inventory transactions, economy and unlocks |
| [game-data-and-saves](.agents/skills/game-data-and-saves/SKILL.md) | State, persistence, compatibility, migrations and integrity |
| [sprite-integration](.agents/skills/sprite-integration/SKILL.md) | Approved assets, frame mapping, movement views, tiles and wearable layering |
| [game-ui](.agents/skills/game-ui/SKILL.md) | Panels, padding, input, shops, inventories and decoration controls |
| [game-testing](.agents/skills/game-testing/SKILL.md) | Meaningful tests, regressions, debugging and measured performance checks |

Check current dependency versions in `package.json` and the lockfile. Additional
architecture includes `src/storage/` save slots, `src/roomEditor/` and room
save routes. Standard rendering uses a 640×360 canvas with integer scaling
when it fits and FIT fallback on smaller viewports; outdoor tiles are 16px.

## Legacy art tools

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

For authorised technical integration, preserve regeneration sources rather
than editing generated output alone. Register new approved sprites in
`spriteArt.ts` and give them a gallery group in `src/gallery/main.ts`.

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
- Check rendered padding, positioning, readability and disabled behaviour
  for UI changes. Add meaningful rule/regression tests, avoiding tests that
  merely mirror implementation or add bloat for reversible cosmetic changes.
- In PowerShell use `npm.cmd`/`npx.cmd` if `.ps1` execution is blocked. Use
  UTF-8 when reading/writing files. Do not start new approval flows for
  routine work already authorised. Instruction setup alone is not gameplay
  and does not require a game-design change.

## Current feature status

Read current code and `GAME_DESIGN.md` for implemented features and future
milestones. Gardening, crop weights/records, museum displays, room editing
and wardrobe systems already exist; inspect them before proposing replacements.
