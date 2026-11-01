// Pixel-sprite toolkit: turn a drawing (a decoded image) into game sprites,
// clean them up, preview them, and read/write sprites in src/art/sprites/*.ts.
//
// Sprites here are "rows": an array of equal-length strings, one letter per
// pixel, '.' for see-through, with a legend { letter: '#rrggbb' } — the same
// shape as PixelSprite frames in the game, so every clean-up works on new
// conversions and on sprites already in the game alike.
//
// No dependencies (plain Node). Images come in as raw RGB from decode.ps1.

const fs = require('fs');
const zlib = require('zlib');

// ---- Images -------------------------------------------------------------------

/** A raw RGB image (from decode.ps1): px(x, y) -> [r, g, b]. */
function loadRaw(file, W, H) {
  const buf = fs.readFileSync(file);
  if (buf.length !== W * H * 3) throw new Error(`${file}: expected ${W}x${H} RGB (${W * H * 3} bytes), got ${buf.length}`);
  return { W, H, px: (x, y) => { const o = (y * W + x) * 3; return [buf[o], buf[o + 1], buf[o + 2]]; } };
}

const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const near = (a, b, tol) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol;
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
/** The game's palette (src/art/palette.ts), by name, for legends that use names instead of '#rrggbb'. */
let paletteCache = null;
function paletteHex(name) {
  if (!paletteCache) {
    const file = require('path').join(process.cwd(), 'src/art/palette.ts');
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    paletteCache = Object.fromEntries([...text.matchAll(/(\w+): 0x([0-9a-fA-F]{6})/g)].map((m) => [m[1], '#' + m[2]]));
  }
  const h = paletteCache[name];
  if (!h) throw new Error(`unknown colour '${name}' (not '#rrggbb', not in src/art/palette.ts; run from the project root)`);
  return h;
}
const rgbOf = (h) => { if (!h.startsWith('#')) h = paletteHex(h); return [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16)); };

/**
 * Background test for an image. Default: close to the corner pixel (plain
 * backgrounds). Pass `isBg` for others, e.g. a green field:
 * ([r, g, b]) => g > r + 25 && g > b + 25.
 */
function bgTest(img, { tol = 40, isBg } = {}) {
  if (isBg) return isBg;
  const bg = img.px(2, 2);
  return (c) => near(c, bg, tol);
}

/** The drawings in an image: 8-connected areas that aren't background, biggest first. */
function findBlobs(img, { min = 400, ...bgOpts } = {}) {
  const { W, H, px } = img;
  const isBg = bgTest(img, bgOpts);
  const seen = new Uint8Array(W * H);
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen[y * W + x] || isBg(px(x, y))) continue;
    const st = [y * W + x]; seen[y * W + x] = 1;
    let x0 = x, x1 = x, y0 = y, y1 = y, n = 0;
    while (st.length) {
      const i = st.pop(); const a = i % W, b = (i / W) | 0; n++;
      if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = a + dx, ny = b + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!seen[j] && !isBg(px(nx, ny))) { seen[j] = 1; st.push(j); }
      }
    }
    if (n >= min) out.push({ x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  return out.sort((a, b) => b.n - a.n);
}

/** k-means colour clusters (k colours), darkest first. */
function palette(samples, k, iterations = 20) {
  const sorted = samples.slice().sort((a, b) => lum(a) - lum(b));
  let centres = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / k)].slice());
  const nearest = (c) => { let bi = 0, bd = Infinity; for (let i = 0; i < centres.length; i++) { const d = dist2(c, centres[i]); if (d < bd) { bd = d; bi = i; } } return bi; };
  for (let it = 0; it < iterations; it++) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (const s of samples) { const i = nearest(s); sum[i][0] += s[0]; sum[i][1] += s[1]; sum[i][2] += s[2]; sum[i][3]++; }
    centres = centres.map((c, i) => (sum[i][3] ? sum[i].slice(0, 3).map((v) => v / sum[i][3]) : c));
  }
  return centres.map((c) => c.map(Math.round)).sort((a, b) => lum(a) - lum(b));
}

