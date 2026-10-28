import Phaser from 'phaser';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { COLORS, TEXT } from './theme';

const LAYER_WIDTH = 112;
const LAYER_HEIGHT = 12;

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

  setLayers(dish: readonly IngredientId[]): void {
    // Simple approach: throw away the old layers and redraw. A dish has at
    // most a handful of layers, so this is cheap and avoids syncing bugs.
    this.layers.removeAll(true);

    dish.forEach((id, i) => {
      // Layer 0 sits on the plate; each next one goes LAYER_HEIGHT higher.
      const y = -4 - i * LAYER_HEIGHT;
      this.layers.add(
        this.scene.add
          .rectangle(0, y, LAYER_WIDTH, LAYER_HEIGHT, INGREDIENTS[id].color)
          .setStrokeStyle(2, COLORS.ink),
      );
    });

    this.summary.setText(
      dish.length === 0 ? 'Empty plate' : dish.map((id) => INGREDIENTS[id].name).join(' > '),
    );
  }
}
