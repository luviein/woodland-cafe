import './gallery.css';
import { COLLECTION_ART } from '../art/sprites/christmasClothing';
import { MANNEQUIN_ART } from '../art/sprites/mannequins';
import { CRITTER_ART, spriteQuality } from '../art/checks';
import { DRAWN_ART } from '../art/drawnArt';
import { framePixels, spriteSize } from '../art/pixelSprite';
import { ART_NAMES, CHRISTMAS_ART, SPRITE_ART, VIEW_ART, type ArtName } from '../art/spriteArt';
import { VIEW, viewFrame } from '../art/sprites/sheetCritters';
import { INGREDIENT_IDS } from '../data/ingredients';

// The sprite gallery (GAME_DESIGN.md §9.2), for `npm run dev` only: open
// /sprites.html. Every sprite in the game, grouped, with where it comes from,
// its frames, critters walking in every view, the same quality checks the
// tests run (art/checks.ts), and the critters next to the furniture at real
// scale. Read-only: change a sprite in its file (or drop a PNG in
// src/art/drawn/) and this page and the game both update.

/** The Marketplace stalls converted from the player's drawings. */
const MARKET_STALLS: readonly ArtName[] = ['pantryStall', 'specialtyStall', 'toolsStall', 'carpenterStall', 'noticeBoard'];
const WARDROBE_ART: readonly ArtName[] = [
  ...Object.keys(COLLECTION_ART) as ArtName[],
  'santaHat', 'santaCoat', 'hedgehogSantaPreview',
  'rabbitSantaHat', 'rabbitSantaCoat', 'rabbitSantaPreview',
  'mouseSantaHat', 'mouseSantaCoat', 'mouseSantaPreview',
  'deerSantaHat', 'deerSantaCoat', 'deerSantaPreview',
];

const STEP_MS = 140; // as ui/sprites.ts: how long each walking step shows

// ---- Groups -----------------------------------------------------------------

const GROUPS: [string, (name: ArtName) => boolean][] = [
  ['Catalogue mannequins', (n) => n in MANNEQUIN_ART],
  ['Stall vendor', (n) => n === 'deerVendorIdle'],
  ['Wardrobe collection', (n) => WARDROBE_ART.includes(n)],
  ['Critters', (n) => CRITTER_ART.includes(n)],
  ['Cafe', (n) => ['floor', 'wall', 'door', 'counter', 'table', 'chair', 'orderRug', 'pawPrint', 'mess', 'plate'].includes(n)],
  ['Kitchen', (n) => (INGREDIENT_IDS as string[]).includes(n) || n.endsWith('Layer') || n === 'toaster'],
  ['Christmas', (n) => (CHRISTMAS_ART as readonly ArtName[]).includes(n)],
  ['Outdoors and map', (n) => ['leaf', 'grass', 'forestFloor', 'tree', 'mapTree', 'mushroomPatch', 'berryBush', 'stall', 'cafeHouse', ...MARKET_STALLS].includes(n)],
  ['Icons and effects', () => true], // everything else
];

function groupOf(name: ArtName): string {
  return GROUPS.find(([, has]) => has(name))![0];
}

function source(name: ArtName): string {
  if (DRAWN_ART.has(name)) return `your PNG (src/art/drawn/${name}.png)`;
  if (name in MANNEQUIN_ART) return 'wooden catalogue display using the reviewed clothing fittings (sprites/mannequins.ts)';
  if (name === 'deerVendorIdle') return 'your deer in the Santa outfit, with matching blinking eyes (sprites/stallVendorIdle.ts)';
  if (name in COLLECTION_ART) return 'drawn in code from your Christmas reference, using the reviewed animal fittings (sprites/christmasClothing.ts)';
  if (WARDROBE_ART.includes(name)) return 'redrawn from your Christmas clothing reference, individually fitted (tools/wardrobeArt.cjs and tools/wardrobeCritters.cjs)';
  if (VIEW_ART.has(name)) return 'converted from your critter sheet';
  if ((CHRISTMAS_ART as readonly ArtName[]).includes(name)) return 'converted from your Christmas drawings';
  if (MARKET_STALLS.includes(name)) return 'converted from your Marketplace drawings';
  return 'drawn in code';
}

// ---- Drawing ----------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

/** Draws one frame of a sprite onto a canvas context at a whole-number scale. */
function paint(ctx: CanvasRenderingContext2D, name: ArtName, frame: number, x0: number, y0: number, scale: number, flip = false): void {
  const sprite = SPRITE_ART[name];
  const { width } = spriteSize(sprite);
  for (const p of framePixels(sprite, frame)) {
    ctx.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
    const x = flip ? width - 1 - p.x : p.x;
    ctx.fillRect(x0 + x * scale, y0 + p.y * scale, scale, scale);
  }
}

/** A canvas showing one frame at `scale`. */
function frameCanvas(name: ArtName, frame: number, scale: number, flip = false): HTMLCanvasElement {
  const { width, height } = spriteSize(SPRITE_ART[name]);
  const canvas = el('canvas', { width: width * scale, height: height * scale });
  paint(canvas.getContext('2d')!, name, frame, 0, 0, scale, flip);
  return canvas;
}

/** The scale that makes a sprite about `target` pixels on its long side (whole numbers keep pixels square). */
const scaleFor = (name: ArtName, target: number) => {
  const { width, height } = spriteSize(SPRITE_ART[name]);
  return Math.max(1, Math.floor(target / Math.max(width, height)));
};

