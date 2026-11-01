import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FURNITURE, FURNITURE_KINDS, type FurnitureKind } from '../data/furniture';
import {
  buildLayout,
  movePiece,
  moveProblem,
  pieceAt,
  pieceGroup,
  placePiece,
  placeProblem,
  removePiece,
  type Furniture,
  type PlacedPiece,
} from '../logic/furniture';
import type { Point } from '../logic/layout';
import { artKey } from '../ui/art';
import { Button } from '../ui/Button';
import { addCafeCanvas, cafeOrigin, drawCafeTiles } from '../ui/cafeTiles';
import { COLORS, TEXT, css } from '../ui/theme';
import { getGameState, setGameState } from './gameStore';
import type { WorldMapRequest } from './WorldMapScene';

/** How far (px) a press must move to count as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;

/** Each furniture kind's sprite (art/sprites/cafe.ts). */
const FURNITURE_ART = { table: 'table', chair: 'chair' } as const satisfies Record<FurnitureKind, string>;

/** A press that may become a drag: of a placed piece (with a table's chairs), or one from storage (`from` null). */
interface Drag {
  kind: FurnitureKind;
  from: Point | null;
  /** The placed pieces that move together (empty when dragging from storage). */
  pieces: readonly PlacedPiece[];
  /** Where the press started, in screen pixels. */
  start: Phaser.Math.Vector2;
  /** The see-through copy, once the press has moved far enough to be a drag. */
  ghost: Phaser.GameObjects.Container | null;
}

/**
 * Arranging the cafe's tables and chairs between days (GAME_DESIGN.md §5.7).
 * Opened from the map's Cafe panel. The empty cafe (no customers, no clock)
 * with a storage tray on the left: pick a piece, tap the floor to place it;
 * tap a placed piece to put it away. Every change goes straight into the
 * game state, so Done just goes back to the map.
 */
export class DecorateScene extends Phaser.Scene {
  private origin!: Point;
  private tiles!: Phaser.GameObjects.RenderTexture;
  /** The tray: one button per kind, showing how many are in storage. */
  private trayButtons = new Map<FurnitureKind, Button>();
  private selectedOutline!: Phaser.GameObjects.Rectangle;
  /** What the next floor tap places; null = nothing picked yet. */
  private selected: FurnitureKind | null = null;
  /** A press that may turn into a drag; null when the pointer is up. */
  private drag: Drag | null = null;

  constructor() {
    super('DecorateScene');
  }

  create(): void {
    this.selected = null;
    this.drag = null;
    this.trayButtons = new Map();
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.wall).setOrigin(0);
    this.origin = cafeOrigin(buildLayout(this.furniture()));
    this.tiles = addCafeCanvas(this);

