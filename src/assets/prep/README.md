# Approved prep layers

The original bread-bottom, mushroom and jam images are preserved in `source/`.
Each contains three full-width artwork options; the complete centre strip is
used as a static layer. `layers.json` records its source crop and game size.

Regenerate the transparent PNGs with:

```powershell
powershell -NoProfile -File tools/build-prep-layers.ps1 -PreviewPath <path.png>
```

The source checkerboard is opaque. The script removes only neutral black/grey
background pixels connected to the crop edge, preserving enclosed details,
then samples the existing colours with nearest-neighbour resizing. It does
not redraw, recolour or generate additional views.

Boot registers 12px left/right caps and a 32px repeating middle from each
56×8 strip. The power-of-two middle avoids Phaser resampling it to a larger
texture before tiling, keeping the approved pixels crisp. DishView reads
frame dimensions so the approved details also
work on the plate, toaster, drag copy and small recipe previews. Stack pitch
and existing top-bread/toasted-bread art are retained. Bin icons, recipes,
stock transactions and scoring are unchanged. Code sprites remain fallbacks
if a PNG fails to load; a user PNG override in `src/art/drawn/` still wins.