/** Pixel samples (every `step`th) inside boxes, background left out: input for palette(). */
function samplesOf(img, boxes, { step = 3, ...bgOpts } = {}) {
  const isBg = bgTest(img, bgOpts);
  const out = [];
  for (const b of boxes) for (let y = b.y0; y <= b.y1; y += step) for (let x = b.x0; x <= b.x1; x += step) {
    const c = img.px(x, y); if (!isBg(c)) out.push(c);
  }
  return out;
}

// ---- Converting -----------------------------------------------------------------
// Two ways, depending on the drawing:
//  - nativeGrid: the drawing IS pixel art, just scaled up (each art pixel is a
//    P x P block). Find P and the offset, take each block's middle. Keeps every
//    pixel; use it when the result should be about the drawing's own size
//    (the critter sheets, the raccoon reference).
//  - shrink: the drawing is bigger than the sprite should be. Each sprite pixel
//    is a block of the drawing; thin outlines would vanish, so a block with
//    enough outline in it becomes outline (the Christmas items).

const LETTERS = 'abcdefghijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Palette-index grids -> rows, all sharing one legend (only the colours they
 * use). The darkest colour is 'o' (outline), the rest by lightness.
 * Returns { rows: rows[] (one per grid), legend }.
 */
function toRows(grids, centres) {
  const used = [...new Set(grids.flat(2).filter((c) => c !== null))].sort((a, b) => lum(centres[a]) - lum(centres[b]));
  if (used.length > LETTERS.length + 1) throw new Error(`too many colours (${used.length})`);
  const letter = new Map(used.map((c, i) => [c, i === 0 ? 'o' : LETTERS[i - 1]]));
  return {
    rows: grids.map((g) => g.map((r) => r.map((c) => (c === null ? '.' : letter.get(c))).join(''))),
    legend: Object.fromEntries(used.map((c) => [letter.get(c), hex(centres[c])])),
  };
}

/**
 * Native-grid sampling: finds the drawing's pixel size P (pMin..pMax) and grid
 * offset, then takes each block's middle colour.
 * Returns { grid (palette indexes / null), P, score }.
 *
 * How the grid is found: add up how much the colour changes between each
 * screen column and the next (and each row and the next). In pixel art those
 * changes only happen at art-pixel boundaries, so the totals peak every P
 * screen pixels, even in a resized screenshot where edges blur over two pixels.
 * Each candidate P and offset is scored by the average total on its boundary
 * lines, against the overall average (1 = no better than chance). Half of the
 * true P lands on valleys too, so it scores lower; double the true P scores as
 * well as P, so among near-best sizes the smallest wins.
 */
function gridFits(img, box, { pMin = 3, pMax = 8, pStep = 0.02, fixedP } = {}) {
  const colProfile = new Float64Array(img.W), rowProfile = new Float64Array(img.H);
  for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
    if (x > box.x0) colProfile[x] += Math.sqrt(dist2(img.px(x, y), img.px(x - 1, y)));
    if (y > box.y0) rowProfile[y] += Math.sqrt(dist2(img.px(x, y), img.px(x, y - 1)));
  }
  const comb = (profile, lo, hi, P) => {
    let mean = 0; for (let i = lo; i <= hi; i++) mean += profile[i]; mean /= hi - lo + 1;
    let best = { score: 0, off: 0 };
    for (let off = 0; off < P; off += 0.25) {
      let s = 0, n = 0;
      for (let p = lo + off; p <= hi; p += P) { const i = Math.floor(p), f = p - i; s += profile[i] * (1 - f) + (profile[i + 1] ?? 0) * f; n++; }
      const score = s / n / mean;
      if (score > best.score) best = { score, off: lo + off };
    }
    return best;
  };
  const Ps = fixedP ? [fixedP] : []; if (!fixedP) for (let P = pMin; P <= pMax + 1e-9; P += pStep) Ps.push(P);
  return Ps.map((P) => { const fx = comb(colProfile, box.x0 + 1, box.x1, P), fy = comb(rowProfile, box.y0 + 1, box.y1, P); return { P, ox: fx.off, oy: fy.off, score: (fx.score + fy.score) / 2 }; });
}

