# Island map artwork

`source/island.png` is the user's approved illustration with quality fixes,
supplied on 19 November 2026, replacing the earlier island illustration.
Load it directly and preserve its bytes. `src/data/mapPresentation.ts` maps
its landmarks and labels to the 640×360 game canvas.

The source includes an example wallet and HUD. A frame from blank parchment
inside that wallet covers its sample contents so the live `LeafText` balance
can occupy the original frame. The three illustrated HUD buttons use hit
areas connected to the existing HUD panels; the PNG itself is not repainted.
