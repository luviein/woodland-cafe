import type Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import type { Layout, Point, TileKind } from '../logic/layout';
import { artKey } from './art';

// The cafe's tiles, drawn the same way on the floor (FloorScene) and while
// decorating (DecorateScene), from the sprites in art/sprites/cafe.ts.

const TILE_ART: Record<Exclude<TileKind, 'floor'>, ArtName> = {
  wall: 'wall',
  door: 'door',
  counter: 'counter',
  table: 'table',
  seat: 'chair',
};

/** Tiles drawn over the floor (they have see-through parts), not instead of it. */
const ON_FLOOR: ReadonlySet<TileKind> = new Set(['floor', 'table', 'seat']);

/** Every few tiles along the back wall gets a window. */
const WINDOW_EVERY = 5;

/** The cafe's top edge on screen: near the top, leaving the strip below for Grandma's box and Decorate's tray. */
const CAFE_TOP = 4;

/**
 * Top-left pixel of the grid: centred across the screen, near the top.
 * Math.floor keeps the grid on whole pixels; a half-pixel offset would make
 * every tile edge blurry.
 */
export function cafeOrigin(layout: Layout): Point {
  return { x: Math.floor((BASE_WIDTH - layout.width * TILE_SIZE) / 2), y: CAFE_TOP };
}

/** Top-left pixel for drawing a small sprite centred on (x, y). */
export function centred(name: ArtName, x: number, y: number): Point {
  const { width, height } = spriteSize(SPRITE_ART[name]);
  return { x: Math.round(x - width / 2), y: Math.round(y - height / 2) };
}

/**
 * A screen-sized canvas to draw the cafe into. One RenderTexture (a texture
 * you can draw on) is far cheaper than hundreds of separate tile images, and
 * the floor only changes when the furniture does.
 */
export function addCafeCanvas(scene: Phaser.Scene): Phaser.GameObjects.RenderTexture {
  return scene.add.renderTexture(0, 0, BASE_WIDTH, BASE_HEIGHT).setOrigin(0);
}

/** Draws every tile into `canvas` (cleared first), plus the order rug and the queue's paw prints. */
export function drawCafeTiles(canvas: Phaser.GameObjects.RenderTexture, layout: Layout, origin: Point): void {
  const px = (p: Point): Point => ({ x: origin.x + p.x * TILE_SIZE, y: origin.y + p.y * TILE_SIZE });
  canvas.clear();
  layout.tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      const p = px({ x, y });
      // Plank pattern picked from the position, so it's mixed but never changes.
      if (ON_FLOOR.has(tile)) canvas.drawFrame(artKey('floor'), (x * 3 + y * 2) % 2, p.x, p.y);
      if (tile === 'floor') return;
      const window = tile === 'wall' && y === 0 && x % WINDOW_EVERY === 2 && x < row.length - 2;
      canvas.drawFrame(artKey(TILE_ART[tile]), window ? 1 : 0, p.x, p.y);
    });
  });

  const spot = px(layout.orderSpot);
  canvas.drawFrame(artKey('orderRug'), 0, spot.x, spot.y);
  // A paw print in the middle of each queue spot.
  for (const linePoint of layout.queueSpots) {
    const p = px(linePoint);
    const at = centred('pawPrint', p.x + TILE_SIZE / 2, p.y + TILE_SIZE / 2);
    canvas.drawFrame(artKey('pawPrint'), 0, at.x, at.y);
  }
}
