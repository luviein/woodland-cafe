// Converts drawings to sprite rows from a job file, with one shared palette.
// Usage: node convert.cjs <job.json>
//
// job.json:
// {
//   "image": { "file": "sheet.rgb", "width": 1760, "height": 1408 },
//   "background": "corner" | "green",        // plain background, or a green field
//   "colours": 26,                            // palette size (k-means)
//   "mode": "native" | "shrink",              // see SKILL.md: which one to use
//   "native": { "pMin": 3, "pMax": 8,         // native: pixel-size search range,
//               "shared": true },             //   one size for the whole sheet (best summed over items),
//                                             //   or "fixedP": 3.5 when you know it
//   "items": {
//     "snowman": { "box": [521, 35, 798, 343], "width": 24 },   // width: shrink only
//     ...
//   },
//   "out": "rows.json",                       // { legend, items: { name: rows } }
//   "preview": "preview.png"                  // all items, big, for Read
// }
// Paths are relative to the job file.
const fs = require('fs');
const path = require('path');
const P = require('./pixel.cjs');

const jobFile = process.argv[2];
const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
const rel = (f) => path.resolve(path.dirname(jobFile), f);
const img = P.loadRaw(rel(job.image.file), job.image.width, job.image.height);
const isBg = job.background === 'green' ? ([r, g, b]) => g > r + 25 && g > b + 25 : undefined;
const boxOf = ([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 });

const items = Object.entries(job.items);
const centres = P.palette(P.samplesOf(img, items.map(([, it]) => boxOf(it.box)), { isBg }), job.colours ?? 32);
// One pixel size for the whole sheet: the drawings on one sheet share it, and
// summing the evidence over all of them is far steadier than each on its own
// (a resized screenshot draws art pixels unevenly, e.g. 3 then 4 wide).
if (job.mode === 'native' && job.native?.shared && !job.native.fixedP) {
  const all = items.map(([, it]) => P.gridFits(img, boxOf(it.box), job.native));
  const summed = all[0].map((f, i) => ({ P: f.P, score: all.reduce((s, fits) => s + fits[i].score, 0) / all.length }));
  job.native.fixedP = P.bestFit(summed).P;
  console.log(`shared pixel size: ${job.native.fixedP.toFixed(2)}`);
}
const grids = [];
for (const [name, it] of items) {
  const box = boxOf(it.box);
  const res = job.mode === 'native'
    ? P.nativeGrid(img, box, centres, { ...(job.native ?? {}), ...(it.native ?? {}), isBg })
    : P.shrink(img, box, it.width, centres, { ...(job.shrink ?? {}), ...(it.shrink ?? {}), isBg });
  grids.push(res.grid);
  console.log(name.padEnd(18), `${res.grid[0].length}x${res.grid.length}`, `P ${res.P.toFixed(2)}`, res.score !== undefined ? `grid fit ${res.score.toFixed(2)} (1 = chance, higher is better)` : '');
}
const { rows, legend } = P.toRows(grids, centres);
const out = { legend, items: Object.fromEntries(items.map(([name], i) => [name, rows[i]])) };
fs.writeFileSync(rel(job.out ?? 'rows.json'), JSON.stringify(out, null, 1));
if (job.preview) P.preview(rel(job.preview), rows.map((r) => ({ rows: r, legend })), { scale: job.previewScale ?? 6 });
console.log(`colours ${Object.keys(legend).length}; wrote ${job.out ?? 'rows.json'}`);
