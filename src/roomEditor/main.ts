import './roomEditor.css';
import { CAFE_ROOM } from '../data/cafeRoom';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { framePixels } from '../art/pixelSprite';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import { pieceDrawing } from '../ui/cafeTiles';
import { isWindow, startingFurniture, type PlacedPiece } from '../logic/furniture';
import { paintRoom, roomProblems, ROOM_BRUSHES, type RoomBrush } from '../logic/roomPainter';
import { browserSaveSlot } from '../storage/saveSlot';
import { loadGame } from '../logic/save';
import type { Point } from '../logic/layout';

const host = document.querySelector<HTMLElement>('#room-editor')!;
if (!import.meta.env.DEV) throw new Error('The room painter is available under npm run dev only.');
host.innerHTML = `<h1>Cafe room painter</h1>
<p>Paint the room between days. Save applies it on your next cafe or Decorate visit.</p>
<div class="tools"><button id="save">Save room</button><button id="undo">Undo</button><button id="reset">Reset to saved</button>
<label><input id="furniture" type="checkbox" checked> Show furniture</label><span id="coordinate" class="hint"></span></div>
<div class="brushes" aria-label="Tile brushes"></div>
<p class="hint">Click or drag to paint. D, P, O and queue numbers move when painted elsewhere. Ctrl+Z undoes a stroke.</p>
<div id="status" role="status"></div><div id="problems" role="alert"></div>
<canvas aria-label="Cafe room tile grid"></canvas>`;
const canvas = host.querySelector('canvas')!;
const ctx = canvas.getContext('2d')!;
const saveButton = host.querySelector<HTMLButtonElement>('#save')!;
const undoButton = host.querySelector<HTMLButtonElement>('#undo')!;
const showFurniture = host.querySelector<HTMLInputElement>('#furniture')!;
const status = host.querySelector<HTMLElement>('#status')!;
const problems = host.querySelector<HTMLElement>('#problems')!;
const coordinate = host.querySelector<HTMLElement>('#coordinate')!;
const size = 48, width = CAFE_LAYOUT[0].length, height = CAFE_LAYOUT.length;
canvas.width = width * size; canvas.height = height * size;
let rows = [...CAFE_ROOM], base = [...CAFE_ROOM], brush: RoomBrush = '.';
let history: string[][] = [], stroke: string[] | null = null, saving = false, loaded = false;
const brushNames: Record<RoomBrush, string> = {
  '.': 'Floor', W: 'Wall', C: 'Counter', D: 'Door', P: 'Player P', O: 'Order O',
  '1': 'Queue 1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
};
for (const char of ROOM_BRUSHES) {
  const button = document.createElement('button');
  button.textContent = brushNames[char]; button.dataset.brush = char;
  button.onclick = () => { brush = char; refresh(); };
  host.querySelector('.brushes')!.append(button);
}

