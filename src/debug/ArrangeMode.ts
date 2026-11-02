import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeItems, arrangeRules, type ArrangeItem } from '../layout/arrangeable';
import { fileContents, moveTo, replaceScreen, snap } from '../layout/positions';
import type { Point } from '../logic/layout';

// Arrange mode (GAME_DESIGN.md §9.3), dev only: drag the things a screen
// marked arrangeable() to move them, then Save writes the screen's layout
// file (src/data/layouts/<screen>.json) through the dev server's
// /__layouts route (tools/layoutApi.mjs). F2 or the console's `arrange`.

/** Above everything a screen draws. */
const DEPTH = 9000;
const OK_COLOUR = 0x5fd3ff;
const BAD_COLOUR = 0xff4d4d;

interface Entry {
  scene: Phaser.Scene;
  item: ArrangeItem;
  outline: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

/** One step for Undo: an item moved from one point to another. */
interface Move {
  entry: Entry;
  from: Point;
  to: Point;
}

export interface ArrangeMode {
  /** Turns Arrange mode on or off for the screens showing now; says what happened. */
  toggle(): string;
}

export function mountArrangeMode(game: Phaser.Game): ArrangeMode {
  let active = false;
  let entries: Entry[] = [];
  let layers: Phaser.GameObjects.GameObject[] = [];
  let undo: Move[] = [];
  const changed = new Set<string>();
  const bar = createToolbar();

  function on(): string {
    const scenes = game.scene.getScenes(true).filter((s) => arrangeItems(s).length > 0);
    if (scenes.length === 0) return 'Nothing on this screen can be arranged yet.';
    active = true;
    for (const scene of scenes) {
      // Catches taps, so arranging never walks the player or presses a button.
      const blocker = scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.15).setOrigin(0).setInteractive().setDepth(DEPTH);
      layers.push(blocker);
      for (const item of arrangeItems(scene)) entries.push(createEntry(scene, item));
    }
    check();
    bar.show();
    return 'Arrange mode: drag things to move them (Shift: 8px grid). Save, Undo (Ctrl+Z), Reset, Done.';
  }

  function off(): void {
    active = false;
    for (const e of entries) for (const o of [e.outline, e.label, e.zone]) o.destroy();
    for (const o of layers) o.destroy();
    entries = [];
    layers = [];
    undo = [];
    changed.clear();
    bar.hide();
  }

  /** The box around all of an item's objects, on screen. */
  function bounds(item: ArrangeItem): Phaser.Geom.Rectangle {
    // Things with no box of their own (Graphics) move along; the box comes from the rest.
    const boxes = item.objects.flatMap((o) => (o.getBounds ? [o.getBounds()] : []));
    const box = boxes[0] ?? new Phaser.Geom.Rectangle(item.point.x, item.point.y, 0, 0);
    for (const b of boxes.slice(1)) Phaser.Geom.Rectangle.Union(box, b, box);
    return box;
  }

