import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { parseLayout, type Layout, type Point, type TileKind } from '../logic/layout';
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
 */
export class FloorScene extends Phaser.Scene {
  private layout!: Layout;
  /** Pixel position of tile (0, 0); the grid is centred on screen. */
  private origin!: Point;

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
    this.drawPlayer(this.layout.playerStart);

    // TEMPORARY (milestone 3 replaces this with walking up to the counter).
    new Button(this, 64, 20, 112, 28, 'Prep >', COLORS.book, () => this.scene.start('PrepScene'));
  }

  /** Top-left pixel of a tile. */
  private tileToPixel(p: Point): Point {
    return { x: this.origin.x + p.x * TILE_SIZE, y: this.origin.y + p.y * TILE_SIZE };
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

  /** Placeholder player: a blue critter with a cream apron. */
  private drawPlayer(tile: Point): void {
    const { x, y } = this.tileToPixel(tile);
    const g = this.add.graphics();
    g.fillStyle(COLORS.player);
    g.fillRect(x + 3, y + 1, 10, 14);
    g.fillStyle(COLORS.apron);
    g.fillRect(x + 5, y + 8, 6, 6);
    g.fillStyle(COLORS.ink);
    g.fillRect(x + 5, y + 4, 2, 2);
    g.fillRect(x + 9, y + 4, 2, 2);
  }
}
