---
name: sprite-integration
description: Integrate user-approved Woodland Cafe sprites, sheets, animation, four-direction views, tile graphics and wearable layers into Phaser. Use for registration, frame mapping, origins and layering, not artwork generation or redrawing.
---

# Technical sprite integration

Follow [AGENTS.md](../../../AGENTS.md). Preserve approved artwork. Request approved assets when missing views or damaged pixels require visual changes.

## Workflow

1. Inspect approval scope, dimensions, transparency, native grid and frame order; read neighbouring sprite definitions, registration and rendering.
2. Identify letter-grid, `src/art/drawn/` PNG override or procedural generator paths. Do not patch generated output alone.
3. Register through `src/art/spriteArt.ts` and existing helpers; inspect `BootScene.ts` spritesheet loading. Keep code/override frame dimensions consistent; add a gallery group.
4. Match existing timing, frame mapping, origins and attachment offsets in native coordinates.
5. Inspect native and nearest-neighbour enlarged renders, then actual scene/wardrobe views. Check every affected facing/pose.
6. Run art/data tests and root gates. Report views checked and unavailable visual verification.

## Constraints and conventions

- PixelSprite legends map symbols to colours; `.` is transparent. Validate legends, dimensions and frame bounds with existing art checks and `spriteProblems`.
- Standard critters use front/back/left/right with three poses each: `view * 3 + pose`. Inspect exceptions; synchronise body/clothing frames and flips.
- Preserve bottom anchors, baselines and headroom. Inspect `clothingFits.ts`, `clothingRig.json` and `frogFitting.ts` when relevant; animal geometry differs.
- Preserve shoes/top/cape/hat order and per-facing behaviour. Check hats, eyes, tails and feet walking/turning, including shared customer rendering.
- Cafe tiles are 24px, outdoor ground tiles 16px. Extend existing custom grids; do not replace them with a new tilemap engine merely to integrate assets.
- Keep pixelArt rendering, integer scaling and texture lifecycle. Avoid smoothing, fractional resizing and per-frame texture creation.
- Read legacy `.claude/skills/pixel-sprites/` instructions before using integration/preview helpers. Static parsers may not load procedural modules; use gallery/renderer instead. Tools do not authorise artwork changes.

## Validation and examples

Test asset contracts, registration, alpha and frame bounds; visually inspect alignment rather than asserting copied offset constants.

- An approved winter hat must align across supported animals/views/poses, especially frog side profiles.
- An approved seed packet keeps its complete border at existing shop/inventory sizes without repainting its emblem.
