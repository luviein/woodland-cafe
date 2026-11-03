import Phaser from 'phaser';
import { TILE_SIZE } from '../config/display';
import { FLOOR_FINISHES, WALL_FINISHES, finishArt, wallFinishTile, type RoomSurface } from '../data/roomFinishes';
import { buildLayout, isWindow } from '../logic/furniture';
import type { Point } from '../logic/layout';
import { paintFinishStroke, paintFinishStretch } from '../logic/roomDecorating';
import { ownsFinish } from '../logic/roomFinishShop';
import { arrangeable } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { getGameState, setGameState } from '../scenes/gameStore';
import { artKey } from './art';
import { Button } from './Button';
import { addCafeCanvas, drawCafeTiles } from './cafeTiles';
import { COLORS, TEXT } from './theme';

/** Painting uses separate tile images, so a stroke updates only the tiles it touches. */
export class DecorateFinishes {
  surface: RoomSurface | null = null;
  private style = 0;
  private wholeStretch = false;
  private finishes: string[] = [];
  private stroke: string[] | null = null;
  private lastTile: Point | null = null;
  private history: string[][] = [];
  private preview: Phaser.GameObjects.Container;
  private images: { image: Phaser.GameObjects.Image; at: Point }[] = [];
  private controls: Phaser.GameObjects.Container;
  private swatches: { button: Button; image: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private modes: Button[] = [];
  private undo: Button;

  constructor(private scene: Phaser.Scene, private origin: Point, trayAt: Point, private hint: Phaser.GameObjects.Text) {
    this.preview = scene.add.container(origin.x, origin.y).setDepth(-1).setVisible(false);
    this.controls = scene.add.container(0, 0).setVisible(false);
    const place = (name: string, x: number, y: number, object: Button) => {
      const point = layoutPoint('decorate', name, { x, y });
      object.setPosition(point.x, point.y);
      this.controls.add(object);
      arrangeable(scene, 'decorate', name, point, object);
      return object;
    };
    // The tab already names the surface: use the label's space for a wider swatch row.
    const swatchAt = layoutPoint('decorate', 'finishSwatches', { x: trayAt.x - 84, y: trayAt.y });
    for (let i = 0; i < FLOOR_FINISHES.length; i++) {
      const button = new Button(scene, swatchAt.x + i * 36, swatchAt.y, 28, 28, '', COLORS.paper, () => {
        if (!this.surface || !ownsFinish(getGameState(scene), this.surface, i)) return;
        this.finishStroke(); this.style = i; this.refreshControls();
      });
      const image = scene.add.image(0, 0, artKey('floor')).setDisplaySize(24, 24);
      const label = scene.add.text(0, 8, '', { ...TEXT.label, fontSize: '7px' }).setOrigin(0.5);
      button.add([image, label]);
      this.controls.add(button);
      this.swatches.push({ button, image, label });
    }
    arrangeable(scene, 'decorate', 'finishSwatches', swatchAt, ...this.swatches.map(s => s.button));
    ['Brush', 'Whole stretch'].forEach((name, i) => {
      const button = place('finishMode-' + i, i === 0 ? 396 : 478, 330,
        new Button(scene, 0, 0, i === 0 ? 64 : 84, 26, '', COLORS.book, () => {
          this.finishStroke(); this.wholeStretch = i === 1; this.refreshControls();
        }));
      button.add(scene.add.text(0, 0, name, { ...TEXT.label, fontSize: '9px' }).setOrigin(0.5));
      this.modes.push(button);
    });
    this.undo = place('finishUndo', 581, 302, new Button(scene, 0, 0, 62, 18, '', COLORS.book, () => this.undoStroke()));
    this.undo.add(scene.add.text(0, 0, 'Undo', { ...TEXT.label, fontSize: '10px' }).setOrigin(0.5));
  }

  select(surface: RoomSurface | null): void {
    this.finishStroke();
    this.surface = surface;
    this.style = 0;
    this.controls.setVisible(surface !== null);
    this.preview.setVisible(surface !== null);
    if (!surface) return;
    this.finishes = [...getGameState(this.scene).roomFinishes];
    this.preview.removeAll(true);
    this.images = [];
    const state = getGameState(this.scene);
    const layout = buildLayout(state.furniture, state.room);
    layout.tiles.forEach((row, y) => row.forEach((tile, x) => {
      const art = tile === 'wall' ? 'wall' : tile === 'counter' ? 'counter' : tile === 'door' ? 'door' : 'floor';
      const image = this.scene.add.image(x * TILE_SIZE, y * TILE_SIZE, artKey(art)).setOrigin(0);
      this.preview.add(image);
      this.images.push({ image, at: { x, y } });
    }));
    const overlay = addCafeCanvas(this.scene);
    drawCafeTiles(overlay, layout, { x: 0, y: 0 }, state.furniture.placed, this.finishes, true);
    this.preview.add(overlay);
    this.refreshTiles();
    this.refreshControls();
  }

  down(pointer: Phaser.Input.Pointer): void {
    this.finishStroke();
    this.stroke = [...this.finishes];
    this.paint(pointer);
  }

  move(pointer: Phaser.Input.Pointer): void {
    if (pointer.isDown) this.paint(pointer); else this.finishStroke();
  }

  private paint(pointer: Phaser.Input.Pointer): void {
    if (!this.surface || !this.stroke || !ownsFinish(getGameState(this.scene), this.surface, this.style)) return;
    const tile = { x: Math.floor((pointer.worldX - this.origin.x) / TILE_SIZE), y: Math.floor((pointer.worldY - this.origin.y) / TILE_SIZE) };
    const room = getGameState(this.scene).room;
    if (!room[tile.y]?.[tile.x]) { this.lastTile = null; return; }
    if (this.lastTile?.x === tile.x && this.lastTile.y === tile.y) return;
    const previous = this.finishes;
    this.finishes = this.wholeStretch
      ? paintFinishStretch(room, previous, tile, this.surface, this.style)
      : paintFinishStroke(room, previous, this.lastTile ?? tile, tile, this.surface, this.style);
    this.lastTile = tile;
    this.refreshTiles(previous);
  }

  finishStroke(): void {
    if (this.stroke && this.stroke.join() !== this.finishes.join()) {
      this.history.push(this.stroke);
      // Save once on release, avoiding localStorage work on every pointer movement.
      setGameState(this.scene, { ...getGameState(this.scene), roomFinishes: this.finishes });
    }
    this.stroke = null;
    this.lastTile = null;
    this.undo.setEnabled(this.history.length > 0);
  }

  private undoStroke(): void {
    this.finishStroke();
    const previous = this.history.pop();
    if (previous) {
      this.finishes = previous;
      setGameState(this.scene, { ...getGameState(this.scene), roomFinishes: previous });
      this.refreshTiles();
    }
    this.refreshControls();
  }

  private refreshTiles(previous?: readonly string[]): void {
    const room = getGameState(this.scene).room;
    for (const { image, at: { x, y } } of this.images) {
      if (previous?.[y]?.[x] === this.finishes[y][x]) continue;
      const char = room[y][x], style = Number(this.finishes[y][x]);
      if (char === 'W') {
        const tile = wallFinishTile(style, x, y, room[y].length, y === 0 && isWindow(x, room[y].length), room.length);
        image.setTexture(artKey(tile.art), tile.frame);
      } else if (char !== 'C' && char !== 'D') {
        image.setTexture(artKey(finishArt('floor', style)), (x * 3 + y * 2) % 2);
      }
    }
  }

  private refreshControls(): void {
    if (!this.surface) return;
    const names = this.surface === 'floor' ? FLOOR_FINISHES : WALL_FINISHES;
    this.swatches.forEach(({ button, image, label }, i) => {
      const owned = ownsFinish(getGameState(this.scene), this.surface!, i);
      button.setVisible(i < names.length).setEnabled(owned).setAlpha(owned ? 1 : 0.4);
      (button.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(2, i === this.style ? COLORS.paper : COLORS.ink);
      if (i < names.length) image.setTexture(artKey(finishArt(this.surface!, i)), 0);
      label.setText(owned ? '' : 'Locked');
    });
    this.modes.forEach((button, i) => button.setEnabled(i !== Number(this.wholeStretch)));
    this.undo.setEnabled(this.history.length > 0);
    this.hint.setText(`${names[this.style]}: ${this.wholeStretch ? 'tap to fill a connected stretch' : 'drag to paint'}. Locked finishes: Marketplace.`);
  }
}
