// Hand-drawn PNGs in src/art/drawn/, found when the game is built.
// import.meta.glob is a Vite feature: it lists the matching files at build
// time and gives each one's URL, so the game knows exactly which drawings
// exist without trying to load files that might not be there (no 404s).

const files = import.meta.glob<string>('./drawn/*.png', { eager: true, query: '?url', import: 'default' });

/** Sprite name (the file name without .png) → the PNG's URL. */
export const DRAWN_ART: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([path, url]) => [path.slice('./drawn/'.length, -'.png'.length), url]),
);
