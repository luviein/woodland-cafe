import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES, type RecipeId } from '../data/recipes';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

const PANEL_WIDTH = 576;
const PANEL_HEIGHT = 312;
const ROWS_PER_COLUMN = 6; // 2 columns x 6 rows = room for all 12 recipes
const ROW_HEIGHT = 38;
const COLUMN_WIDTH = 272;

/**
 * Pop-up list of recipes the player can make, with their layers. Hidden
 * until open(). Close with the Close button or by tapping outside the page.
 *
 * It does NOT pause the game: the design says looking things up costs time
 * (patience keeps dropping once it exists in milestone 3).
 */
export class RecipeBook extends Phaser.GameObjects.Container {
  /** Rows are rebuilt on each open(), since unlocked recipes can change. */
  private readonly rows: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene, BASE_WIDTH / 2, BASE_HEIGHT / 2);

    // The dim layer is interactive so it catches taps meant for things behind
    // the book (bins, buttons). Phaser only sends a tap to the top-most
    // interactive object, so nothing underneath reacts while the book is open.
    const dim = scene.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.45)
      .setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.close());

    // The page is interactive too (with no handler) so tapping the page itself
    // doesn't fall through to the dim layer and close the book.
    const page = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, COLORS.paper)
      .setStrokeStyle(3, COLORS.ink)
      .setInteractive();

    const left = -PANEL_WIDTH / 2 + 16;
    const top = -PANEL_HEIGHT / 2 + 12;
    const title = scene.add.text(left, top, 'Recipe Book', TEXT.heading);
    const note = scene.add
      .text(PANEL_WIDTH / 2 - 16, top + 2, 'bottom > top, fillings any order', TEXT.body)
      .setOrigin(1, 0);

    this.rows = scene.add.container(left, top + 32);

    const closeButton = new Button(
      scene,
      PANEL_WIDTH / 2 - 56,
      PANEL_HEIGHT / 2 - 24,
      88,
      28,
      'Close',
      COLORS.reset,
      () => this.close(),
    );

    this.add([dim, page, title, note, this.rows, closeButton]);
    this.setDepth(50); // above the prep UI, below the result banner
    this.setVisible(false);
    scene.add.existing(this);
  }

  isOpen(): boolean {
    return this.visible;
  }

  open(recipeIds: readonly RecipeId[]): void {
    this.rows.removeAll(true);
    recipeIds.forEach((id, i) => {
      const col = Math.floor(i / ROWS_PER_COLUMN);
      const row = i % ROWS_PER_COLUMN;
      this.rows.add(this.createRow(id, col * COLUMN_WIDTH, row * ROW_HEIGHT));
    });
    this.setVisible(true);
  }

  close(): void {
    this.setVisible(false);
  }

  /** Mini layer stack icon + recipe name + layer names. */
  private createRow(id: RecipeId, x: number, y: number): Phaser.GameObjects.Container {
    const recipe = RECIPES[id];
    const row = this.scene.add.container(x, y);

    // Icon: one 5px-tall bar per layer, drawn upward from the row's bottom.
    const iconBottom = 30;
    recipe.layers.forEach((ing, i) => {
      row.add(
        this.scene.add
          .rectangle(0, iconBottom - i * 6, 28, 5, INGREDIENTS[ing].color)
          .setOrigin(0, 1),
      );
    });

    row.add(this.scene.add.text(38, 2, recipe.name, { ...TEXT.body, fontStyle: 'bold' }));
    row.add(
      this.scene.add.text(
        38,
        18,
        recipe.layers.map((ing) => INGREDIENTS[ing].name).join(' > '),
        { ...TEXT.label, color: TEXT.body.color },
      ),
    );
    return row;
  }
}
