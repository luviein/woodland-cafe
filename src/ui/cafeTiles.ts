import type Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import type { Layout, Point, TileKind } from '../logic/layout';
import { COLORS } from './theme';

// The cafe's tiles, drawn the same way on the floor (FloorScene) and while
// decorating (DecorateScene). Placeholder colours until real art.

const TILE_COLORS: Record<Exclude<TileKind, 'floor'>, number> = {
  wall: COLORS.wallTile,
  door: COLORS.doorTile,
  counter: COLORS.counterTop,
  table: COLORS.tableTop,
  seat: COLORS.seatTile,
};

/**
 * Top-left pixel of the grid, centring it on the screen. Math.floor keeps the
 * grid on whole pixels; a half-pixel offset would make every tile edge blurry.
 */
export function cafeOrigin(layout: Layout): Point {
  return {
    x: Math.floor((BASE_WIDTH - layout.width * TILE_SIZE) / 2),
    y: Math.floor((BASE_HEIGHT - layout.height * TILE_SIZE) / 2),
  };
}

/** Draws every tile into `g` (cleared first), plus the order spot and queue marks. */
export function drawCafeTiles(g: Phaser.GameObjects.Graphics, layout: Layout, origin: Point): void {
  const px = (p: Point): Point => ({ x: origin.x + p.x * TILE_SIZE, y: origin.y + p.y * TILE_SIZE });
  g.clear();
  layout.tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      const p = px({ x, y });
      // Checkerboard floor makes the tile grid readable before real art.
      const checker = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      g.fillStyle(tile === 'floor' ? checker : TILE_COLORS[tile]);
      g.fillRect(p.x, p.y, TILE_SIZE, TILE_SIZE);
    });
  });

  // Mark where customers stand to order.
  const spot = px(layout.orderSpot);
  g.fillStyle(COLORS.orderSpot);
  g.fillRect(spot.x + 3, spot.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);

  // Small dots where the counter queue forms.
  for (const linePoint of layout.queueSpots) {
    const p = px(linePoint);
    g.fillRect(p.x + 6, p.y + 6, 4, 4);
  }
}
