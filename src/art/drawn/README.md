# Hand-drawn sprites

Put a PNG here named after a code-drawn sprite (the names are in
`src/art/spriteArt.ts`, e.g. `leaf.png`) and the game uses it instead of the
code version. Restart `npm run dev` after adding a new file.

- Use only the Endesga 32 palette, with a transparent background.
- Draw at real size: the same size as the code-drawn sprite (no scaling up).
- Animations are a horizontal strip of frames, each that size.
