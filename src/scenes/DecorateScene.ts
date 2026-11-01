import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FURNITURE, FURNITURE_KINDS, type FurnitureKind } from '../data/furniture';
import {
  buildLayout,
  movePiece,
  moveProblem,
  pieceAt,
  placePiece,
  placeProblem,
  removePiece,
  type Furniture,
  type PlacedPiece,
} from '../logic/furniture';
import type { Point } from '../logic/layout';
import { addArt, artKey } from '../ui/art';
import { Button } from '../ui/Button';
import { addCafeCanvas, cafeOrigin, drawCafeTiles } from '../ui/cafeTiles';
import { COLORS, TEXT, css } from '../ui/theme';
import { getGameState, setGameState, tutorialEvent } from './gameStore';
import { seeTip } from '../logic/gameState';
import { StoryBox } from '../ui/StoryBox';
import { BOTTOM_BOX_LEFT } from '../ui/hudLayout';
import { TIPS } from '../data/tutorial';
import type { WorldMapRequest } from './WorldMapScene';

/** The storage tray and Done, in the strip under the cafe. */
const TRAY = { x: 64, y: BASE_HEIGHT - 42, firstButton: 196, buttonWidth: 104 };

/** How far (px) a press must move to count as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;

/** Each furniture kind's sprite (art/sprites/cafe.ts). */
const FURNITURE_ART = { table: 'table', chair: 'chair' } as const satisfies Record<FurnitureKind, string>;

/** A press that may become a drag: of a placed piece, or one from storage (`from` null). */
interface Drag {
  kind: FurnitureKind;
  from: Point | null;
  /** The placed piece being moved, as a list for the ghost (empty when dragging from storage). */
  pieces: readonly PlacedPiece[];
  /** Where the press started, in screen pixels. */
  start: Phaser.Math.Vector2;
  /** The see-through copy, once the press has moved far enough to be a drag. */
  ghost: Phaser.GameObjects.Container | null;
}

