# Critter drawing template

A skeleton for drawing new critters in the same body shape as the hedgehog,
rabbit, mouse and deer. `node tools/importCritterSkeleton.cjs` imports its pixels
for the drawing-template section in the sprite gallery.

| File | What it is |
| --- | --- |
| `critter-skeleton.png` | The body: four frames side by side (128x40), transparent background. Draw over it. |
| `critter-guides.png` | Guide lines, same size, half see-through. Put it on its own layer above the skeleton. |
| `critter-skeleton-preview.png` | Both together at 8x, just to look at. |

## Frames

Each frame is **32x40**, left to right: **front, back, facing left, facing right**.
Draw only the standing poses: the game makes the two walking steps itself
by lifting one foot, then the other.

## The rules

- **Feet on the bottom row** (the red ground line), centred in the frame.
- **Eyes on the blue dotted eye line.** Front: two eyes, 2 pixels wide and 3
  tall, where the red spots are, with a small nose in the middle below them
  (the red mark). Side views: one eye, on the snout side.
- **Ears, antlers, spines and hair go above the green dotted line.** Keep them
  inside the frame (32 wide, 40 tall).
- **Front and back are mirror images.** Draw one half and flip it, so both eyes
  always match.
- **Left is the mirror of right.** Draw one and flip it horizontally.
- **Dark outline all round**, with no see-through gaps inside it.
- **Any colours you like.** Your own art keeps its colours (it doesn't have to
  use the game's 32-colour palette).

## In Pixquare

1. Import `critter-skeleton.png` as a new canvas (128x40).
2. Import `critter-guides.png` as a layer on top, and lower its opacity if needed.
3. Add a new layer between them for your drawing, then hide the guides and the
   skeleton when you're done.
4. Export just your drawing as a PNG (128x40, transparent background), and it's
   ready to go into the game.
# Seed pouch references

`seed-pouch-source.png` is the supplied pouch sheet; `seed-pouch-panel-source.png` is the supplied panel reference. Run `node tools/seedPouchArt.cjs` and `node tools/seedPouchPanelArt.cjs` from the repository root to regenerate their letter-grid assets. Both scripts use the project's PowerShell image decoder.

The panel import removes only the exterior backdrop and sample inventory area. It retains the decorative pouch, wooden title and border; game code draws packet choices, quantities and hit areas over the cleared centre. Keep all future cleanup in those scripts so regenerating preserves the fixes.
