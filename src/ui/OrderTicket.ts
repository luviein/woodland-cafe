import Phaser from 'phaser';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { MODIFIERS } from '../data/modifiers';
import { RECIPES } from '../data/recipes';
import type { Order } from '../logic/types';
import { COLORS, TEXT } from './theme';

const PADDING = 10;

/** Paper ticket listing exactly what the order needs. (x, y) is top-left. */
export class OrderTicket extends Phaser.GameObjects.Container {
  private readonly title: Phaser.GameObjects.Text;
  private readonly details: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);

    const paper = scene.add
      .rectangle(0, 0, width, height, COLORS.paper)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.paperEdge);
    const header = scene.add.text(PADDING, PADDING, 'ORDER', TEXT.heading);
    const rule = scene.add
      .rectangle(PADDING, PADDING + 22, width - PADDING * 2, 2, COLORS.paperEdge)
      .setOrigin(0);

    const wrap = { wordWrap: { width: width - PADDING * 2 } };
    this.title = scene.add.text(PADDING, PADDING + 32, '', { ...TEXT.heading, ...wrap });
    this.details = scene.add.text(PADDING, 0, '', { ...TEXT.body, ...wrap, lineSpacing: 4 });

    this.add([paper, header, rule, this.title, this.details]);
    scene.add.existing(this);
  }

  setOrder(order: Order): void {
    const recipe = RECIPES[order.recipeId];
    const quantity = order.quantity > 1 ? ` x${order.quantity}` : '';
    this.title.setText(recipe.name + quantity);

    const lines = (Object.entries(recipe.ingredients) as [IngredientId, number][]).map(
      ([id, count]) => `- ${INGREDIENTS[id].name} x${count}`,
    );
    for (const mod of order.modifiers) {
      lines.push(`+ ${MODIFIERS[mod].name}`);
    }
    this.details.setText(lines);

    // The recipe name can wrap onto two lines, so place the list below it.
    this.details.y = this.title.y + this.title.height + 6;
  }
}
