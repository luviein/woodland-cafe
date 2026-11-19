# Island map artwork

`source/island.png` is the user's approved illustration with quality fixes,
supplied on 19 November 2026, replacing the earlier island illustration.
Load it directly and preserve its bytes. `src/data/mapPresentation.ts` maps
its landmarks and labels to the 640×360 game canvas.

The source includes an example wallet and HUD. A frame from blank parchment
inside that wallet covers its sample contents so the live `LeafText` balance
can occupy the original frame. The three illustrated HUD buttons use hit
areas connected to the existing HUD panels; the PNG itself is not repainted.

`src/ui/MapWater.ts` isolates an existing cyan ripple from the source once at
load time, preserving its colours and removing only the surrounding blue sea.
Eight anchored overlays drift and fade over open water. The source PNG stays
unchanged, and no textures are created during animation.

## Waterfall

`source/waterfall-sheet.png` preserves the approved six-frame sheet. The
derived `waterfall.png` contains only water and foam, masked to the original
map's water footprint; the map's rocks and plants are never part of an
animation frame. `waterfall.json` records the extraction, placement and
140 ms frame duration. The generated 53×54 frames render at native size
with nearest-neighbour filtering, looping every 840 ms.

Regenerate from the preserved sources with:

```powershell
powershell -NoProfile -File tools/build-map-waterfall.ps1
```

Pass `-PreviewPath <path.png>` to inspect all six enlarged map composites.
The sprite gallery also shows a continuously looping map preview.

## Approved flower repair

`source/flower-approved.png` is the petal-and-stem correction approved by the
user. `flower.json` records its match to the original flower cluster near the
lower-left path. The small `flower.png` overlay uses only that approved crop;
its mask covers the old cluster and its filtered edges while leaving the
surrounding grass transparent. It renders at native 37×37 with nearest-neighbour
filtering and moves with the map illustration in Arrange mode. The original
`source/island.png` remains unchanged.

Regenerate and optionally compare at enlarged game resolution:

```powershell
powershell -NoProfile -File tools/build-map-flower.ps1 -PreviewPath <path.png>
```

The sprite gallery's Map flower repair PNG section also shows before/after.