/** The best grid among fits: the smallest P within 3% of the best score. */
function bestFit(fits) {
  const top = Math.max(...fits.map((f) => f.score));
  return fits.filter((f) => f.score >= top * 0.97).sort((a, b) => a.P - b.P)[0];
}

function nativeGrid(img, box, centres, { fixedP, ...opts } = {}) {
  const isBg = bgTest(img, opts);
  const nearest = (c) => { let bi = 0, bd = Infinity; centres.forEach((k, i) => { const d = dist2(c, k); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const fits = gridFits(img, box, { ...opts, fixedP });
  const chosen = bestFit(fits);
  const { P, ox, oy } = chosen;
  // Sample each block's middle, starting a block before the box so its edges are caught.
  const grid = [];
  for (let by = box.y0 - P + ((oy - box.y0) % P + P) % P; by <= box.y1; by += P) {
    const row = [];
    for (let bx = box.x0 - P + ((ox - box.x0) % P + P) % P; bx <= box.x1; bx += P) {
      const vals = [];
      for (let y = Math.round(by + P * 0.25); y < Math.round(by + P * 0.75); y++)
        for (let x = Math.round(bx + P * 0.25); x < Math.round(bx + P * 0.75); x++)
          if (x >= 0 && y >= 0 && x < img.W && y < img.H) vals.push(img.px(x, y));
      if (!vals.length) { row.push(null); continue; }
      const m = [0, 1, 2].map((k) => vals.reduce((s, v) => s + v[k], 0) / vals.length);
      row.push(vals.filter(isBg).length / vals.length > 0.5 ? null : nearest(m));
    }
    grid.push(row);
  }
  return { grid: cropGrid(grid), P, score: chosen.score };
}

/**
 * Shrink a drawing to `width` sprite pixels wide (height follows its shape).
 * A block that's mostly background (> bgShare) is see-through; one with more
 * than `outlineShare` outline-dark pixels is outline; else its commonest colour.
 */
function shrink(img, box, width, centres, { bgShare = 0.6, outlineShare = 0.28, ...bgOpts } = {}) {
  const isBg = bgTest(img, bgOpts);
  const nearest = (c) => { let bi = 0, bd = Infinity; centres.forEach((k, i) => { const d = dist2(c, k); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const darkest = lum(centres[0]);
  const P = (box.x1 - box.x0 + 1) / width;
  const height = Math.round((box.y1 - box.y0 + 1) / P);
  const grid = [];
  for (let r = 0; r < height; r++) {
    const row = [];
    for (let c = 0; c < width; c++) {
      const counts = new Map(); let total = 0, bgN = 0, dark = 0;
      for (let y = Math.floor(box.y0 + r * P); y < Math.floor(box.y0 + (r + 1) * P); y++) for (let x = Math.floor(box.x0 + c * P); x < Math.floor(box.x0 + (c + 1) * P); x++) {
        const px = img.px(x, y); total++;
        if (isBg(px)) { bgN++; continue; }
        const i = nearest(px);
        if (lum(centres[i]) < darkest + 30) dark++;
        counts.set(i, (counts.get(i) ?? 0) + 1);
      }
      if (!total || bgN / total > bgShare) row.push(null);
      else if (dark / total > outlineShare) row.push(0);
      else row.push([...counts].sort((a, b) => b[1] - a[1])[0][0]);
    }
    grid.push(row);
  }
  return { grid: cropGrid(grid), P };
}

function cropGrid(g) {
  g = g.slice();
  while (g.length && g[0].every((c) => c === null)) g.shift();
  while (g.length && g[g.length - 1].every((c) => c === null)) g.pop();
  const xs = g.flatMap((r) => r.flatMap((c, x) => (c === null ? [] : [x])));
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return g.map((r) => r.slice(lo, hi + 1));
}

// ---- Clean-ups (on rows) ---------------------------------------------------------

const CLEAR = '.';
const at = (rows, x, y) => rows[y]?.[x] ?? CLEAR;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const edit = (rows, f) => rows.map((r, y) => [...r].map((c, x) => f(c, x, y)).join(''));
/** A drawn pixel touching see-through (or the frame's edge) on one of its 4 sides. */
const onEdge = (rows, x, y) => N4.some(([dx, dy]) => at(rows, x + dx, y + dy) === CLEAR);

/** Crop see-through rows and columns. */
function crop(rows) {
  rows = rows.slice();
  while (rows.length && !rows[0].replaceAll(CLEAR, '')) rows.shift();
  while (rows.length && !rows[rows.length - 1].replaceAll(CLEAR, '')) rows.pop();
  const xs = rows.flatMap((r) => [...r].flatMap((c, x) => (c === CLEAR ? [] : [x])));
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return rows.map((r) => r.slice(lo, hi + 1));
}

/** Remove drawn pixels with nothing drawn on any side: specks. */
const despeck = (rows) => edit(rows, (c, x, y) => (c !== CLEAR && N4.every(([dx, dy]) => at(rows, x + dx, y + dy) === CLEAR) ? CLEAR : c));

/** See-through pixels that can't reach the frame's edge (holes inside the outline). */
function holeSet(rows) {
  const h = rows.length, w = rows[0].length, outside = new Set(), st = [];
  for (let x = 0; x < w; x++) st.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) st.push([0, y], [w - 1, y]);
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || y < 0 || x >= w || y >= h || rows[y][x] !== CLEAR || outside.has(y * w + x)) continue;
    outside.add(y * w + x); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return (x, y) => rows[y][x] === CLEAR && !outside.has(y * w + x);
}

/**
 * Fill holes: with `letter`, or (default) with a neighbour's colour. Don't use
 * on things that are meant to have holes (a wreath's middle, a chair's back).
 */
function fillHoles(rows, letter) {
  const isHole = holeSet(rows);
  return edit(rows, (c, x, y) => (isHole(x, y) ? letter ?? N4.map(([dx, dy]) => at(rows, x + dx, y + dy)).find((n) => n !== CLEAR) ?? c : c));
}

/**
 * One clean outline: every drawn pixel on the edge becomes `outline`.
 * Thin details (only a pixel or two wide, e.g. holly leaves) would turn all
 * outline, so pixels for which keep(letter) is true keep their colour and get
 * their outline just outside them instead (the rows grow by 1 on each side).
 */
function outlineEdges(rows, outline = 'o', keep = () => false) {
  const pad = ['.'.repeat(rows[0].length + 2), ...rows.map((r) => `.${r}.`), '.'.repeat(rows[0].length + 2)];
  const out = pad.map((r) => [...r]);
  pad.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === CLEAR) return;
    if (keep(c)) { for (const [dx, dy] of N4) if (pad[y + dy]?.[x + dx] === CLEAR) out[y + dy][x + dx] = outline; }
    else if (onEdge(pad, x, y)) out[y][x] = outline;
  }));
  return crop(out.map((r) => r.join('')));
}

