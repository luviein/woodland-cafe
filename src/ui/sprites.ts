import Phaser from 'phaser';
import type { ArtName } from '../art/spriteArt';
import { TILE_SIZE } from '../config/display';
import { artKey } from './art';
import { COLORS } from './theme';

// Drawings shared by several scenes (cafe floor, world map, outdoor areas),
// so they look the same everywhere. The critters are pixel art; the scenery
// below them is still placeholder shapes until its milestone 10 step.

/** How long each walking step shows, in ms. */
const STEP_MS = 140;
/** Standing still this long (ms) counts as stopped: back to the standing frame. */
const STOP_MS = 100;

/**
 * A 16x24 critter (art/sprites/critters.ts) inside a Container whose origin
 * is the top-left of the 16x16 tile it stands on: the feet are at the
 * tile's bottom and the head pokes 8px above it. Moving it is just
 * setPosition, as before the art; it notices the moves itself to walk (and
 * face left or right), so no scene needs walking code.
 */
export function createCritter(scene: Phaser.Scene, art: ArtName): Phaser.GameObjects.Container {
  const image = scene.add.image(TILE_SIZE / 2, TILE_SIZE, artKey(art), 0).setOrigin(0.5, 1);
  const container = scene.add.container(0, 0, [image]);
  animateWalking(scene, container, image);
  return container;
}

/** Each frame: if the container moved, play the walking steps and face the way it went. */
function animateWalking(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  image: Phaser.GameObjects.Image,
): void {
  let last = { x: container.x, y: container.y };
  let stillFor = STOP_MS;
  let walkedFor = 0;
  const onUpdate = (_time: number, delta: number) => {
    const dx = container.x - last.x;
    const dy = container.y - last.y;
    last = { x: container.x, y: container.y };
    // A jump of over a tile is being placed somewhere (e.g. its first
    // position), not walking.
    const walked = (dx !== 0 || dy !== 0) && Math.abs(dx) + Math.abs(dy) <= TILE_SIZE;
    if (walked) {
      stillFor = 0;
      walkedFor += delta;
      if (dx !== 0) image.setFlipX(dx < 0); // the art faces right
    } else {
      stillFor += delta;
    }
    const step = Math.floor(walkedFor / STEP_MS) % 2;
    image.setFrame(stillFor < STOP_MS ? 1 + step : 0);
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  container.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
}

/** The player, the cafe owner: the hedgehog (GAME_DESIGN.md §8.2). */
export function createPlayerSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  // Depth: draw the player above customers and scenery when they overlap.
  return createCritter(scene, 'hedgehog').setDepth(10);
}

/**
 * The Mascot: the frog in its leaf costume. Unlike the other critters, its
 * origin is its FEET (bottom middle), so a dance that sways it (rotation)
 * pivots on the ground rather than on a corner.
 */
export function createMascotSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const image = scene.add.image(0, 0, artKey('frog'), 0).setOrigin(0.5, 1);
  return scene.add.container(0, 0, [image]);
}

/** The Cleaner: the raccoon in a bandana. */
export function createCleanerSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  // Just under the player, so the player stays on top when they overlap.
  return createCritter(scene, 'raccoon').setDepth(9);
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
