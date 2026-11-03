import { christmasCatalogueShop } from '../ui/christmasCatalogueShop';
import Phaser from 'phaser';
import { RoomPainterPanel } from '../ui/RoomPainterPanel';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { CHRISTMAS_CATALOGUE, DESIGN_IDS, FURNITURE, kindOf, placesOf, type DesignId } from '../data/furniture';
import {
  buildLayout,
  movePiece,
  moveProblem,
  pieceAt,
  placePiece,
  placeProblem,
  removePiece,
  spotAt,
  type Furniture,
  type PlacedPiece,
} from '../logic/furniture';
import type { Point } from '../logic/layout';
import { addArt, artKey } from '../ui/art';
import { Button } from '../ui/Button';
import { addCafeCanvas, cafeOrigin, drawCafeTiles, pieceDrawing } from '../ui/cafeTiles';
import { CataloguePanel } from '../ui/CataloguePanel';
import { shopsAt } from '../logic/shop';
import { devSettings } from '../debug/devSettings';
import { COLORS, TEXT, css } from '../ui/theme';
import { getGameState, setGameState, tutorialEvent } from './gameStore';
import { seeTip } from '../logic/gameState';
import { StoryBox } from '../ui/StoryBox';
import { bottomBoxLeft } from '../ui/hudLayout';
import { arrangeable, sizeBox } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { TIPS } from '../data/tutorial';
import type { WorldMapRequest } from './WorldMapScene';

/**
 * The storage tray and Done, in the strip under the cafe: a card per design
 * (its picture and how many are in storage), a page at a time.
 */
const TRAY = { x: 64, y: BASE_HEIGHT - 42, firstCard: 172, card: 40, gap: 4, perPage: 7 };

/** Where something goes in Decorate: by name, movable in Arrange mode (GAME_DESIGN.md §9.3). */
const at = (name: string, x: number, y: number): Point => layoutPoint('decorate', name, { x, y });

/** How far (px) a press must move to count as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;

/** Where a design can go, for the hint under the tray, e.g. "the back wall or the counter". */
function placeWords(design: DesignId): string {
  const words = { floor: 'the floor', wall: 'the back wall', counterFront: 'the counter', counterTop: 'the counter' } as const;
  return [...new Set(placesOf(design).map((p) => words[p]))].join(' or ');
}

/** Always in the tray, even with none in storage: the plain table and chair (Grandma's tip points at the table). */
const ALWAYS_IN_TRAY: readonly DesignId[] = ['table', 'chair'];

/** One card in the tray. */
interface TrayCard {
  design: DesignId;
  parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text)[];
  frame: Phaser.GameObjects.Rectangle;
  count: Phaser.GameObjects.Text;
}

