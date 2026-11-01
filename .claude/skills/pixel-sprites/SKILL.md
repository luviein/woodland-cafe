---
name: pixel-sprites
description: Turn the player's drawn or generated pixel-art images into Woodland Cafe game sprites, and clean sprites up pixel by pixel. Use this whenever the user shares an image (a critter sheet, a reference picture, item or furniture art, a stall, an icon) to put in the game, asks to convert or import art, or points at a sprite in the game or the sprite gallery that looks wrong — broken or missing outline pixels, a lighter or darker pixel in a line, stray specks, colours bleeding in from the background, things outside a frame, eyes that don't match, views that don't match each other (ears, tails), a side view on all fours — even when they only send a screenshot and say "fix this".
---

# Pixel sprites

The user makes the art (drawn, or generated and picked by them) and sends it as
images. This skill turns those images into the game's sprites — plain letter
grids in `src/art/sprites/*.ts` — and fixes them when the user spots problems.
It was built from the critter sheets, the raccoon reference and the Christmas
catalogue items; the defects the user caught then are in
`references/defects.md`, and every new sprite should be checked against it
before showing it to them.

The user reviews art closely, pixel by pixel, in the sprite gallery
(`/sprites.html` under `npm run dev`). They notice single missing or
off-colour pixels. Look at your own result just as closely before reporting:
render it big and Read the PNG. Never report a fix you haven't looked at.

## Tools (in `scripts/`, plain Node, no installs)

| Script | Does |
|---|---|
| `decode.ps1 <image> <out.rgb>` | Any png/jpg/webp to raw RGB; prints `width height`. Run with `powershell -File`. |
| `find.cjs <rgb> <W> <H> [--green] [--overview out.png]` | Lists the drawings (boxes), top-left first; the overview PNG numbers them so you can match names. Text labels show as wide, short boxes: skip them. |
| `convert.cjs <job.json>` | Drawings to sprite rows with one shared palette, plus a preview PNG. Job format is in the file's header. |
| `render.cjs <file.ts> <NAME,...> <out.png> [scale] [frames]` | A game sprite drawn big (its own legend), and its holes/specks reported. Use before and after every fix. |
| `pixel.cjs` | The library: converting (`nativeGrid`, `shrink`, `toRows`), clean-ups (`despeck`, `fillHoles`, `outlineEdges`, `recolour`, `flipH`, `mirrorFace`, `backFromFront`, `fitAll`, `walkSteps`), checks (`problems`), sprite files (`readSprite`, `writeSprite`, `legendTs`), `preview`. Each function has a comment saying what it's for. |

Keep the scratch work (decoded images, job files, previews, the touch-up
script) in the session's scratchpad, not the repo. Source images the user
sends are usually in `~/Downloads` or the session's `images/` folder.

## Converting new art

1. **Decode and find.** `decode.ps1`, then `find.cjs --overview` and Read the
   overview to name each drawing. Note what each one is for in the game.

2. **Pick the method** — this is the most important choice:
   - **`native`** when the drawing is already pixel art at about the size the
     sprite should be (each art pixel is a clean block of 3-8 screen pixels):
     critter sheets, a reference picture of one critter. It finds the block
     size and offset, so every pixel survives. Set `"shared": true` for a
     sheet: its drawings share one block size, and the evidence summed over
     all of them is much steadier (a resized screenshot draws art pixels
     unevenly, 3 then 4 wide). If the preview looks smeared or doubled, try
     `"fixedP"` a little either side of what it found.
   - **`shrink`** when the drawing is much bigger than the sprite (generated
     item art, a stall): give each item a target `width`. Thin outlines are
     kept by turning outline-heavy blocks into outline. Expect small details to
     simplify (ornaments become single pixels) and thin things (strings of
     lights) to break up — those may need drawing by hand.

3. **Sizes** — the game's grid (check `src/data/cafeLayout.ts` and existing
   sprites if unsure): the cafe uses 24px tiles. Table and chair are 24x24 on
   one tile; floor items about a tile wide (a tree may be taller); wall pieces
   fit a 24px-wide wall tile. Critters are about 27-38 wide and 30-38 tall, feet
   on the bottom row. A Marketplace stall is 40x32 (a fancy one, like the
   Christmas stall, 72 wide).

4. **Convert and look.** Write a job file, run `convert.cjs`, Read the
   preview next to the original. Adjust (colours, width, method) and rerun.

5. **Clean up, in a script.** Write one touch-up script that reads the
   converted rows, applies every fix, and writes the sprite file with
   `writeSprite`/`legendTs`. Put each fix in the script rather than editing
   the .ts by hand, so a rerun (a new palette, a new width) keeps them all.
   Comment each fix with why. Go through `references/defects.md`.

6. **Critters** need four views in the frame order front, back, left, right
   (`VIEW` in `sheetCritters.ts`), each standing plus two steps (`walkSteps`),
   all the same size (`fitAll`). Mirror the face (`mirrorFace`) so the eyes
   match; make the right view `flipH(left)`; and check the views agree with
   each other (same ears, one tail, upright side views).

7. **Wire it in**: register in `src/art/spriteArt.ts` (and a list like
   `CHRISTMAS_ART` for a set), add a gallery group in `src/gallery/main.ts`
   with a source line, then `npm run typecheck`, `npx vitest run` (the art
   tests run the same quality checks as the gallery: holes, stray pixels,
   symmetrical faces) and `npm run build`.

8. **Hand it to the user** to review in the gallery: say what you changed or
   invented (anything drawn by hand, anything cut), and what to look at.
   Follow the project's usual steps (design note first when it's a design
   change, commit, push).

## Fixing a sprite the user points at

1. Find the sprite (`grep -n "export const NAME" src/art/sprites/*.ts`) and
   `render.cjs` it big; compare with their screenshot to see exactly which
   pixels they mean. Printing the rows with numbered lines helps place them.
2. Name the cause, not just the pixel: is it the outline colour reused as
   shading, background bleeding in, a bulb drawn over a wire, a view built
   from a smudge? `references/defects.md` lists the ones seen so far.
3. Fix it in the touch-up script for that art if there is one (so reruns keep
   it), otherwise with a small script using `readSprite`/`writeSprite`. Watch
   for files with Windows line endings: the library normalises them, but
   plain `sed` or string replacement may not match.
4. Render again, Read it, then run the tests. Tell the user what was wrong and
   what changed, in a sentence or two each.

If a piece can't be made to look right after a couple of honest tries (the
squirrel's two tails), say so and offer choices: a redrawn source image, or
leaving it out. The user may prefer removing it.
