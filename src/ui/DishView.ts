import Phaser from 'phaser';
import { LAYER_LEFT, LAYER_MIDDLE, LAYER_RIGHT } from '../art/sprites/kitchen';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { artKey, layerArt } from './art';
import { COLORS, TEXT } from './theme';

const LAYER_WIDTH = 112;
const LAYER_HEIGHT = 12;
/** Layer art (art/sprites/kitchen.ts): 6px tall, with 4px-wide ends. */
const LAYER_ART_HEIGHT = 6;
const LAYER_END = 4;

/**
 * One dish layer, `width` wide, centred on (x, y), at a whole-number
 * `scale`. Built from three pieces (left end, a middle repeated to fit,
 * right end) so the same small sprite works at any width: a TileSprite
 * repeats a texture across its size instead of stretching it.
 */
export function addLayerArt(
  scene: Phaser.Scene,
  id: IngredientId,
  toasted: boolean,
  x: number,
  y: number,
  width: number,
  scale: number,
): Phaser.GameObjects.Container {
  const key = artKey(layerArt(id, toasted));
  const half = width / 2;
  const left = scene.add.image(-half, 0, key, LAYER_LEFT).setOrigin(0, 0.5).setScale(scale);
  const middle = scene.add
    .tileSprite(-half + LAYER_END * scale, 0, width / scale - 2 * LAYER_END, LAYER_ART_HEIGHT, key, LAYER_MIDDLE)
    .setOrigin(0, 0.5)
    .setScale(scale);
  const right = scene.add.image(half, 0, key, LAYER_RIGHT).setOrigin(1, 0.5).setScale(scale);
  return scene.add.container(x, y, [left, middle, right]);
}

/**
 * Draws a dish's layers into `into`, bottom one at y = `bottomY`, each next
 * one `height` higher. Shared by the plate, the toaster (a small copy on
 * top) and the copy that follows the pointer while dragging.
 */
export function drawLayerStack(
  into: Phaser.GameObjects.Container,
  dish: readonly IngredientId[],
  toasted: boolean,
  width = LAYER_WIDTH,
  height = LAYER_HEIGHT,
  bottomY = -4,
): void {
  // Simple approach: throw away the old layers and redraw. A dish has at
  // most a handful of layers, so this is cheap and avoids syncing bugs.
  into.removeAll(true);
  // The art is drawn at whatever whole-number scale makes it `height` tall.
  const scale = Math.max(1, Math.round(height / LAYER_ART_HEIGHT));
  dish.forEach((id, i) => {
    into.add(addLayerArt(into.scene, id, toasted, 0, bottomY - i * height, width, scale));
  });
}

/**
 * The plate in the middle of the counter. Layers stack upward in the order
 * they were added (first = bottom), like building a real sandwich, with a
 * text summary below for readability. (x, y) is the centre of the plate.
 */
export class DishView extends Phaser.GameObjects.Container {
  private readonly layers: Phaser.GameObjects.Container;
  private readonly summary: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const plate = scene.add.ellipse(0, 0, 176, 40, COLORS.plate).setStrokeStyle(2, COLORS.plateEdge);
    this.layers = scene.add.container(0, 0);
    this.summary = scene.add.text(0, 28, '', TEXT.label).setOrigin(0.5, 0);

    this.add([plate, this.layers, this.summary]);
    scene.add.existing(this);
  }

  /** `note` replaces "Empty plate" when the plate is empty for a reason (e.g. the dish is in the toaster). */
  setLayers(dish: readonly IngredientId[], toasted = false, note = 'Empty plate'): void {
    drawLayerStack(this.layers, dish, toasted);
    const names = dish.map((id) => INGREDIENTS[id].name).join(' > ');
    this.summary.setText(dish.length === 0 ? note : toasted ? `Toasted: ${names}` : names);
  }
}