/** Replace letters: recolour(rows, { c: 'o', e: 'o' }). */
const recolour = (rows, map) => edit(rows, (c) => map[c] ?? c);

/** Mirror left to right (a right-facing view from a left-facing one). */
const flipH = (rows) => rows.map((r) => [...r].reverse().join(''));

/**
 * Make the face symmetrical so both eyes match: the middle half of the head
 * (top 55% of the drawn rows), mirrored left onto right around the middle of
 * the ears (the top drawn row). Things off to one side (a tail) are untouched.
 */
function mirrorFace(rows) {
  const g = rows.map((r) => [...r]);
  const top = rows.findIndex((r) => r.replaceAll(CLEAR, ''));
  const bottom = rows.length - 1 - [...rows].reverse().findIndex((r) => r.replaceAll(CLEAR, ''));
  const headEnd = top + Math.round((bottom - top) * 0.55);
  const cols = (rs) => rs.flatMap((r) => [...r].flatMap((c, x) => (c === CLEAR ? [] : [x])));
  const ears = cols([rows[top]]), head = cols(rows.slice(top, headEnd + 1));
  const sum = Math.min(...ears) + Math.max(...ears);
  const left = Math.floor(sum / 2) - Math.floor((Math.max(...head) - Math.min(...head) + 1) / 4);
  for (let y = top; y <= headEnd; y++) for (let x = Math.floor(sum / 2) + 1; x <= sum - left; x++) g[y][x] = rows[y][sum - x];
  return g.map((r) => r.join(''));
}

