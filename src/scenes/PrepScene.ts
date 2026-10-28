import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { INGREDIENTS, STARTER_INGREDIENTS, type IngredientId } from '../data/ingredients';
import { buildSpeech } from '../logic/dialogue';

import { availableRecipes, expectedPlate, generateOrder, type Owned } from '../logic/orders';
import { scoreDish } from '../logic/scoreDish';
import type { Order } from '../logic/types';
import { Button } from '../ui/Button';
import { DishView } from '../ui/DishView';
import { RecipeBook } from '../ui/RecipeBook';
import { ResultBanner } from '../ui/ResultBanner';
import { SpeechBubble } from '../ui/SpeechBubble';
import { COLORS, TEXT } from '../ui/theme';

// Until the central game state exists, the player owns only the starters.
// Later this will be read from that state instead.
const OWNED: Owned = { ingredients: STARTER_INGREDIENTS, upgrades: [] };

/** Keeps the stack on screen; no recipe needs more than 4 layers. */
const MAX_DISH_LAYERS = 6;
/** How long the result banner stays up before the next order. */
const NEXT_ORDER_DELAY_MS = 1400;

const COUNTER_TOP_Y = 140;

/**
 * Close-up prep station: read the order, add ingredients, serve, get scored.
 *
 * This class only wires things together: game rules live in logic/ (pure,
 * tested) and drawing lives in ui/. That split keeps the scene short and
 * means rules can change without touching layout, and vice versa.
 */
export class PrepScene extends Phaser.Scene {
  private order!: Order;
  /** Layers, bottom first. */
  private dish: IngredientId[] = [];
  /** True while the result banner is up; input is ignored. */
  private busy = false;

  private bubble!: SpeechBubble;
  private recipeBook!: RecipeBook;
  private dishView!: DishView;
  private serveButton!: Button;
  private resetButton!: Button;
  private banner!: ResultBanner;

  constructor() {
    super('PrepScene');
  }

  create(): void {
    // Reset state here, not only in field initialisers: Phaser reuses the same
    // scene object if the scene is restarted, and initialisers run only once.
    this.dish = [];
    this.busy = false;

    // Phaser draws objects in the order they're added, so the build order
    // here is the layering: wall, customer, counter (hides the customer's
    // lower body), then all UI on top.
    this.drawWall();
    this.drawCustomer(64, COUNTER_TOP_Y - 30);
    this.drawCounter();

    // No order ticket: the speech bubble is the only clue (see GAME_DESIGN.md).
    this.bubble = new SpeechBubble(this, 112, 24, 392, 88);
    this.dishView = new DishView(this, 320, 214);

    this.createIngredientBins();
    this.serveButton = new Button(this, 544, 260, 112, 36, 'Serve', COLORS.serve, () => this.serve());
    this.resetButton = new Button(this, 544, 308, 112, 36, 'Reset', COLORS.reset, () =>
      this.resetDish(),
    );

    // Created after the prep UI so it draws on top; the banner goes above it.
    this.recipeBook = new RecipeBook(this);
    new Button(this, 576, 28, 104, 32, 'Recipes', COLORS.book, () =>
      this.recipeBook.open(availableRecipes(OWNED)),
    );

    this.banner = new ResultBanner(this);

    this.nextOrder();
  }

  private nextOrder(): void {
    this.order = generateOrder(OWNED);
    this.bubble.setLines(buildSpeech(this.order));
    this.banner.hide();
    this.busy = false;
    this.resetDish();
  }

  private addIngredient(id: IngredientId): void {
    if (this.busy || this.dish.length >= MAX_DISH_LAYERS) return;
    this.dish.push(id);
    this.refreshDish();
  }

  private resetDish(): void {
    if (this.busy) return;
    this.dish = [];
    this.refreshDish();
  }

  private serve(): void {
    if (this.busy || this.dish.length === 0) return;

    // No modifier tools exist yet (Toaster arrives in milestone 6), so the
    // player's plate never has modifiers. Starter orders never ask for any.
    const result = scoreDish(expectedPlate(this.order), {
      layers: this.dish,
      modifiers: [],
    });

    this.busy = true;
    this.serveButton.setEnabled(false);
    this.resetButton.setEnabled(false);
    this.banner.show(result.score);
    this.time.delayedCall(NEXT_ORDER_DELAY_MS, () => this.nextOrder());
  }

  private refreshDish(): void {
    this.dishView.setLayers(this.dish);
    // Serving an empty plate would always score "wrong", so disable it to
    // prevent accidental misclicks rather than punish them.
    const hasItems = this.dish.length > 0;
    this.serveButton.setEnabled(hasItems);
    this.resetButton.setEnabled(hasItems);
  }

  /** One square button per owned ingredient along the bottom of the counter. */
  private createIngredientBins(): void {
    const size = 48;
    const spacing = 72;
    const startX = 64;
    const y = 300;

    OWNED.ingredients.forEach((id, i) => {
      const x = startX + i * spacing;
      // The number on the bin is its keyboard shortcut (wired up in step 5).
      new Button(this, x, y, size, size, String(i + 1), INGREDIENTS[id].color, () =>
        this.addIngredient(id),
      );
      this.add
        .text(x, y + size / 2 + 6, INGREDIENTS[id].name, TEXT.label)
        .setOrigin(0.5, 0);
    });
  }

  private drawWall(): void {
    this.add.rectangle(0, 0, BASE_WIDTH, COUNTER_TOP_Y, COLORS.wall).setOrigin(0);
  }

  /** Everything below COUNTER_TOP_Y, with a darker edge along the top. */
  private drawCounter(): void {
    this.add
      .rectangle(0, COUNTER_TOP_Y, BASE_WIDTH, BASE_HEIGHT - COUNTER_TOP_Y, COLORS.counter)
      .setOrigin(0);
    this.add.rectangle(0, COUNTER_TOP_Y, BASE_WIDTH, 4, COLORS.counterEdge).setOrigin(0);
  }

  /** Placeholder woodland customer peeking over the counter. (x, y) = body centre. */
  private drawCustomer(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.customerDark);
    // Ears
    g.fillTriangle(x - 20, y - 22, x - 8, y - 22, x - 16, y - 40);
    g.fillTriangle(x + 8, y - 22, x + 20, y - 22, x + 16, y - 40);
    g.fillStyle(COLORS.customer);
    g.fillRoundedRect(x - 24, y - 28, 48, 64, 12);
    // Eyes
    g.fillStyle(COLORS.ink);
    g.fillRect(x - 12, y - 12, 4, 4);
    g.fillRect(x + 8, y - 12, 4, 4);
  }
}
