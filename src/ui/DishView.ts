import Phaser from 'phaser';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { toCounts } from '../logic/dish';
import { COLORS, TEXT, css } from './theme';

const ITEM_SIZE = 24;
const ITEM_GAP = 4;
const ITEMS_PER_ROW = 4;

/**
 * The plate in the middle of the counter. Shows items as coloured squares,
 * stacked upward in the order they were added, plus a count summary below.
 * (x, y) is the centre of the plate.
 */
export class DishView extends Phaser.GameObjects.Container {
  private readonly items: Phaser.GameObjects.Container;
  private readonly summary: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const plate = scene.add.ellipse(0, 0, 176, 40, COLORS.plate).setStrokeStyle(2, COLORS.plateEdge);
    this.items = scene.add.container(0, 0);
    this.summary = scene.add
      .text(0, 28, '', { ...TEXT.label, color: css(COLORS.paper) })
      .setOrigin(0.5, 0);

    this.add([plate, this.items, this.summary]);
    scene.add.existing(this);
  }

  setItems(dish: readonly IngredientId[]): void {
    // Simple approach: throw away the old squares and redraw. A dish has at
    // most a handful of items, so this is cheap and avoids syncing bugs.
    this.items.removeAll(true);

    dish.forEach((id, i) => {
      const row = Math.floor(i / ITEMS_PER_ROW);
      const col = i % ITEMS_PER_ROW;
      const rowCount = Math.min(ITEMS_PER_ROW, dish.length - row * ITEMS_PER_ROW);
      // Centre each row on the plate; whole pixels keep edges sharp.
      const rowWidth = rowCount * ITEM_SIZE + (rowCount - 1) * ITEM_GAP;
      const x = Math.round(-rowWidth / 2 + col * (ITEM_SIZE + ITEM_GAP) + ITEM_SIZE / 2);
      const y = -6 - row * (ITEM_SIZE + ITEM_GAP);
      this.items.add(
        this.scene.add
          .rectangle(x, y, ITEM_SIZE, ITEM_SIZE, INGREDIENTS[id].color)
          .setStrokeStyle(2, COLORS.ink),
      );
    });

    const counts = Object.entries(toCounts(dish)) as [IngredientId, number][];
    this.summary.setText(
      counts.length === 0
        ? 'Empty plate'
        : counts.map(([id, n]) => `${INGREDIENTS[id].name} x${n}`).join('   '),
    );
  }
}