/**
 * A back view built from the front view: the front's outline, its insides in
 * plain `fur` with a `rim` shade just inside the outline, flipped. keep(x, y,
 * letter) keeps a pixel as it is (a tail, a head stripe, arm lines). Use it
 * when the drawn back view doesn't match the front (ears a different size, a
 * smudge for a tail).
 */
function backFromFront(front, { fur, rim = fur, outline = 'o', keep = () => false }) {
  const g = edit(front, (c, x, y) => {
    if (c === CLEAR || keep(x, y, c)) return c;
    if (onEdge(front, x, y)) return outline;
    const nearEdge = [...N4, [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(front, x + dx, y + dy) !== CLEAR && onEdge(front, x + dx, y + dy));
    return nearEdge ? rim : fur;
  });
  return flipH(g);
}

/** Every view the same size: centred, feet on the bottom row. */
function fitAll(views) {
  const W = Math.max(...views.map((v) => v[0].length)), H = Math.max(...views.map((v) => v.length));
  return views.map((v) => {
    const c = crop(v), pad = Math.floor((W - c[0].length) / 2);
    return [...Array(H - c.length).fill('.'.repeat(W)), ...c.map((r) => ('.'.repeat(pad) + r).padEnd(W, '.'))];
  });
}

/** Two walking steps from a standing frame: one foot lifted a pixel, then the other. */
function walkSteps(rows, feet = 3) {
  const step = (liftLeft) => {
    const h = rows.length, w = rows[0].length;
    const cols = rows.slice(h - feet).flatMap((r) => [...r].flatMap((c, x) => (c === CLEAR ? [] : [x])));
    const mid = (Math.min(...cols) + Math.max(...cols) + 1) / 2;
    const out = rows.map((r) => [...r]);
    for (let c = 0; c < w; c++) {
      if ((c < mid) !== liftLeft) continue;
      for (let r = h - feet; r < h; r++) {
        if (rows[r][c] !== CLEAR) out[r - 1][c] = rows[r][c];
        else if (r - 1 >= h - feet) out[r - 1][c] = CLEAR;
      }
      out[h - 1][c] = CLEAR;
    }
    return out.map((r) => r.join(''));
  };
  return [rows, step(true), step(false)];
}

// ---- Checks (what the game's tests and the sprite gallery check) ----------------

function problems(rows) {
  const out = [];
  const isHole = holeSet(rows);
  let holes = 0, specks = 0;
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (isHole(x, y)) holes++;
    if (c !== CLEAR && N4.every(([dx, dy]) => at(rows, x + dx, y + dy) === CLEAR)) specks++;
  }));
  if (holes) out.push(`${holes} see-through pixel(s) inside the outline (fine only if meant, e.g. a wreath)`);
  if (specks) out.push(`${specks} lone pixel(s)`);
  if (new Set(rows.map((r) => r.length)).size > 1) out.push('rows of different lengths');
  return out;
}

// ---- Reading and writing the game's sprite files -------------------------------

