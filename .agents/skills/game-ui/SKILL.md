---
name: game-ui
description: Build Woodland Cafe interactive pixel-art interfaces using existing Phaser panels and named layouts. Use for shops, inventory, dialogue, wardrobe, museum controls, responsive spacing and decoration or dragging interactions.
---

# Game interfaces

Follow [AGENTS.md](../../../AGENTS.md) and relevant design sections. Reuse approved artwork and components.

## Workflow

1. Read the closest panel, scene caller, text data, theme and layout JSON. Trace each control's transaction.
2. Reuse `Button`, `LeafText`, styles and panel patterns. Plan bounds, padding, hit areas and empty/locked states.
3. Use `layoutPoint` and Arrange hooks: `arrangeablePanel` for overlays, `sizeBox` for graphics and `arrangeRule` for constraints. Preserve saved overrides.
4. Wire guarded actions through pure logic and appropriate game-store helpers. Disable both appearance and behaviour; scope selected case/item IDs safely.
5. Handle close, drag cancellation, pause/resume and teardown with existing patterns. Remove listeners/tweens and prevent pointer-up click-through.
6. Inspect actual rendering/input at available viewport sizes; run meaningful regressions and root gates. Report unavailable checks.

## Constraints and conventions

- Base canvas is 640x360, integer-scaled when it fits with FIT fallback below that. Check both; avoid fractional sprite resizing/smoothing.
- Check margins, card/row gaps and icon padding with long names, large/zero counts, prices, badges and multi-line text. Borders must not touch decorative artwork.
- Leaves use `LeafText`; event currency uses its registered ticket sprite. Add copy through applicable text data/rules.
- Preserve Button press/release guards and enabled keyboard activation. Grey controls must not execute through another route.
- Use existing deferred destruction patterns. Check repeated opens, scene changes and Arrange refreshes for listener accumulation.
- Respect overlay-specific pause policy: inventory/notes track paused scenes; wardrobe may leave the world running. Resume only scenes that overlay paused.
- Dragging follows cafe decoration conventions: preserve pointer offsets, validate placement and restore state on Cancel. Continuous movement need not grid-snap merely because rendering rounds pixels.

## Validation and examples

Inspect native/enlarged readability, padding, clipping and hit areas. Exercise keyboard/pointer close/cancel, disabled actions, repeated opens and state refresh. Test behavioural regressions, not cosmetic constants.

- Empty museum cases disable Clear; clearing B preserves A.
- Christmas sale cards show weighted ticket return and consistent spacing for empty/populated states.
- Wardrobe previews every facing without overlapping tabs, badges or frames.
