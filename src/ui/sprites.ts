import Phaser from 'phaser';
import type { ArtName } from '../art/spriteArt';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { artKey } from './art';

// Drawings shared by several scenes (cafe floor, world map, outdoor areas),
// so they look the same everywhere.

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

/** Data key on a critter's container for its bobbing tween. */
const BOB = 'bob';

/**
 * Turns a critter's idle bob on or off: a 1px up-and-down while it stands
 * waiting (GAME_DESIGN.md §8.3). Safe to call every frame; it only starts or
 * stops the tween when the state changes. Each critter starts at a slightly
 * different moment so a queue doesn't bob in step.
 */
export function setBobbing(critter: Phaser.GameObjects.Container, on: boolean): void {
  const image = critter.list[0] as Phaser.GameObjects.Image;
  const tween = critter.getData(BOB) as Phaser.Tweens.Tween | undefined;
  if (on && !tween) {
    const bob = critter.scene.tweens.add({
      targets: image,
      y: TILE_SIZE - 1,
      // A 1px move can't glide (pixels snap to whole steps), so instead of a
      // constant wobble it's a slow rhythm: up, rest, down, rest.
      duration: 700,
      hold: 400,
      repeatDelay: 400,
      delay: Phaser.Math.Between(0, 800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    critter.setData(BOB, bob);
  } else if (!on && tween) {
    tween.remove();
    critter.setData(BOB, undefined);
    image.y = TILE_SIZE;
  }
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

/** How far below its (x, y) an outdoor tree stands: the scenes place trees by the top of the trunk. */
export const TREE_TRUNK_HEIGHT = 11;
/** Height of a stall's counter; its base (y + this) is where it stands. */
export const STALL_HEIGHT = 16;

/** Tree kinds: the frames of the tree sprites. */
export type TreeKind = 'oak' | 'pine';
const TREE_FRAME: Record<TreeKind, number> = { oak: 0, pine: 1 };

/**
 * A tree standing with the bottom of its trunk at (x, baseY): the big 32x40
 * one outdoors, or the 16x20 one on the world map.
 */
export function addTree(scene: Phaser.Scene, x: number, baseY: number, kind: TreeKind, small = false): Phaser.GameObjects.Image {
  return scene.add.image(x, baseY, artKey(small ? 'mapTree' : 'tree'), TREE_FRAME[kind]).setOrigin(0.5, 1);
}

/** Something standing on the ground with its base centre at (x, y): a stall, a bush, the cafe. */
export function addStanding(scene: Phaser.Scene, x: number, y: number, art: ArtName, frame = 0): Phaser.GameObjects.Image {
  return scene.add.image(x, y, artKey(art), frame).setOrigin(0.5, 1);
}

/**
 * Fills the whole screen with ground tiles (art/sprites/outdoor.ts), mostly
 * plain with tufts and flowers mixed in. The mix comes from each tile's
 * position, so it looks random but is the same every visit. One canvas,
 * like the cafe floor.
 */
export function addGround(scene: Phaser.Scene, art: 'grass' | 'forestFloor'): Phaser.GameObjects.RenderTexture {
  const canvas = scene.add.renderTexture(0, 0, BASE_WIDTH, BASE_HEIGHT).setOrigin(0);
  for (let y = 0; y < BASE_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < BASE_WIDTH; x += TILE_SIZE) {
      canvas.drawFrame(artKey(art), groundFrame(x / TILE_SIZE, y / TILE_SIZE), x, y);
    }
  }
  return canvas;
}

/** Which ground tile goes at a tile position: about 5 in 8 plain, the rest tufts or flowers. */
export function groundFrame(x: number, y: number): number {
  const hash = (x * 73 + y * 151 + x * y * 17) % 8;
  return hash < 5 ? 0 : hash - 4;
}
