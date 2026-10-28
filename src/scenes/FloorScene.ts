import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { parseLayout, type Layout, type Point, type TileKind } from '../logic/layout';
import { createWalker, isMoving, stepWalker, walkerPosition, walkTo, type Walker } from '../logic/walker';
import { Button } from '../ui/Button';
import { COLORS } from '../ui/theme';

const TILE_COLORS: Record<Exclude<TileKind, 'floor'>, number> = {
  wall: COLORS.wallTile,
  door: COLORS.doorTile,
  counter: COLORS.counterTop,
  table: COLORS.tableTop,
  seat: COLORS.seatTile,
};

/**
 * Top-down cafe floor. Drawn entirely from the layout data, so editing
 * data/cafeLayout.ts changes the room without touching this file.
 *
 * Like PrepScene, this only wires things up: movement rules live in
 * logic/walker.ts and logic/pathfinding.ts; this class turns taps into
 * walkTo() calls and draws the result each frame.
 */
export class FloorScene extends Phaser.Scene {
  private layout!: Layout;
  /** Pixel position of tile (0, 0); the grid is centred on screen. */
  private origin!: Point;

  private player!: Walker;
  private playerSprite!: Phaser.GameObjects.Container;
  private destinationMarker!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('FloorScene');
  }

  create(): void {
    this.layout = parseLayout(CAFE_LAYOUT);
    // Math.floor keeps the grid on whole pixels; a half-pixel offset would
    // make every tile edge blurry.
    this.origin = {
      x: Math.floor((BASE_WIDTH - this.layout.width * TILE_SIZE) / 2),
      y: Math.floor((BASE_HEIGHT - this.layout.height * TILE_SIZE) / 2),
    };

    this.drawTiles();

    // Small outline showing where the player is heading; hidden when idle.
    this.destinationMarker = this.add
      .rectangle(0, 0, TILE_SIZE - 2, TILE_SIZE - 2)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.apron)
      .setVisible(false);

    this.player = createWalker(this.layout.playerStart);
    this.playerSprite = this.createPlayerSprite();

    // Listen on the whole scene, not on each tile: one handler converts the
    // tap position to a tile. 'pointerup' works the same for mouse and touch.
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // Taps on a button are the button's business, not a walk command.
        if (over.length > 0) return;
        this.onTileTapped(this.pixelToTile(pointer.worldX, pointer.worldY));
      },
    );

    // TEMPORARY (milestone 3 replaces this with walking up to the counter).
    new Button(this, 64, 20, 112, 28, 'Prep >', COLORS.book, () => this.scene.start('PrepScene'));
  }

  update(_time: number, deltaMs: number): void {
    this.player = stepWalker(this.player, deltaMs / 1000, FLOOR_CONFIG.playerSpeed);

    const pos = walkerPosition(this.player);
    // Round to whole pixels so the sprite never sits between pixels (blurry).
    this.playerSprite.setPosition(
      Math.round(this.origin.x + pos.x * TILE_SIZE),
      Math.round(this.origin.y + pos.y * TILE_SIZE),
    );
    if (!isMoving(this.player)) this.destinationMarker.setVisible(false);
  }

  private onTileTapped(tile: Point): void {
    const next = walkTo(this.player, this.layout, tile);
    if (next === this.player) return; // unreachable: walls, furniture, outside the room
    this.player = next;

    const marker = this.tileToPixel(tile);
    this.destinationMarker.setPosition(marker.x + 1, marker.y + 1).setVisible(true);
  }

  /** Top-left pixel of a tile. */
  private tileToPixel(p: Point): Point {
    return { x: this.origin.x + p.x * TILE_SIZE, y: this.origin.y + p.y * TILE_SIZE };
  }

  /** Which tile a screen pixel falls in (may be outside the grid). */
  private pixelToTile(px: number, py: number): Point {
    return {
      x: Math.floor((px - this.origin.x) / TILE_SIZE),
      y: Math.floor((py - this.origin.y) / TILE_SIZE),
    };
  }

  private drawTiles(): void {
    // One Graphics object for the whole static floor: far cheaper than
    // hundreds of separate rectangle objects, and it never changes.
    const g = this.add.graphics();
    this.layout.tiles.forEach((row, y) => {
      row.forEach((tile, x) => {
        const { x: px, y: py } = this.tileToPixel({ x, y });
        // Checkerboard floor makes the tile grid readable before real art.
        const checker = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        const color = tile === 'floor' ? checker : TILE_COLORS[tile];
        g.fillStyle(color);
        g.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      });
    });

    // Mark where customers stand to order.
    const spot = this.tileToPixel(this.layout.orderSpot);
    g.fillStyle(COLORS.orderSpot);
    g.fillRect(spot.x + 3, spot.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
  }

  /**
   * Placeholder player: a blue critter with a cream apron. Drawn once inside
   * a Container at local (0, 0)-(16, 16), so moving it is just setPosition.
   */
  private createPlayerSprite(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(COLORS.player);
    g.fillRect(3, 1, 10, 14);
    g.fillStyle(COLORS.apron);
    g.fillRect(5, 8, 6, 6);
    g.fillStyle(COLORS.ink);
    g.fillRect(5, 4, 2, 2);
    g.fillRect(9, 4, 2, 2);
    return this.add.container(0, 0, [g]);
  }
}