    this.add.text(BASE_WIDTH / 2, 10, 'Decorate', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0.5, 0);
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 8, 'Drag pieces to move or place them. Tap a piece to put it away.', TEXT.label)
      .setOrigin(0.5, 1);

    // The storage tray, left of the cafe.
    this.add.text(64, 90, 'Storage', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0.5, 0);
    this.selectedOutline = this.add.rectangle(0, 0, 112, 38).setStrokeStyle(3, COLORS.paper).setVisible(false);
    FURNITURE_KINDS.forEach((kind, i) => {
      const button = new Button(this, 64, 130 + i * 44, 104, 30, '', COLORS.book, () => this.select(kind));
      // Pressing a tray button may also start dragging one out of storage.
      button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
        if (this.furniture().stored[kind] > 0) this.drag = { kind, from: null, pieces: [], start: pointer.position.clone(), ghost: null };
      });
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

    // A press on a placed piece may become a drag (moving it); one that
    // doesn't move is a tap (putting it away), as before dragging existed.
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a button: the tray handles its own
        const tile = this.tileUnder(pointer);
        const piece = pieceAt(this.furniture(), tile);
        if (piece) {
          const pieces = pieceGroup(this.furniture(), tile);
          this.drag = { kind: piece.kind, from: tile, pieces, start: pointer.position.clone(), ghost: null };
        }
      },
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.onDragMove(pointer));
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        const drag = this.drag;
        this.drag = null;
        if (drag?.ghost) {
          this.drop(drag, this.tileUnder(pointer), over.length > 0);
          return;
        }
        if (over.length > 0) return; // a button's tap
        this.onTileTapped(this.tileUnder(pointer));
      },
    );
    // Let go outside the game window: the drag is called off.
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.drag?.ghost?.destroy();
      this.drag = null;
      this.refresh();
    });
    this.refresh();
  }

  /** The cafe tile under the pointer (it may be outside the grid). */
  private tileUnder(pointer: Phaser.Input.Pointer): Point {
    return {
      x: Math.floor((pointer.worldX - this.origin.x) / TILE_SIZE),
      y: Math.floor((pointer.worldY - this.origin.y) / TILE_SIZE),
    };
  }

  /**
   * Moving 4px or more turns a press into a drag: the pieces are lifted
   * out of the cafe and a see-through copy follows the pointer, snapped to
   * the tiles, red where they can't go.
   */
  private onDragMove(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || !pointer.isDown) return;
    if (!drag.ghost) {
      if (Phaser.Math.Distance.BetweenPoints(drag.start, pointer.position) < DRAG_THRESHOLD) return;
      drag.ghost = this.createGhost(drag);
      if (drag.from) {
        // Show the cafe without the lifted pieces while they're in the air.
        const lifted = this.furniture().placed.filter((p) => !drag.pieces.includes(p));
        drawCafeTiles(this.tiles, buildLayout({ ...this.furniture(), placed: lifted }), this.origin);
      }
    }
    const tile = this.tileUnder(pointer);
    drag.ghost.setPosition(this.origin.x + tile.x * TILE_SIZE, this.origin.y + tile.y * TILE_SIZE);
    const ok = this.dropProblem(drag, tile) === null;
    for (const image of drag.ghost.list as Phaser.GameObjects.Image[]) {
      if (ok) image.clearTint();
      else image.setTint(COLORS.statusUpset);
    }
  }

  /** The dragged pieces as images, placed relative to the tile being dragged (the ghost's origin). */
  private createGhost(drag: Drag): Phaser.GameObjects.Container {
    const pieces: readonly PlacedPiece[] = drag.from ? drag.pieces : [{ kind: drag.kind, x: 0, y: 0 }];
    const from = drag.from ?? { x: 0, y: 0 };
    const images = pieces.map((p) =>
      this.add
        .image((p.x - from.x) * TILE_SIZE, (p.y - from.y) * TILE_SIZE, artKey(FURNITURE_ART[p.kind]))
        .setOrigin(0),
    );
    return this.add.container(0, 0, images).setAlpha(0.75).setDepth(50);
  }

  /** Why dropping here wouldn't work, or null if it would. */
  private dropProblem(drag: Drag, tile: Point): string | null {
    return drag.from
      ? moveProblem(this.furniture(), drag.from, tile)
      : placeProblem(this.furniture(), drag.kind, tile);
  }

  /** Let go: move (or place) the pieces if they fit, else say why and put everything back. */
  private drop(drag: Drag, tile: Point, onButton: boolean): void {
    drag.ghost?.destroy();
    const layout = buildLayout(this.furniture());
    const inCafe = tile.x >= 0 && tile.y >= 0 && tile.x < layout.width && tile.y < layout.height;
    // Dropped back on the tray, or off the cafe: called off, nothing to explain.
    if (onButton || !inCafe) {
      this.refresh();
      return;
    }
    const problem = this.dropProblem(drag, tile);
    if (problem) {
      this.showMessage(tile, problem);
      this.refresh();
    } else if (drag.from) {
      this.setFurniture(movePiece(this.furniture(), drag.from, tile));
    } else {
      this.setFurniture(placePiece(this.furniture(), drag.kind, tile));
    }
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
