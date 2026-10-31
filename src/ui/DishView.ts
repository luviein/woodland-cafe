import Phaser from 'phaser';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { COLORS, TEXT } from './theme';

const LAYER_WIDTH = 112;
const LAYER_HEIGHT = 12;

/** How a layer looks: toasted bread is browner; fillings look the same. */
function layerColor(id: IngredientId, toasted: boolean): number {
  const color = INGREDIENTS[id].color;
  return toasted && id === 'bread' ? Phaser.Display.Color.ValueToColor(color).darken(25).color : color;
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
  dish.forEach((id, i) => {
    into.add(
      into.scene.add
        .rectangle(0, bottomY - i * height, width, height, layerColor(id, toasted))
        .setStrokeStyle(2, COLORS.ink),
    );
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
