// Lists the drawings in a decoded image, top to bottom, left to right, and
// writes an overview PNG with each one boxed and numbered, to tell them apart.
// Usage: node find.cjs <image.rgb> <W> <H> [--green] [--min N] [--overview out.png]
//   --green: the background is a green field (not a plain colour)
// Labels under drawings (text boxes) show up as wide, short blobs: skip them.
const { loadRaw, findBlobs, writePng } = require('./pixel.cjs');
const [file, W, H, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] ?? true : undefined; };
const img = loadRaw(file, +W, +H);
const isBg = opt('--green') ? ([r, g, b]) => g > r + 25 && g > b + 25 : undefined;
const blobs = findBlobs(img, { min: +(opt('--min') ?? 400), isBg })
  .sort((a, b) => (Math.abs(a.y0 - b.y0) < 40 ? a.x0 - b.x0 : a.y0 - b.y0));
blobs.forEach((b, i) => console.log(`#${i}`, JSON.stringify([b.x0, b.y0, b.x1, b.y1]), `${b.w}x${b.h}`, b.w > b.h * 3 ? '(wide: a label?)' : ''));

const out = opt('--overview');
if (out) {
  const buf = Buffer.alloc(img.W * img.H * 3);
  for (let y = 0; y < img.H; y++) for (let x = 0; x < img.W; x++) buf.set(img.px(x, y), (y * img.W + x) * 3);
  // A red box round each drawing, and its number as that many dots along the top.
  for (const [i, b] of blobs.entries()) {
    for (let x = b.x0; x <= b.x1; x++) for (const y of [b.y0, b.y1]) buf.set([255, 0, 0], (y * img.W + x) * 3);
    for (let y = b.y0; y <= b.y1; y++) for (const x of [b.x0, b.x1]) buf.set([255, 0, 0], (y * img.W + x) * 3);
    for (let d = 0; d <= i; d++) for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
      const x = b.x0 + 2 + d * 6 + dx, y = Math.max(0, b.y0 - 6) + dy;
      if (x < img.W) buf.set([0, 0, 255], (y * img.W + x) * 3);
    }
  }
  writePng(out, buf, img.W, img.H);
}