function savedFurniture(): PlacedPiece[] {
  const text = browserSaveSlot().read();
  if (!text) return [];
  const result = loadGame(text);
  return result.ok ? [...result.state.furniture.placed] : [];
}
function dirty(): boolean { return JSON.stringify(rows) !== JSON.stringify(base); }
function drawSprite(name: ArtName, frame: number, x: number, y: number): void {
  for (const pixel of framePixels(SPRITE_ART[name], frame)) {
    ctx.fillStyle = '#' + pixel.color.toString(16).padStart(6, '0');
    ctx.fillRect(x + pixel.x * 2, y + pixel.y * 2, 2, 2);
  }
}
function refresh(): void {
  const placed = savedFurniture();
  const errors = roomProblems(rows, placed);
  problems.textContent = errors.join('\n');
  saveButton.disabled = !loaded || saving || !!errors.length || !dirty();
  undoButton.disabled = saving || !history.length;
  host.querySelectorAll<HTMLButtonElement>('[data-brush]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.brush === brush)));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  rows.forEach((row, y) => [...row].forEach((char, x) => {
    const px = x * size, py = y * size;
    drawSprite('floor', (x * 3 + y * 2) % 2, px, py);
    if (char === 'W') drawSprite('wall', y === 0 && isWindow(x, width) ? 1 : 0, px, py);
    if (char === 'C') drawSprite('counter', 0, px, py);
    if (char === 'D') drawSprite('door', 0, px, py);
    if (char === 'O') drawSprite('orderRug', 0, px, py);
    if (/^[1-9]$/.test(char)) drawSprite('pawPrint', 0, px + 12, py + 12);
  }));
  if (showFurniture.checked) {
    const combined = [...startingFurniture().placed];
    for (const piece of placed) if (!combined.some(p => p.x === piece.x && p.y === piece.y)) combined.push(piece);
    for (const piece of combined) {
      const char = rows[piece.y]?.[piece.x];
      const { art, frame, at } = pieceDrawing(combined, piece, { x: piece.x * 24, y: piece.y * 24 }, char === 'W' ? 'wall' : char === 'C' ? 'counter' : 'floor');
      drawSprite(art, frame, at.x * 2, at.y * 2);
    }
  }
  rows.forEach((row, y) => [...row].forEach((char, x) => {
    ctx.strokeStyle = '#382b2540'; ctx.lineWidth = 1;
    ctx.strokeRect(x * size + .5, y * size + .5, size, size);
    if ('DPO123456789'.includes(char)) {
      ctx.fillStyle = char === 'P' ? '#174c32' : '#382b25';
      ctx.fillRect(x * size + 2, y * size + 2, 20, 20);
      ctx.fillStyle = '#fff8e9'; ctx.font = 'bold 16px monospace'; ctx.fillText(char, x * size + 7, y * size + 18);
    }
  }));
}
function point(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.floor((event.clientX - rect.left) * canvas.width / rect.width / size), y: Math.floor((event.clientY - rect.top) * canvas.height / rect.height / size) };
}
function paint(event: PointerEvent): void {
  const at = point(event);
  rows = paintRoom(rows, at, brush);
  coordinate.textContent = `Column ${at.x}, row ${at.y}`;
  status.textContent = 'Draft — save when the room is valid.';
  refresh();
}
canvas.onpointerdown = event => {
  if (saving || !loaded || event.button !== 0) return;
  stroke = [...rows]; canvas.setPointerCapture(event.pointerId); paint(event);
};
canvas.onpointermove = event => { if (stroke) paint(event); };
function finishStroke(): void {
  if (stroke && JSON.stringify(stroke) !== JSON.stringify(rows)) history.push(stroke);
  stroke = null; refresh();
}
canvas.onpointerup = finishStroke; canvas.onpointercancel = finishStroke;
function undo(): void { if (!saving && history.length) { rows = history.pop()!; refresh(); status.textContent = 'Stroke undone.'; } }
undoButton.onclick = undo;
showFurniture.onchange = refresh;
window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
});
window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('storage', refresh);
async function reset(): Promise<void> {
  if (saving) return;
  try {
    const response = await fetch('/__room/cafe-room.json');
    if (!response.ok) throw new Error('Room endpoint unavailable. Restart npm run dev once to enable it.');
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length !== height || data.some(row => typeof row !== 'string' || row.length !== width)) throw new Error('The saved room is unreadable.');
    rows = [...data]; base = [...rows]; history = []; loaded = true;
    status.textContent = 'Saved room loaded. Furniture is a reference overlay; place furniture in Decorate.';
  } catch (error) { status.textContent = error instanceof Error ? error.message : 'Unable to load room.'; }
  refresh();
}
host.querySelector<HTMLButtonElement>('#reset')!.onclick = () => void reset();
saveButton.onclick = async () => {
  if (saving || !loaded) return;
  const placed = savedFurniture(), errors = roomProblems(rows, placed);
  if (errors.length) { refresh(); return; }
  saving = true; refresh();
  try {
    const response = await fetch('/__room/cafe-room.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, base, placed }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to save room.');
    base = [...rows]; history = [];
    status.textContent = 'Room saved. Return to the game and re-enter the cafe or Decorate to apply it.';
  } catch (error) { status.textContent = error instanceof Error ? error.message : 'Unable to save room.'; }
  saving = false; refresh();
};
// Also initialise the brush state and preview if the server needs restarting.
refresh(); void reset();