/** A press that may become a drag: of a placed piece, or one from storage (`from` null). */
interface Drag {
  design: DesignId;
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
  /** The tray's cards on show, the designs they're for, and which page of them. */
  private trayCards: TrayCard[] = [];
  private trayPage = 0;
  private trayPrev!: Button;
  private trayNext!: Button;
  private selectedOutline!: Phaser.GameObjects.Rectangle;
  /** The tray's first card's centre (movable in Arrange mode), and the layer its cards live in (so they move together). */
  private trayAt!: Point;
  private trayLayer!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;
  private painter: RoomPainterPanel | null = null;
  private catalogue: CataloguePanel | null = null;
  /** What the next floor tap places; null = nothing picked yet. */
  private selected: DesignId | null = null;
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
    this.trayCards = [];
    this.trayPage = 0;
    this.catalogue = null;
    this.painter = null;
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.wall).setOrigin(0);
    this.origin = cafeOrigin(buildLayout(this.furniture(), this.room()));
    this.tiles = addCafeCanvas(this);

    // On the cafe's top wall, outlined so it reads on the logs.
    const titleAt = at('title', BASE_WIDTH / 2, 8);
    const title = this.add
      .text(titleAt.x, titleAt.y, 'Decorate', { ...TEXT.heading, color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 4 })
      .setOrigin(0.5, 0);
    arrangeable(this, 'decorate', 'title', titleAt, title);
    const hintAt = at('hint', BASE_WIDTH / 2, BASE_HEIGHT - 8);
    this.hint = this.add.text(hintAt.x, hintAt.y, '', TEXT.label).setOrigin(0.5, 1);
    arrangeable(this, 'decorate', 'hint', hintAt, this.hint);

    // The storage tray, in the strip under the cafe (right of the corner buttons).
    // The tray moves as one, by its first card: its label, arrows and cards (in their own layer).
    this.trayAt = at('tray', TRAY.firstCard, TRAY.y);
    this.trayLayer = this.add.container(0, 0);
    const label = this.add
      .text(this.trayAt.x - (TRAY.firstCard - TRAY.x), this.trayAt.y, 'Storage', { ...TEXT.heading, color: css(COLORS.paper) })
      .setOrigin(0, 0.5);
    this.selectedOutline = this.add.rectangle(0, 0, TRAY.card + 4, TRAY.card + 4).setStrokeStyle(3, COLORS.paper).setVisible(false);
    const arrowY = this.trayAt.y;
    this.trayPrev = new Button(this, this.trayAt.x - TRAY.card / 2 - 14, arrowY, 18, TRAY.card, '<', COLORS.book, () => this.turnTray(-1));
    this.trayNext = new Button(this, this.cardX(TRAY.perPage - 1) + TRAY.card / 2 + 14, arrowY, 18, TRAY.card, '>', COLORS.book, () => this.turnTray(1));
    arrangeable(this, 'decorate', 'tray', this.trayAt, label, this.trayPrev, this.trayNext, this.trayLayer, ...sizeBox(this, label.x, this.trayAt.y - TRAY.card / 2, this.cardX(TRAY.perPage - 1) + TRAY.card / 2 - label.x, TRAY.card));
    const doneAt = at('done', BASE_WIDTH - 64, TRAY.y);
    arrangeable(this, 'decorate', 'done', doneAt, new Button(this, doneAt.x, doneAt.y, 100, 30, 'Done', COLORS.serve, () => this.done()));
    // The Christmas catalogue, to buy more without leaving (while the Christmas stall is open).
    if (shopsAt('marketplace', new Date(), devSettings.allSeasons).includes('christmas')) {
      const catalogueAt = at('catalogue', BASE_WIDTH - 60, 16);
      arrangeable(this, 'decorate', 'catalogue', catalogueAt, new Button(this, catalogueAt.x, catalogueAt.y, 104, 22, 'Catalogue', COLORS.book, () => this.openCatalogue()));
    }
    const paintAt = at('paintRoom', 68, 16);
    arrangeable(this, 'decorate', 'paintRoom', paintAt, new Button(this, paintAt.x, paintAt.y, 112, 22, 'Paint room', COLORS.book, () => this.openPainter()));
    // Esc backs out one step at a time: a carried piece, then the menu, then the screen.
    const onKey = (event: KeyboardEvent) => {
      if (this.catalogue || this.painter) return; // panels own their keys
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
        if (this.painter) return;
        if (over.length > 0) return; // a button: the tray handles its own
        if (this.carrying) return; // the coming tap puts the carried pieces down
        const tile = this.tileUnder(pointer);
        const piece = pieceAt(this.furniture(), tile);
        if (piece) this.startDrag({ design: piece.design, from: tile, pieces: [piece], start: pointer.position.clone(), ghost: null });
      },
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (this.painter) return;
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
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => this.cancelDrag());
    // The game lost focus mid-drag (e.g. a screenshot shortcut): the let-go
    // will never arrive, so call the drag off rather than leave its copy stuck.
    const onBlur = () => this.cancelDrag();
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));
    this.refresh();
    this.showTips();
  }

  /**
   * Grandma's Decorate tips, the first time only (GAME_DESIGN.md §5.9):
   * along the bottom, clear of Done, pointing at the tray and then a table.
   */
  private showTips(): void {
    if (getGameState(this).tipsSeen.includes('decorate')) return;
    const firstTable = this.furniture().placed.find((p) => kindOf(p.design) === 'table');
    const guideAt = at('guide', bottomBoxLeft(), 294);
    const guideRect = { x: guideAt.x, y: guideAt.y, width: 516 - guideAt.x, height: 62 };
    const guide = new StoryBox(this, {
      // Clear of the corner buttons on the left and Done on the right.
      rect: guideRect,
      step: TIPS.decorate,
      arrow: (line) => {
        const target = TIPS.decorate.pointsAt[line];
        const tray = this.trayCards.find((c) => c.design === 'table');
        if (target === 'tray' && tray) return { x: tray.frame.x, y: tray.frame.y - 22 };
        if (target === 'table' && firstTable) {
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
    arrangeable(this, 'decorate', 'guide', guideAt, guide, ...sizeBox(this, guideRect.x, guideRect.y, guideRect.width, guideRect.height));
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
    if (this.painter) return;
    if (this.carrying) {
      this.moveGhost(this.carrying, this.tileUnder(pointer));
      return;
    }
    const drag = this.drag;
    if (!drag) return;
    if (!pointer.isDown) {
      // Moving with nothing held: the let-go happened where the game couldn't see it.
      if (drag.ghost) this.cancelDrag();
      return;
    }
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
      drawCafeTiles(this.tiles, buildLayout({ ...this.furniture(), placed: lifted }, this.room()), this.origin, lifted);
    }
    // Made last, so if anything above ever fails there's no copy left stuck
    // at the top-left corner (where a not-yet-placed copy sits).
    drag.ghost = this.createGhost(drag);
  }

  /** Starts a press that may become a drag, calling off any drag that lost its let-go first. */
  private startDrag(drag: Drag): void {
    if (this.drag?.ghost) this.cancelDrag();
    this.drag = drag;
  }

  /** Calls the drag off: its copy goes, and everything is drawn where it really is. */
  private cancelDrag(): void {
    const hadGhost = Boolean(this.drag?.ghost);
    this.drag?.ghost?.destroy();
    this.drag = null;
    if (hadGhost && !this.carrying) this.refresh();
  }

  /**
   * Snaps the see-through copy to `tile`, drawn exactly as it would be put
   * down there (on the floor, on the wall, along the counter's front or on its
   * top), red if it couldn't be put down there.
   */
  private moveGhost(drag: Drag, tile: Point): void {
    if (!drag.ghost) return;
    drag.ghost.setPosition(this.origin.x + tile.x * TILE_SIZE, this.origin.y + tile.y * TILE_SIZE);
    const ok = this.dropProblem(drag, tile) === null;
    const from = drag.from ?? { x: 0, y: 0 };
    this.ghostPieces(drag).forEach((p, i) => {
      const image = drag.ghost!.list[i] as Phaser.GameObjects.Image;
      const offset = { x: p.x - from.x, y: p.y - from.y };
      const at = this.ghostDrawing(p, offset, { x: tile.x + offset.x, y: tile.y + offset.y }).at;
      image.setPosition(at.x, at.y);
      if (ok) image.clearTint();
      else image.setTint(COLORS.statusUpset);
    });
  }

  /** The pieces a drag carries: the lifted piece, or one new from storage. */
  private ghostPieces(drag: Drag): readonly PlacedPiece[] {
    return drag.from ? drag.pieces : [{ design: drag.design, x: 0, y: 0 }];
  }

  /**
   * How a carried piece is drawn, `offset` tiles from the ghost's origin,
   * over cafe tile `over`: as it would be put down there, or (off any spot
   * it could go) as on its usual place.
   */
  private ghostDrawing(p: PlacedPiece, offset: Point, over: Point): ReturnType<typeof pieceDrawing> {
    const spot = spotAt(this.room(), over);
    const usual = placesOf(p.design)[0];
    const on = spot ?? (usual === 'wall' ? 'wall' : usual === 'floor' ? 'floor' : 'counter');
    return pieceDrawing([], p, { x: offset.x * TILE_SIZE, y: offset.y * TILE_SIZE }, on);
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
    const carrying: Drag = { design: piece.design, from: tile, pieces: [piece], start: new Phaser.Math.Vector2(), ghost: null };
    this.lift(carrying);
    this.moveGhost(carrying, tile);
    this.carrying = carrying;
    this.showMessage(tile, 'Tap where it should go');
  }

  /** The tap after Move: put the pieces down if they fit; if not, say why and keep carrying. */
  private putDownCarried(tile: Point): void {
    const carrying = this.carrying;
    if (!carrying?.from) return;
    const layout = buildLayout(this.furniture(), this.room());
    if (tile.x < 0 || tile.y < 0 || tile.x >= layout.width || tile.y >= layout.height) return;
    const problem = moveProblem(this.furniture(), carrying.from, tile, this.room());
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

  /** Menu: Put away. Just that piece into storage (a table's chairs stay put). */
  private putAway(tile: Point): void {
    this.closeMenu();
    this.setFurniture(removePiece(this.furniture(), tile));
  }

  /** The dragged pieces as images, placed relative to the tile being dragged (the ghost's origin), drawn as on the floor. */
  private createGhost(drag: Drag): Phaser.GameObjects.Container {
    const from = drag.from ?? { x: 0, y: 0 };
    // Placed for where they are now; moveGhost() redraws them for each tile they pass over.
    const images = this.ghostPieces(drag).map((p) => {
      const offset = { x: p.x - from.x, y: p.y - from.y };
      const { art, frame, at } = this.ghostDrawing(p, offset, drag.from ? p : { x: -1, y: -1 });
      return this.add.image(at.x, at.y, artKey(art), frame).setOrigin(0);
    });
    return this.add.container(0, 0, images).setAlpha(0.75).setDepth(50);
  }

  /** Why dropping here wouldn't work, or null if it would. */
  private dropProblem(drag: Drag, tile: Point): string | null {
    return drag.from
      ? moveProblem(this.furniture(), drag.from, tile, this.room())
      : placeProblem(this.furniture(), drag.design, tile, this.room());
  }

  /** Let go: move (or place) the pieces if they fit, else say why and put everything back. */
  private drop(drag: Drag, tile: Point, onButton: boolean): void {
    drag.ghost?.destroy();
    const layout = buildLayout(this.furniture(), this.room());
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
      this.setFurniture(placePiece(this.furniture(), drag.design, tile, this.room()));
    }
  }

  /** Moves a piece (already checked). */
  private applyMove(from: Point, to: Point): void {
    this.setFurniture(movePiece(this.furniture(), from, to, this.room()));
  }

  private room(): readonly string[] { return getGameState(this).room; }

  private openPainter(): void {
    if (this.painter || this.catalogue) return;
    this.cancelDrag();
    this.closeMenu();
    if (this.carrying) this.cancelCarrying();
    this.selected = null;
    this.painter = new RoomPainterPanel(this, () => {
      const panel = this.painter;
      // Defer releasing input until this pointer-up has finished dispatching.
      this.time.delayedCall(0, () => { panel?.destroy(); this.painter = null; this.refresh(); });
    });
  }

  private furniture(): Furniture {
    return getGameState(this).furniture;
  }

  private setFurniture(furniture: Furniture): void {
    setGameState(this, { ...getGameState(this), furniture });
    this.refresh();
  }

  private select(design: DesignId): void {
    this.closeMenu();
    if (this.carrying) this.cancelCarrying();
    this.selected = this.selected === design ? null : design; // tap again to put it down
    this.refresh();
  }

  private onTileTapped(tile: Point): void {
    const layout = buildLayout(this.furniture(), this.room());
    if (tile.x < 0 || tile.y < 0 || tile.x >= layout.width || tile.y >= layout.height) return;

    if (pieceAt(this.furniture(), tile)) {
      this.openMenu(tile);
      return;
    }
    if (!this.selected) {
      this.showMessage(tile, 'Pick something from storage first');
      return;
    }
    const problem = placeProblem(this.furniture(), this.selected, tile, this.room());
    if (problem) this.showMessage(tile, problem);
    else this.setFurniture(placePiece(this.furniture(), this.selected, tile, this.room()));
  }

  /** Redraws the cafe and the tray from the game state. */
  private refresh(): void {
    const furniture = this.furniture();
    drawCafeTiles(this.tiles, buildLayout(furniture, this.room()), this.origin, furniture.placed);
    // Ran out of the picked piece: nothing left to place, so let go of it.
    if (this.selected && furniture.stored[this.selected] === 0) this.selected = null;
    this.refreshTray();
    this.hint.setText(
      this.selected
        ? `${FURNITURE[this.selected].name}: tap a spot to place it (${placeWords(this.selected)})`
        : 'Drag pieces to move or place them. Tap a piece for more.',
    );
  }

  /** The designs with a card in the tray: the plain table and chair, and anything else in storage. */
  private trayDesigns(): DesignId[] {
    const { stored } = this.furniture();
    return DESIGN_IDS.filter((d) => ALWAYS_IN_TRAY.includes(d) || stored[d] > 0);
  }

  private cardX(slot: number): number {
    return this.trayAt.x + slot * (TRAY.card + TRAY.gap);
  }

  /**
   * The tray's cards: rebuilt only when which designs are on show changes
   * (a piece runs out, a new one is bought, the page turns), otherwise just
   * the counts and the picked card's outline. Never rebuilt from a card's own
   * tap, which would pull the card out from under the pointer.
   */
  private refreshTray(): void {
    const designs = this.trayDesigns();
    const pages = Math.max(1, Math.ceil(designs.length / TRAY.perPage));
    this.trayPage = Math.min(this.trayPage, pages - 1);
    const onPage = designs.slice(this.trayPage * TRAY.perPage, (this.trayPage + 1) * TRAY.perPage);
    if (onPage.join() !== this.trayCards.map((c) => c.design).join()) {
      for (const card of this.trayCards) for (const o of card.parts) o.destroy();
      this.trayCards = onPage.map((design, slot) => this.createTrayCard(design, this.cardX(slot)));
      this.trayLayer.add(this.trayCards.flatMap((c) => c.parts));
      this.trayLayer.add(this.selectedOutline); // on top of the cards
    }
    const { stored } = this.furniture();
    for (const card of this.trayCards) {
      card.count.setText(`x${stored[card.design]}`);
      for (const o of card.parts) o.setAlpha(stored[card.design] > 0 ? 1 : 0.45);
    }
    this.trayPrev.setVisible(pages > 1).setEnabled(this.trayPage > 0);
    this.trayNext.setVisible(pages > 1).setEnabled(this.trayPage < pages - 1);
    const picked = this.trayCards.find((c) => c.design === this.selected);
    this.selectedOutline.setVisible(Boolean(picked));
    if (picked) this.selectedOutline.setPosition(picked.frame.x, picked.frame.y);
  }

  private turnTray(by: number): void {
    this.trayPage += by;
    this.refreshTray();
  }

  /** A tray card: the piece's picture on paper, its count in the corner. Tap to pick it; press and drag to place one. */
  private createTrayCard(design: DesignId, x: number): TrayCard {
    const def = FURNITURE[design];
    const frame = this.add.rectangle(x, this.trayAt.y, TRAY.card, TRAY.card, COLORS.paper).setStrokeStyle(2, COLORS.ink);
    frame.setInteractive({ useHandCursor: true });
    // Pressing a card may also start dragging one out of storage.
    frame.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.furniture().stored[design] > 0) this.startDrag({ design, from: null, pieces: [], start: pointer.position.clone(), ghost: null });
    });
    frame.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.drag?.ghost) this.select(design);
    });
    const image = addArt(this, x, this.trayAt.y + TRAY.card / 2 - 3, def.art).setOrigin(0.5, 1);
    // Everything fits the card at 1x today (the tree, 36 tall, is the biggest);
    // anything bigger later is shrunk to fit.
    image.setScale(Math.min(1, (TRAY.card - 2) / Math.max(image.width, image.height)));
    const count = this.add
      .text(x + TRAY.card / 2 - 2, this.trayAt.y + TRAY.card / 2 - 1, '', { ...TEXT.label, fontSize: '10px', stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(1, 1);
    return { design, parts: [frame, image, count], frame, count };
  }

  /** The Christmas catalogue over Decorate: buying adds to storage, and the tray shows it straight away. */
  private openCatalogue(): void {
    if (this.catalogue) return;
    this.closeMenu();
    if (this.carrying) this.cancelCarrying();
    const panel = new CataloguePanel(
      this,
      CHRISTMAS_CATALOGUE,
      christmasCatalogueShop(this, () => { panel.refresh(); this.refresh(); }),
      () => {
        // Destroyed once the close tap is over (see OutdoorScene.closeShop).
        this.catalogue = null;
        this.time.delayedCall(0, () => panel.destroy());
      },
    ).setDepth(100);
    this.catalogue = panel;
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
    if (this.painter) return;
    const request: WorldMapRequest = { current: 'cafe' };
    this.scene.start('WorldMapScene', request);
  }
}
