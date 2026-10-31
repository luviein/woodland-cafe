import type Phaser from 'phaser';
import { COLORS } from './theme';

// Placeholder drawings shared by several scenes (cafe floor, world map,
// outdoor areas), so they look the same everywhere until real art
// (milestone 10) replaces them in one place.

/** The player: a 16x16 critter in an apron. Origin is its top-left corner. */
export function createPlayerSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.player);
  g.fillRect(3, 1, 10, 14);
  g.fillStyle(COLORS.apron);
  g.fillRect(5, 8, 6, 6);
  g.fillStyle(COLORS.ink);
  g.fillRect(5, 4, 2, 2);
  g.fillRect(9, 4, 2, 2);
  // Depth: draw the player above customers and scenery when they overlap.
  return scene.add.container(0, 0, [g]).setDepth(10);
}

/** The Mascot: a 16x16 orange fox-ish critter with its paws up. Origin is its top-left corner. */
export function createMascotSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.mascot);
  g.fillRect(3, 3, 10, 12);
  g.fillRect(3, 1, 3, 2); // ears
  g.fillRect(10, 1, 3, 2);
  g.fillRect(0, 2, 3, 3); // paws up, waving
  g.fillRect(13, 2, 3, 3);
  g.fillStyle(COLORS.mascotBelly);
  g.fillRect(6, 9, 4, 5);
  g.fillStyle(COLORS.ink);
  g.fillRect(5, 5, 2, 2);
  g.fillRect(9, 5, 2, 2);
  return scene.add.container(0, 0, [g]).setDepth(9);
}

/** The Cleaner: a 16x16 critter in a blue bandana. Origin is its top-left corner. */
export function createCleanerSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.cleaner);
  g.fillRect(3, 1, 10, 14);
  g.fillStyle(COLORS.bandana);
  g.fillRect(3, 1, 10, 3);
  g.fillStyle(COLORS.ink);
  g.fillRect(5, 5, 2, 2);
  g.fillRect(9, 5, 2, 2);
  // Just under the player, so the player stays on top when they overlap.
  return scene.add.container(0, 0, [g]).setDepth(9);
}

/** Height of a tree's trunk at `size` 1; its base (y + this * size) is where it stands. */
export const TREE_TRUNK_HEIGHT = 8;
/** Height of a stall's counter; its base (y + this) is where it stands. */
export const STALL_HEIGHT = 16;

/** A round tree; (x, y) is the top of the trunk. `size` 1 is about 20px wide. */
export function drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, size = 1): void {
  g.fillStyle(COLORS.treeTrunk).fillRect(x - 2 * size, y, 4 * size, TREE_TRUNK_HEIGHT * size);
  g.fillStyle(COLORS.treeLeaf).fillCircle(x, y - 4 * size, 10 * size);
}

/** A Leaf lying on the ground (the currency): a small pointed oval with a vein. Centred on (0, 0). */
export function drawLeaf(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.leaf).fillEllipse(0, 0, 10, 6);
  g.fillTriangle(4, -2, 4, 2, 7, 0); // pointed tip
  g.fillStyle(COLORS.leafVein).fillRect(-5, 0, 10, 1);
  g.fillRect(-7, 0, 2, 1); // stem
}

/** A patch of mushrooms on a dirt mound; bare (just the mound) once gathered. Base centre at (0, 0). */
export function drawMushroomPatch(g: Phaser.GameObjects.Graphics, full: boolean): void {
  g.fillStyle(COLORS.dirt).fillEllipse(0, -2, 24, 8);
  if (!full) return;
  for (const [dx, h] of [[-7, 6], [0, 9], [7, 5]]) {
    g.fillStyle(COLORS.mushroomStem).fillRect(dx - 1, -2 - h, 3, h);
    g.fillStyle(COLORS.mushroomCap).fillEllipse(dx, -2 - h, 9, 5);
  }
}

/** A round bush with berries; just the bush once gathered. Base centre at (0, 0). */
export function drawBerryBush(g: Phaser.GameObjects.Graphics, full: boolean): void {
  g.fillStyle(COLORS.bush);
  g.fillCircle(-7, -6, 7).fillCircle(7, -6, 7).fillCircle(0, -11, 9);
  if (!full) return;
  g.fillStyle(COLORS.berry);
  for (const [x, y] of [[-8, -7], [-2, -13], [4, -8], [8, -4], [1, -3], [-5, -2]]) g.fillRect(x, y, 2, 2);
}

/** A market stall with a striped awning; (x, y) is the top-middle of the counter. */
export function drawStall(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(COLORS.counter).fillRect(x - 16, y, 32, STALL_HEIGHT);
  g.fillStyle(COLORS.awning).fillRect(x - 18, y - 10, 36, 10);
  g.fillStyle(COLORS.roof);
  for (let s = 0; s < 36; s += 12) g.fillRect(x - 18 + s, y - 10, 6, 10);
}