/** Animations that run on the page: each redraws its canvas from the frame list, one step at a time. */
const walkers: { canvas: HTMLCanvasElement; name: ArtName; frames: number[]; flip: boolean; scale: number }[] = [];
function animate(time: number): void {
  for (const w of walkers) {
    const ctx = w.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
    paint(ctx, w.name, w.frames[Math.floor(time / STEP_MS) % w.frames.length], 0, 0, w.scale, w.flip);
  }
  requestAnimationFrame(animate);
}

/** A critter walking in each direction it can face. */
function walkStrip(name: ArtName): HTMLElement {
  const strip = el('div', { className: 'walk' });
  const scale = scaleFor(name, 96);
  const { width, height } = spriteSize(SPRITE_ART[name]);
  const add = (label: string, frames: number[], flip = false) => {
    const canvas = el('canvas', { width: width * scale, height: height * scale });
    walkers.push({ canvas, name, frames, flip, scale });
    strip.append(el('div', { className: 'frame' }, canvas, `walking ${label}`));
  };
  if (VIEW_ART.has(name)) {
    for (const view of ['front', 'back', 'left', 'right'] as const) add(view, [viewFrame(VIEW[view], 1), viewFrame(VIEW[view], 2)]);
  } else {
    add('right', [1, 2]);
    add('left', [1, 2], true); // the game mirrors the right-facing art
  }
  return strip;
}

function card(name: ArtName): { node: HTMLElement; problems: string[] } {
  const sprite = SPRITE_ART[name];
  const { width, height } = spriteSize(sprite);
  const problems = spriteQuality(name);
  const scale = scaleFor(name, 72);
  const frames = el('div', { className: 'frames' });
  sprite.frames.forEach((_, f) => {
    const label = VIEW_ART.has(name) ? `${['front', 'back', 'left', 'right'][Math.floor(f / 3)]} ${['stand', 'step', 'step'][f % 3]}` : `frame ${f}`;
    frames.append(el('div', { className: 'frame' }, frameCanvas(name, f, scale), label));
  });
  frames.append(el('div', { className: 'frame' }, frameCanvas(name, 0, 1), 'game size'));
  const node = el(
    'div',
    { className: problems.length ? 'card warn' : 'card' },
    el('h3', {}, name),
    el('div', { className: 'meta' }, `${width}x${height}, ${sprite.frames.length} frame${sprite.frames.length > 1 ? 's' : ''}, ${source(name)}`),
    frames,
  );
  if (CRITTER_ART.includes(name) || VIEW_ART.has(name)) node.append(walkStrip(name));
  if (DRAWN_ART.has(name)) {
    node.append(el('div', { className: 'meta' }, 'In the game your PNG is used; the checks and frames above are the code version it replaces.'));
  }
  if (problems.length) {
    const list = el('ul', { className: 'problems' });
    list.append(...problems.map((p) => el('li', {}, p)));
    node.append(list);
  }
  return { node, problems };
}

/** The critters next to a table, chairs and the counter, at real (game) proportions, enlarged. */
function scaleView(): HTMLElement {
  const S = 3, T = 24;
  const critters = CRITTER_ART;
  const widthTiles = 5 + critters.length * 2;
  const canvas = el('canvas', { width: widthTiles * T * S, height: 3 * T * S });
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < widthTiles; x++) for (let y = 0; y < 3; y++) paint(ctx, 'floor', (x + y) % 2, x * T * S, y * T * S, S);
  // The counter, then a table with a stool each side, on the middle row.
  for (let x = 0; x < 2; x++) paint(ctx, 'counter', 0, x * T * S, T * S, S);
  paint(ctx, 'chair', 0, 2 * T * S, T * S, S);
  paint(ctx, 'table', 0, 3 * T * S, T * S, S);
  paint(ctx, 'chair', 0, 4 * T * S, T * S, S);
  // Each critter standing on the middle row, feet on the tile's bottom edge.
  critters.forEach((name, i) => {
    const { width, height } = spriteSize(SPRITE_ART[name]);
    const tileX = 5.5 + i * 2;
    paint(ctx, name, 0, Math.round((tileX * T + T / 2 - width / 2) * S), (2 * T - height) * S, S);
  });
  return el('div', { className: 'scale-view' }, canvas);
}

// ---- The page -----------------------------------------------------------------

const FOLDED_KEY = 'woodland-sprite-gallery-folded';
function readFolded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
const folded = readFolded();

function group(title: string, problemCount: number, content: HTMLElement): HTMLElement {
  const summary = el('summary', {}, title);
  if (problemCount) summary.append(el('span', { className: 'flag' }, `⚠ ${problemCount}`));
  const box = el('details', { className: 'group', open: !folded.has(title) }, summary, content);
  box.addEventListener('toggle', () => {
    if (box.open) folded.delete(title);
    else folded.add(title);
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify([...folded]));
    } catch {
      // Just not remembered this time.
    }
  });
  return box;
}

function build(): void {
  const root = document.getElementById('gallery')!;
  const main = el('main');
  let total = 0;
  main.append(group('Side by side (real proportions)', 0, scaleView()));
  for (const [title] of GROUPS) {
    const names = ART_NAMES.filter((n) => groupOf(n) === title);
    const cards = el('div', { className: 'cards' });
    let flagged = 0;
    for (const name of names) {
      const { node, problems } = card(name);
      if (problems.length) flagged++;
      cards.append(node);
    }
    total += flagged;
    main.append(group(`${title} (${names.length})`, flagged, cards));
  }
  const status = total ? `⚠ ${total} sprite${total > 1 ? 's' : ''} need a look` : 'All sprites pass the checks';
  root.append(el('header', {}, el('h1', {}, 'Woodland Cafe: sprites'), el('span', {}, `${ART_NAMES.length} sprites · ${status}`)), main);
  requestAnimationFrame(animate);
}

build();
