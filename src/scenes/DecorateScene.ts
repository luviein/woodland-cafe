import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FURNITURE, FURNITURE_KINDS, type FurnitureKind } from '../data/furniture';
import { buildLayout, pieceAt, placePiece, placeProblem, removePiece, type Furniture } from '../logic/furniture';
import type { Point } from '../logic/layout';
import { Button } from '../ui/Button';
import { cafeOrigin, drawCafeTiles } from '../ui/cafeTiles';
import { COLORS, TEXT, css } from '../ui/theme';
import { getGameState, setGameState } from './gameStore';
import type { WorldMapRequest } from './WorldMapScene';

/**
 * Arranging the cafe's tables and chairs between days (GAME_DESIGN.md §5.7).
 * Opened from the map's Cafe panel. The empty cafe (no customers, no clock)
 * with a storage tray on the left: pick a piece, tap the floor to place it;
 * tap a placed piece to put it away. Every change goes straight into the
 * game state, so Done just goes back to the map.
 */
export class DecorateScene extends Phaser.Scene {
  private origin!: Point;
  private tiles!: Phaser.GameObjects.Graphics;
  /** The tray: one button per kind, showing how many are in storage. */
  private trayButtons = new Map<FurnitureKind, Button>();
  private selectedOutline!: Phaser.GameObjects.Rectangle;
  /** What the next floor tap places; null = nothing picked yet. */
  private selected: FurnitureKind | null = null;

  constructor() {
    super('DecorateScene');
  }

  create(): void {
    this.selected = null;
    this.trayButtons = new Map();
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.wall).setOrigin(0);
    this.origin = cafeOrigin(buildLayout(this.furniture()));
    this.tiles = this.add.graphics();

    this.add.text(BASE_WIDTH / 2, 10, 'Decorate', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0.5, 0);
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 8, 'Pick a piece, then tap the floor. Tap a piece to put it away.', TEXT.label)
      .setOrigin(0.5, 1);

    // The storage tray, left of the cafe.
    this.add.text(64, 90, 'Storage', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0.5, 0);
    this.selectedOutline = this.add.rectangle(0, 0, 112, 38).setStrokeStyle(3, COLORS.apron).setVisible(false);
    FURNITURE_KINDS.forEach((kind, i) => {
      const button = new Button(this, 64, 130 + i * 44, 104, 30, '', COLORS.book, () => this.select(kind));
      this.trayButtons.set(kind, button);
    });
    new Button(this, BASE_WIDTH - 64, BASE_HEIGHT - 40, 100, 30, 'Done', COLORS.serve, () => this.done());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') this.done();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey),
    );

    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a button's tap
        this.onTileTapped({
          x: Math.floor((pointer.worldX - this.origin.x) / TILE_SIZE),
          y: Math.floor((pointer.worldY - this.origin.y) / TILE_SIZE),
        });
      },
    );
    this.refresh();
  }

  private furniture(): Furniture {
    return getGameState(this).furniture;
  }

  private setFurniture(furniture: Furniture): void {
    setGameState(this, { ...getGameState(this), furniture });
    this.refresh();
  }

  private select(kind: FurnitureKind): void {
    this.selected = this.selected === kind ? null : kind; // tap again to put it down
    this.refresh();
  }

  private onTileTapped(tile: Point): void {
    const layout = buildLayout(this.furniture());
    if (tile.x < 0 || tile.y < 0 || tile.x >= layout.width || tile.y >= layout.height) return;

    if (pieceAt(this.furniture(), tile)) {
      this.setFurniture(removePiece(this.furniture(), tile));
      return;
    }
    if (!this.selected) {
      this.showMessage(tile, 'Pick a table or chair first');
      return;
    }
    const problem = placeProblem(this.furniture(), this.selected, tile);
    if (problem) this.showMessage(tile, problem);
    else this.setFurniture(placePiece(this.furniture(), this.selected, tile));
  }

  /** Redraws the cafe and the tray from the game state. */
  private refresh(): void {
    const furniture = this.furniture();
    drawCafeTiles(this.tiles, buildLayout(furniture), this.origin);
    // Ran out of the picked piece: nothing left to place, so let go of it.
    if (this.selected && furniture.stored[this.selected] === 0) this.selected = null;
    for (const [kind, button] of this.trayButtons) {
      button.setText(`${FURNITURE[kind].name} x${furniture.stored[kind]}`).setEnabled(furniture.stored[kind] > 0);
    }
    const picked = this.selected && this.trayButtons.get(this.selected);
    this.selectedOutline.setVisible(Boolean(picked));
    if (picked) this.selectedOutline.setPosition(picked.x, picked.y);
  }

  /** Why a tap did nothing, drifting up from the tile. */
  private showMessage(tile: Point, message: string): void {
    const x = this.origin.x + tile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = this.origin.y + tile.y * TILE_SIZE;
    const text = this.add
      .text(x, y, message, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(0.5, 1);
    this.tweens.add({ targets: text, y: y - 16, alpha: 0, duration: 1400, onComplete: () => text.destroy() });
  }

  private done(): void {
    const request: WorldMapRequest = { current: 'cafe' };
    this.scene.start('WorldMapScene', request);
  }
}