/** A sprite from a src/art/sprites/*.ts file: { frames: rows[][], legend }. */
function readSprite(file, name) {
  const ts = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const start = ts.indexOf(`export const ${name}: PixelSprite`);
  if (start < 0) throw new Error(`${file}: no sprite ${name}`);
  const body = ts.slice(start, ts.indexOf('\n};', start));
  // The legend is a named constant (legend: LEGEND) or written inline (legend: { o: ... }).
  const named = body.match(/legend: (\w+)/);
  const legendName = named?.[1] ?? null;
  const lstart = legendName ? ts.indexOf(`const ${legendName} = {`) : start + body.indexOf('legend: {');
  const legendText = ts.slice(lstart, ts.indexOf('}', lstart));
  // Colours are '#rrggbb' or palette names (resolved in the game); palette names are kept as written.
  const legend = Object.fromEntries([...legendText.matchAll(/(\w): '([^']+)'/g)].map((m) => [m[1], m[2]]));
  const frames = body.split(/\n    \[/).slice(1).map((f) => [...f.matchAll(/'([^']*)'/g)].map((m) => m[1]));
  return { frames, legend, legendName };
}

/**
 * Replace (or append) a sprite in a .ts file. frames: rows[]; labels: one
 * comment per frame (e.g. 'front, standing'); doc: its /** comment *\/.
 */
function writeSprite(file, name, frames, { legendName = 'LEGEND', labels = [], doc } = {}) {
  let ts = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let block = (doc ? `/** ${doc} */\n` : '') + `export const ${name}: PixelSprite = {\n  legend: ${legendName},\n  frames: [\n`;
  frames.forEach((f, i) => {
    if (labels[i]) block += `    // ${labels[i]}\n`;
    block += `    [\n${f.map((r) => `      '${r}',`).join('\n')}\n    ],\n`;
  });
  block += '  ],\n};';
  const start = ts.indexOf(`export const ${name}: PixelSprite`);
  if (start >= 0) {
    const docStart = ts.lastIndexOf('/**', start);
    const from = doc && docStart >= 0 && !ts.slice(docStart, start).includes('\n\n') ? docStart : start;
    ts = ts.slice(0, from) + block + ts.slice(ts.indexOf('\n};', start) + 3);
  } else ts = ts.trimEnd() + '\n\n' + block + '\n';
  fs.writeFileSync(file, ts);
}

/** A legend as TypeScript: `const NAME = { o: '#...', ... } as const;` */
const legendTs = (name, legend) => `const ${name} = {\n${Object.entries(legend).map(([k, v]) => `  ${k}: '${v}',`).join('\n')}\n} as const;\n`;

// ---- Previews ------------------------------------------------------------------

function writePng(file, rgb, W, H) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/**
 * Draw sprites big, side by side (wrapping after `perRow`), on a checkerboard
 * (or a flat `background` colour, e.g. the game's floor), to a PNG for Read.
 * items: [{ rows, legend }].
 */
function preview(file, items, { scale = 8, perRow = 6, background } = {}) {
  const cellW = (it) => (it.rows[0].length + 2) * scale, cellH = (it) => (it.rows.length + 2) * scale;
  const lines = []; for (let i = 0; i < items.length; i += perRow) lines.push(items.slice(i, i + perRow));
  const W = Math.max(...lines.map((l) => l.reduce((s, it) => s + cellW(it), 0)));
  const H = lines.reduce((s, l) => s + Math.max(...l.map(cellH)), 0);
  const img = Buffer.alloc(W * H * 3);
  const bg = background && rgbOf(background);
  for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0; img.set(bg ?? (((x / scale | 0) + (y / scale | 0)) % 2 ? [0xe8, 0xe8, 0xe8] : [0xd2, 0xd2, 0xd2]), i * 3); }
  let oy = 0;
  for (const l of lines) {
    let ox = 0;
    const lh = Math.max(...l.map(cellH));
    for (const it of l) {
      const top = oy + lh - cellH(it); // feet lined up along the bottom of the line
      it.rows.forEach((r, y) => [...r].forEach((c, x) => {
        if (c === CLEAR) return;
        const col = rgbOf(it.legend[c]);
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) img.set(col, ((top + (y + 1) * scale + dy) * W + ox + (x + 1) * scale + dx) * 3);
      }));
      ox += cellW(it);
    }
    oy += lh;
  }
  writePng(file, img, W, H);
}

module.exports = {
  loadRaw, findBlobs, palette, samplesOf, gridFits, bestFit, nativeGrid, shrink, toRows,
  crop, despeck, fillHoles, outlineEdges, recolour, flipH, mirrorFace, backFromFront, fitAll, walkSteps,
  problems, readSprite, writeSprite, legendTs, preview, writePng, lum, hex, rgbOf, onEdge, holeSet,
};
