import Phaser from 'phaser';
import { SPRITE_ART, VIEW_ART, type ArtName } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import { VIEW, viewFrame, type View } from '../art/sprites/sheetCritters';
import { BASE_HEIGHT, BASE_WIDTH, GROUND_TILE, TILE_SIZE } from '../config/display';
import { artKey } from './art';
import { watchGameState } from '../scenes/gameStore';
import { WardrobePanel } from './WardrobePanel';
import { CLOTHING_FITS } from '../data/clothingFits';

// Drawings shared by several scenes (cafe floor, world map, outdoor areas),
// so they look the same everywhere.

/** How long each walking step shows, in ms (both kinds of critter). */
const STEP_MS = 140;
/** Standing still this long (ms) counts as stopped: back to the standing frame. */
const STOP_MS = 100;

/** How far above its tile a critter's head reaches (8px for 16x24 art, 16px for 24x32). */
export function critterHeadroom(art: ArtName): number {
  return spriteSize(SPRITE_ART[art]).height - TILE_SIZE;
}

/**
 * A critter inside a Container whose origin is the top-left of the 16x16
 * tile it stands on: the feet are at the tile's bottom and the head pokes
 * above it (critterHeadroom). Moving it is just
 * setPosition, as before the art; it notices the moves itself to walk (and
 * face left or right), so no scene needs walking code.
 */
export function createCritter(scene: Phaser.Scene, art: ArtName): Phaser.GameObjects.Container {
  const image = scene.add.image(TILE_SIZE / 2, TILE_SIZE, artKey(art), 0).setOrigin(0.5, 1);
  const container = scene.add.container(0, 0, [image]);
  animateWalking(scene, container, image, VIEW_ART.has(art));
  return container;
}

/**
 * Each frame: if the container moved, walk and face the way it went. A
 * 16x24 critter plays its two steps, mirrored to face left. A four-view
 * critter (VIEW_ART) shows its front, back, left or right view, with that
 * view's two steps; standing still, it keeps facing the way it last went.
 */
function animateWalking(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  image: Phaser.GameObjects.Image,
  views: boolean,
): void {
  let last = { x: container.x, y: container.y };
  let stillFor = STOP_MS;
  let walkedFor = 0;
  let facing: number = VIEW.front;
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
      if (views) {
        // Whichever way it moved most: sideways, else up (back) or down (front).
        if (Math.abs(dx) >= Math.abs(dy)) facing = dx > 0 ? VIEW.right : VIEW.left;
        else facing = dy > 0 ? VIEW.front : VIEW.back;
      } else if (dx !== 0) {
        image.setFlipX(dx < 0); // the art faces right
      }
    } else {
      stillFor += delta;
    }
    const moving = stillFor < STOP_MS;
    // Standing still, the scene may say which way to face (setFacing).
    const face = moving ? undefined : (container.getData(FACE) as View | undefined);
    if (face && views) facing = VIEW[face];
    else if (face === 'left' || face === 'right') image.setFlipX(face === 'left'); // 16x24 art has no front or back
    const pose = moving ? 1 + (Math.floor(walkedFor / STEP_MS) % 2) : 0;
    image.setFrame(views ? viewFrame(facing, pose) : pose);
    // Clothing uses the same frame grid as the body, including walking poses.
    for (const layer of container.list.slice(1)) {
      if (layer instanceof Phaser.GameObjects.Image) layer.setFrame(image.frame.name).setFlipX(image.flipX);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  container.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
}

/** Data key on a critter's container: which way it faces while standing still (setFacing). */
const FACE = 'face';

/**
 * Which way a critter faces while it stands still, e.g. a customer at the
 * counter (back to the player) or eating (toward their table); null lets it
 * keep facing the way it last walked. Safe to call every frame.
 */
export function setFacing(critter: Phaser.GameObjects.Container, view: View | null): void {
  critter.setData(FACE, view ?? undefined);
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

/** The player, the cafe owner: the hedgehog (GAME_DESIGN.md §8.2). Scenes sort its depth by its feet. */
export function createPlayerSprite(scene: Phaser.Scene, canOpen: () => boolean = () => true): Phaser.GameObjects.Container {
  const player = createCritter(scene, 'hedgehog');
  const fit = CLOTHING_FITS.hedgehog;
  const coat = scene.add.image(TILE_SIZE / 2, TILE_SIZE, artKey(fit.santaCoat)).setOrigin(0.5, 1);
  const hat = scene.add.image(TILE_SIZE / 2, TILE_SIZE, artKey(fit.santaHat)).setOrigin(0.5, 1);
  player.add([coat, hat]);
  watchGameState(scene, state => {
    coat.setVisible(state.outfit.top === 'santaCoat');
    hat.setVisible(state.outfit.hat === 'santaHat');
  });
  // The moving character's hit area follows its container; it isn't a fixed layout point.
  player.setInteractive(new Phaser.Geom.Rectangle(-3, TILE_SIZE - 30, 30, 30), Phaser.Geom.Rectangle.Contains);
  player.input!.cursor = 'pointer';
  let pressed = false;
  player.on('pointerdown', () => { pressed = true; });
  player.on('pointerout', () => { pressed = false; });
  player.on('pointerup', () => {
    const open = pressed;
    pressed = false;
    if (open && canOpen() && !scene.children.getByName('wardrobe')) new WardrobePanel(scene);
  });
  return player;
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

/** The Cleaner: the raccoon in a bandana. The floor sorts its depth by its feet. */
export function createCleanerSprite(scene: Phaser.Scene): Phaser.GameObjects.Container {
  return createCritter(scene, 'raccoon');
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
  for (let y = 0; y < BASE_HEIGHT; y += GROUND_TILE) {
    for (let x = 0; x < BASE_WIDTH; x += GROUND_TILE) {
      canvas.drawFrame(artKey(art), groundFrame(x / GROUND_TILE, y / GROUND_TILE), x, y);
    }
  }
  return canvas;
}

/** Which ground tile goes at a tile position: about 5 in 8 plain, the rest tufts or flowers. */
export function groundFrame(x: number, y: number): number {
  const hash = (x * 73 + y * 151 + x * y * 17) % 8;
  return hash < 5 ? 0 : hash - 4;
}