/**
 * Arranging the cafe's tables and chairs between days (GAME_DESIGN.md §5.7).
 * Opened from the map's Cafe panel. The empty cafe (no customers, no clock)
 * with a storage tray on the left: pick a piece and tap the floor (or drag
 * it there) to place it; drag a placed piece to move it, or tap it for the
 * Move / Put away menu. Every change goes straight into the game state, so
 * Done just goes back to the map.
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
  /** Pieces lifted with the menu's Move: they follow the pointer until the next tap on the floor. */
  private carrying: Drag | null = null;
  /** The Move / Put away menu over a tapped piece (its objects), or null. */
  private menu: Phaser.GameObjects.GameObject[] | null = null;

  constructor() {
    super('DecorateScene');
  }

  create(): void {
    this.selected = null;
    this.drag = null;
    this.carrying = null;
    this.menu = null;
    this.trayButtons = new Map();
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.wall).setOrigin(0);
    this.origin = cafeOrigin(buildLayout(this.furniture()));
    this.tiles = addCafeCanvas(this);

    // On the cafe's top wall, outlined so it reads on the logs.
    this.add
      .text(BASE_WIDTH / 2, 8, 'Decorate', { ...TEXT.heading, color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 4 })
      .setOrigin(0.5, 0);
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 8, 'Drag pieces to move or place them. Tap a piece for more.', TEXT.label)
      .setOrigin(0.5, 1);

    // The storage tray, in the strip under the cafe (right of the corner buttons).
    this.add.text(TRAY.x, TRAY.y, 'Storage', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0, 0.5);
    this.selectedOutline = this.add.rectangle(0, 0, 112, 38).setStrokeStyle(3, COLORS.paper).setVisible(false);
    FURNITURE_KINDS.forEach((kind, i) => {
      const button = new Button(this, TRAY.firstButton + i * (TRAY.buttonWidth + 12), TRAY.y, TRAY.buttonWidth, 30, '', COLORS.book, () =>
        this.select(kind),
      );
      // Pressing a tray button may also start dragging one out of storage.
      button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
        if (this.furniture().stored[kind] > 0) this.drag = { kind, from: null, pieces: [], start: pointer.position.clone(), ghost: null };
      });
      this.trayButtons.set(kind, button);
    });
    new Button(this, BASE_WIDTH - 64, TRAY.y, 100, 30, 'Done', COLORS.serve, () => this.done());
    // Esc backs out one step at a time: a carried piece, then the menu, then the screen.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.carrying) this.cancelCarrying();
      else if (event.key === 'Escape' && this.menu) this.closeMenu();
      else if ((event.key === 'Escape' || event.key === 'Enter') && !this.carrying && !this.menu) this.done();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey),
    );

    // A press on a placed piece may become a drag (moving it); one that
    // doesn't move is a tap (opening its menu).
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a button: the tray handles its own
        if (this.carrying) return; // the coming tap puts the carried pieces down
        const tile = this.tileUnder(pointer);
        const piece = pieceAt(this.furniture(), tile);
        if (piece) this.drag = { kind: piece.kind, from: tile, pieces: [piece], start: pointer.position.clone(), ghost: null };
      },
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        const drag = this.drag;
        this.drag = null;
        if (drag?.ghost) {
          this.drop(drag, this.tileUnder(pointer), over.length > 0);
          return;
        }
        if (over.length > 0) return; // a button's tap (menu buttons close the menu themselves)
        if (this.carrying) {
          this.putDownCarried(this.tileUnder(pointer));
          return;
        }
        // A tap anywhere else closes the menu, and does only that.
        if (this.menu) {
          this.closeMenu();
          return;
        }
        this.onTileTapped(this.tileUnder(pointer));
      },
    );
    // Let go outside the game window: the drag is called off.
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.drag?.ghost?.destroy();
      this.drag = null;
      if (!this.carrying) this.refresh();
    });
    this.refresh();
    this.showTips();
  }

  /**
   * Grandma's Decorate tips, the first time only (GAME_DESIGN.md §5.9):
   * along the bottom, clear of Done, pointing at the tray and then a table.
   */
  private showTips(): void {
    if (getGameState(this).tipsSeen.includes('decorate')) return;
    const firstTable = this.furniture().placed.find((p) => p.kind === 'table');
    const guide = new StoryBox(this, {
      // Clear of the corner buttons on the left and Done on the right.
      rect: { x: BOTTOM_BOX_LEFT, y: 294, width: 516 - BOTTOM_BOX_LEFT, height: 62 },
      step: TIPS.decorate,
      arrow: (line) => {
        const tray = this.trayButtons.get('table');
        if (line === 1 && tray) return { x: tray.x, y: tray.y - 18 };
        if (line === 2 && firstTable) {
          return { x: this.origin.x + firstTable.x * TILE_SIZE + TILE_SIZE / 2, y: this.origin.y + firstTable.y * TILE_SIZE };
        }
        return null;
      },
      onFinished: () => {
        setGameState(this, seeTip(getGameState(this), 'decorate'));
        guide.destroy();
      },
      onSkip: () => {
        tutorialEvent(this, 'skip');
        guide.destroy();
      },
    });
  }

  /** The cafe tile under the pointer (it may be outside the grid). */
  private tileUnder(pointer: Phaser.Input.Pointer): Point {
    return {
      x: Math.floor((pointer.worldX - this.origin.x) / TILE_SIZE),
      y: Math.floor((pointer.worldY - this.origin.y) / TILE_SIZE),
    };
  }

  /**
   * Carried pieces follow the pointer. A press that moves 4px or more
   * becomes a drag: the pieces are lifted and follow it too.
   */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.carrying) {
      this.moveGhost(this.carrying, this.tileUnder(pointer));
      return;
    }
    const drag = this.drag;
    if (!drag || !pointer.isDown) return;
    if (!drag.ghost) {
      if (Phaser.Math.Distance.BetweenPoints(drag.start, pointer.position) < DRAG_THRESHOLD) return;
      this.closeMenu();
      this.lift(drag);
    }
    this.moveGhost(drag, this.tileUnder(pointer));
  }

  /** Takes the pieces out of the drawn cafe and makes their see-through copy. */
  private lift(drag: Drag): void {
    if (drag.from) {
      // Show the cafe without the lifted pieces while they're in the air.
      const lifted = this.furniture().placed.filter((p) => !drag.pieces.includes(p));
      drawCafeTiles(this.tiles, buildLayout({ ...this.furniture(), placed: lifted }), this.origin);
    }
    // Made last, so if anything above ever fails there's no copy left stuck
    // at the top-left corner (where a not-yet-placed copy sits).
    drag.ghost = this.createGhost(drag);
  }

  /** Snaps the see-through copy to `tile`, red if it couldn't be put down there. */
  private moveGhost(drag: Drag, tile: Point): void {
    if (!drag.ghost) return;
    drag.ghost.setPosition(this.origin.x + tile.x * TILE_SIZE, this.origin.y + tile.y * TILE_SIZE);
    const ok = this.dropProblem(drag, tile) === null;
    for (const image of drag.ghost.list as Phaser.GameObjects.Image[]) {
      if (ok) image.clearTint();
      else image.setTint(COLORS.statusUpset);
    }
  }

  /**
   * The menu over a tapped piece: Move and Put away, as icon buttons on a
   * small paper panel, just above the piece (below it on the top row).
   */
  private openMenu(tile: Point): void {
    this.closeMenu();
    const tileX = this.origin.x + tile.x * TILE_SIZE + TILE_SIZE / 2;
    const tileTop = this.origin.y + tile.y * TILE_SIZE;
    const y = tile.y <= 1 ? tileTop + TILE_SIZE + 16 : tileTop - 16;
    const x = Phaser.Math.Clamp(tileX, 32, BASE_WIDTH - 32);
    // Interactive only so a tap on the panel between the buttons doesn't count as "elsewhere".
    const panel = this.add.rectangle(x, y, 56, 30, COLORS.paper).setStrokeStyle(2, COLORS.ink).setInteractive();
    // An outline around the tapped piece, so it's clear which one the menu is for.
    const outline = this.add
      .rectangle(tileX, tileTop + TILE_SIZE / 2, TILE_SIZE + 2, TILE_SIZE + 2)
      .setStrokeStyle(2, COLORS.paper);
    // Small buttons with the 13x13 icons at 1x: about a tile and a half each.
    const move = new Button(this, x - 13, y, 22, 22, '', COLORS.book, () => this.startCarrying(tile)).setIcon(
      addArt(this, 0, 0, 'moveIcon'),
    );
    const store = new Button(this, x + 13, y, 22, 22, '', COLORS.reset, () => this.putAway(tile)).setIcon(
      addArt(this, 0, 0, 'storeIcon'),
    );
    const parts = [panel, outline, move, store];
    for (const o of parts) o.setDepth(60);
    this.menu = parts;
  }

  private closeMenu(): void {
    for (const o of this.menu ?? []) o.destroy();
    this.menu = null;
  }

  /** Menu: Move. Just that piece lifts and follows the pointer. */
  private startCarrying(tile: Point): void {
    this.closeMenu();
    const piece = pieceAt(this.furniture(), tile);
    if (!piece) return;
    // `start` is only used to tell a press from a drag, which doesn't apply here.
    const carrying: Drag = { kind: piece.kind, from: tile, pieces: [piece], start: new Phaser.Math.Vector2(), ghost: null };
    this.lift(carrying);
    this.moveGhost(carrying, tile);
    this.carrying = carrying;
    this.showMessage(tile, 'Tap where it should go');
  }

  /** The tap after Move: put the pieces down if they fit; if not, say why and keep carrying. */
  private putDownCarried(tile: Point): void {
    const carrying = this.carrying;
    if (!carrying?.from) return;
    const layout = buildLayout(this.furniture());
    if (tile.x < 0 || tile.y < 0 || tile.x >= layout.width || tile.y >= layout.height) return;
    const problem = moveProblem(this.furniture(), carrying.from, tile);
    if (problem) {
      this.showMessage(tile, problem);
      return;
    }
    carrying.ghost?.destroy();
    this.carrying = null;
    this.applyMove(carrying.from, tile);
  }

  /** Esc while carrying: everything goes back where it was. */
  private cancelCarrying(): void {
    this.carrying?.ghost?.destroy();
    this.carrying = null;
    this.refresh();
  }

  /** Menu: Put away. Into storage (a table takes its chairs). */
  private putAway(tile: Point): void {
    this.closeMenu();
    this.setFurniture(removePiece(this.furniture(), tile));
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
      this.applyMove(drag.from, tile);
    } else {
      this.setFurniture(placePiece(this.furniture(), drag.kind, tile));
    }
  }

  /** Moves a piece (already checked). */
  private applyMove(from: Point, to: Point): void {
    this.setFurniture(movePiece(this.furniture(), from, to));
  }

  private furniture(): Furniture {
    return getGameState(this).furniture;
  }

  private setFurniture(furniture: Furniture): void {
    setGameState(this, { ...getGameState(this), furniture });
    this.refresh();
  }

  private select(kind: FurnitureKind): void {
    this.closeMenu();
    if (this.carrying) this.cancelCarrying();
    this.selected = this.selected === kind ? null : kind; // tap again to put it down
    this.refresh();
  }

  private onTileTapped(tile: Point): void {
    const layout = buildLayout(this.furniture());
    if (tile.x < 0 || tile.y < 0 || tile.x >= layout.width || tile.y >= layout.height) return;

    if (pieceAt(this.furniture(), tile)) {
      this.openMenu(tile);
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
