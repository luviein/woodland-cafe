import type Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import { CHAIR_VIEWS, FURNITURE, kindOf } from '../data/furniture';
import { chairFacing, isWindow, type PlacedPiece } from '../logic/furniture';
import type { Layout, Point, TileKind } from '../logic/layout';
import { artKey } from './art';

// The cafe's tiles, drawn the same way on the floor (FloorScene) and while
// decorating (DecorateScene), from the sprites in art/sprites/cafe.ts, with
// the player's furniture drawn over them, each piece in its own design.

/** The room's own tiles. Furniture tiles (table, seat, decor) are drawn from the pieces instead. */
const TILE_ART: Partial<Record<TileKind, ArtName>> = {
  wall: 'wall',
  door: 'door',
  counter: 'counter',
};

/** Tiles drawn over the floor (they have see-through parts), not instead of it. */
const ON_FLOOR: ReadonlySet<TileKind> = new Set(['floor', 'table', 'seat', 'decor']);

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

/**
 * Draws every tile into `canvas` (cleared first), the order rug and the
 * queue's paw prints, then the furniture in `placed`.
 */
export function drawCafeTiles(
  canvas: Phaser.GameObjects.RenderTexture,
  layout: Layout,
  origin: Point,
  placed: readonly PlacedPiece[],
): void {
  const px = (p: Point): Point => ({ x: origin.x + p.x * TILE_SIZE, y: origin.y + p.y * TILE_SIZE });
  canvas.clear();
  layout.tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      const p = px({ x, y });
      // Plank pattern picked from the position, so it's mixed but never changes.
      if (ON_FLOOR.has(tile)) canvas.drawFrame(artKey('floor'), (x * 3 + y * 2) % 2, p.x, p.y);
      const art = TILE_ART[tile];
      if (!art) return;
      const window = tile === 'wall' && y === 0 && isWindow(x, row.length);
      canvas.drawFrame(artKey(art), window ? 1 : 0, p.x, p.y);
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

  // Furniture, top row first so a tall piece (a tree) stands in front of the row behind it.
  for (const piece of [...placed].sort((a, b) => a.y - b.y)) {
    const { art, frame, at } = pieceDrawing(placed, piece, px(piece));
    canvas.drawFrame(artKey(art), frame, at.x, at.y);
  }
}

/**
 * How a piece is drawn on its tile (top-left pixel `tile`): its design's art
 * and frame, and where. Floor pieces stand on the tile's bottom edge, centred
 * (a tall one rises above its tile); wall pieces hang centred on the wall tile.
 * A chair faces its table, when its design has the views for it.
 */
export function pieceDrawing(placed: readonly PlacedPiece[], piece: PlacedPiece, tile: Point): { art: ArtName; frame: number; at: Point } {
  const art = FURNITURE[piece.design].art;
  const sprite = SPRITE_ART[art];
  const { width, height } = spriteSize(sprite);
  const frame = kindOf(piece.design) === 'chair' && sprite.frames.length >= 3 ? CHAIR_VIEWS[chairFacing(placed, piece)] : 0;
  const x = tile.x + Math.floor((TILE_SIZE - width) / 2);
  const y = kindOf(piece.design) === 'wallDecor' ? tile.y + Math.floor((TILE_SIZE - height) / 2) : tile.y + TILE_SIZE - height;
  return { art, frame, at: { x, y } };
}