  function createEntry(scene: Phaser.Scene, item: ArrangeItem): Entry {
    const outline = scene.add.graphics().setDepth(DEPTH + 1);
    const label = scene.add
      .text(0, 0, item.name, { fontFamily: 'monospace', fontSize: '9px', color: '#ffffff', backgroundColor: '#000000aa' })
      .setOrigin(0, 1)
      .setDepth(DEPTH + 2);
    const zone = scene.add.zone(0, 0, 1, 1).setInteractive({ draggable: true, useHandCursor: true }).setDepth(DEPTH + 1);
    const entry: Entry = { scene, item, outline, label, zone };
    let start: { pointer: Point; point: Point } | null = null;
    zone.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer) => {
      start = { pointer: { x: pointer.worldX, y: pointer.worldY }, point: { ...item.point } };
    });
    zone.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer) => {
      if (!start) return;
      const grid = (pointer.event as MouseEvent | undefined)?.shiftKey ? 8 : 1;
      const to = snap({ x: start.point.x + pointer.worldX - start.pointer.x, y: start.point.y + pointer.worldY - start.pointer.y }, grid);
      moveEntry(entry, to);
    });
    zone.on(Phaser.Input.Events.DRAG_END, () => {
      if (start && (start.point.x !== item.point.x || start.point.y !== item.point.y)) undo.push({ entry, from: start.point, to: { ...item.point } });
      start = null;
      check();
    });
    redraw(entry, OK_COLOUR);
    return entry;
  }

  /** Moves all of an item's objects so its point lands on `to`. */
  function moveEntry(entry: Entry, to: Point): void {
    const { item } = entry;
    const dx = to.x - item.point.x, dy = to.y - item.point.y;
    if (dx === 0 && dy === 0) return;
    for (const o of item.objects) o.setPosition(o.x + dx, o.y + dy);
    item.point = { ...to };
    moveTo(item.screen, item.name, to);
    changed.add(item.screen);
    redraw(entry, OK_COLOUR);
    // Things drawn with some of the same objects (a place and its signpost)
    // went along: keep their own points and outlines in step. Not saved as
    // moved on their own: they still follow what they belong to.
    for (const other of entries) {
      if (other === entry || !other.item.objects.some((o) => item.objects.includes(o))) continue;
      other.item.point = { x: other.item.point.x + dx, y: other.item.point.y + dy };
      redraw(other, OK_COLOUR);
    }
    bar.status(`${item.name}: ${to.x}, ${to.y}`);
  }

  function redraw(entry: Entry, colour: number): void {
    const b = bounds(entry.item);
    entry.outline.clear().lineStyle(1, colour, 1).strokeRect(b.x - 0.5, b.y - 0.5, b.width + 1, b.height + 1);
    entry.label.setPosition(b.x, b.y - 1).setBackgroundColor(colour === BAD_COLOUR ? '#aa1111dd' : '#000000aa');
    // At least 8x8, so even a small thing can be grabbed.
    entry.zone.setPosition(b.centerX, b.centerY).setSize(Math.max(8, b.width), Math.max(8, b.height));
    entry.zone.input?.hitArea.setTo(0, 0, Math.max(8, b.width), Math.max(8, b.height));
  }

  /** Marks what breaks a rule in red; returns the problems (Save is refused while there are any). */
  function check(): string[] {
    const problems: string[] = [];
    const bad = new Set<string>();
    for (const e of entries) {
      const b = bounds(e.item);
      if (b.left < 0 || b.top < 0 || b.right > BASE_WIDTH || b.bottom > BASE_HEIGHT) {
        problems.push(`${e.item.name} is off the screen`);
        bad.add(e.item.name);
      }
    }
    for (const scene of new Set(entries.map((e) => e.scene))) {
      for (const rule of arrangeRules(scene)) {
        for (const { name, problem } of rule()) {
          problems.push(`${name}: ${problem}`);
          bad.add(name);
        }
      }
    }
    for (const e of entries) redraw(e, bad.has(e.item.name) ? BAD_COLOUR : OK_COLOUR);
    bar.problems(problems);
    return problems;
  }

  async function save(): Promise<void> {
    const problems = check();
    if (problems.length > 0) {
      bar.status(`Not saved: ${problems[0]}`);
      return;
    }
    if (changed.size === 0) {
      bar.status('Nothing moved.');
      return;
    }
    try {
      for (const screen of changed) {
        const res = await fetch(`/__layouts/${screen}.json`, { method: 'POST', body: JSON.stringify(fileContents(screen)) });
        if (!res.ok) throw new Error(await res.text());
      }
    } catch (err) {
      bar.status(`Not saved: ${String(err)}`);
      return;
    }
    const saved = [...changed].join(', ');
    restartAndClose();
    console.info(`Arrange: saved ${saved}`);
  }

  /** Back to the saved files: positions reloaded, the screens built again. */
  async function reset(): Promise<void> {
    for (const screen of changed) {
      const res = await fetch(`/__layouts/${screen}.json`);
      replaceScreen(screen, res.ok ? await res.json() : {});
    }
    restartAndClose();
  }

  /** Builds the arranged screens again, so everything (depth, walking areas) follows the new positions. */
  function restartAndClose(): void {
    const scenes = new Set(entries.map((e) => e.scene));
    off();
    for (const scene of scenes) scene.scene.restart();
  }

  function stepBack(): void {
    const last = undo.pop();
    if (!last) return;
    moveEntry(last.entry, last.from);
    check();
  }

  function done(): void {
    if (changed.size > 0) {
      bar.status('Unsaved moves: Save or Reset first.');
      return;
    }
    off();
  }

  function createToolbar() {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: '20', display: 'none',
      background: 'rgba(20, 16, 14, 0.92)', color: '#f4e9d8', font: '12px monospace', padding: '6px 8px', borderRadius: '4px',
      maxWidth: 'calc(100vw - 16px)',
    });
    const row = document.createElement('div');
    const text = document.createElement('div');
    const list = document.createElement('div');
    Object.assign(list.style, { color: '#ff9b9b', whiteSpace: 'pre-line' });
    const button = (label: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      Object.assign(b.style, { font: '12px monospace', marginRight: '6px' });
      b.onclick = onClick;
      row.append(b);
      return b;
    };
    const saveButton = button('Save', () => void save());
    button('Undo', stepBack);
    button('Reset', () => void reset());
    button('Done', done);
    panel.append(row, text, list);
    document.body.append(panel);
    return {
      show: () => (panel.style.display = 'block'),
      hide: () => (panel.style.display = 'none'),
      status: (message: string) => (text.textContent = message),
      problems: (problems: string[]) => {
        list.textContent = problems.slice(0, 4).join('\n');
        saveButton.disabled = problems.length > 0;
      },
    };
  }

  // F2 turns it on and off; Ctrl+Z steps back while it's on.
  window.addEventListener('keydown', (event) => {
    if (event.key === 'F2') {
      event.preventDefault();
      if (active) done();
      else bar.status(on());
    } else if (active && event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      stepBack();
    }
  });

  return {
    toggle: () => {
      if (!active) return on();
      done();
      return active ? 'Unsaved moves: Save or Reset first.' : 'Arrange mode off.';
    },
  };
}
