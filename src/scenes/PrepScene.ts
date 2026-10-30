import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { buildGaveUp, buildReaction, buildSpeech } from '../logic/dialogue';
import { availableRecipes, expectedPlate, STARTER_OWNED } from '../logic/orders';
import { scoreDish } from '../logic/scoreDish';
import type { Order, ScoreResult } from '../logic/types';
import { Button } from '../ui/Button';
import { DishView } from '../ui/DishView';
import { RecipeBook } from '../ui/RecipeBook';
import { SpeechBubble } from '../ui/SpeechBubble';
import { COLORS, TEXT, patienceColor } from '../ui/theme';

/** Keeps the stack on screen; no recipe needs more than 4 layers. */
const MAX_DISH_LAYERS = 6;
/** How long the customer's last words stay up (time to read them) before prep closes. */
const CLOSE_DELAY_MS = 2200;

const COUNTER_TOP_Y = 140;

/**
 * What the floor hands the prep station when the player takes an order.
 * Callbacks instead of the prep scene reaching into the floor: the floor owns
 * customers, prep just cooks and reports back.
 */
export interface PrepRequest {
  order: Order;
  /** So the customer behind the counter looks like the one on the floor. */
  fur: number;
  /** Patience left, 0..1, read every frame for the bar. The floor keeps it ticking. */
  patience: () => number;
  /** Called once, when the player serves. */
  onServe: (result: ScoreResult) => void;
  /** Called when the prep station has closed and the floor is back. */
  onClose: () => void;
}

/**
 * Close-up prep station: read the order, add ingredients, serve.
 *
 * Runs as an OVERLAY on top of FloorScene (scene.launch, not scene.start):
 * the floor keeps running underneath, so the queue's patience keeps dropping
 * while the player cooks or reads the recipe book. Opened for one order;
 * closes itself after the customer reacts.
 *
 * This class only wires things together: game rules live in logic/ (pure,
 * tested) and drawing lives in ui/. That split keeps the scene short and
 * means rules can change without touching layout, and vice versa.
 */
export class PrepScene extends Phaser.Scene {
  private request!: PrepRequest;
  /** Layers, bottom first. */
  private dish: IngredientId[] = [];
  /** True once the customer is reacting (served, or gave up); input is ignored. */
  private busy = false;

  private bubble!: SpeechBubble;
  private recipeBook!: RecipeBook;
  private dishView!: DishView;
  private patienceBar!: Phaser.GameObjects.Graphics;
  private serveButton!: Button;
  private resetButton!: Button;
  private recipesButton!: Button;
  /** Ingredient bins, in hotkey order: binButtons[0] is key 1. */
  private binButtons: Button[] = [];

  constructor() {
    super('PrepScene');
  }

  /** Phaser calls init() with the data passed to scene.launch(), before create(). */
  init(request: PrepRequest): void {
    this.request = request;
  }

  create(): void {
    // Reset state here, not only in field initialisers: Phaser reuses the
    // same scene object every time prep opens, and initialisers run only once.
    this.dish = [];
    this.busy = false;
    this.binButtons = [];

    // Phaser draws objects in the order they're added, so the build order
    // here is the layering: wall, customer, counter (hides the customer's
    // lower body), then all UI on top. The wall and counter are opaque and
    // cover the whole screen, hiding the floor underneath.
    this.drawWall();
    this.drawCustomer(64, COUNTER_TOP_Y - 30);
    this.drawCounter();
    this.patienceBar = this.add.graphics();

    // No order ticket: the speech bubble is the only clue (see GAME_DESIGN.md).
    this.bubble = new SpeechBubble(this, 112, 24, 392, 88);
    this.bubble.setLines(buildSpeech(this.request.order));
    this.dishView = new DishView(this, 320, 214);

    this.createIngredientBins();
    this.serveButton = new Button(this, 544, 260, 112, 36, 'Serve', COLORS.serve, () => this.serve());
    this.resetButton = new Button(this, 544, 308, 112, 36, 'Reset', COLORS.reset, () =>
      this.resetDish(),
    );
    // Shortcut hint, so PC players can discover the keys (bins show their own numbers).
    this.add.text(544, 332, 'Enter: serve  Bksp: reset', TEXT.label).setOrigin(0.5, 0);

    // Created after the prep UI so it draws on top of it.
    this.recipeBook = new RecipeBook(this);
    this.recipesButton = new Button(this, 568, 28, 128, 32, 'Recipes (R)', COLORS.book, () =>
      this.recipeBook.open(availableRecipes(STARTER_OWNED)),
    );

    this.setupKeyboard();
    this.refreshDish();
  }

  update(): void {
    this.drawPatienceBar();
  }

  /**
   * The customer ran out of patience mid-cook (the floor tells us). They say
   * so, and prep closes without serving: nothing to score, nobody to pay.
   */
  customerGaveUp(): void {
    if (this.busy) return;
    this.finish(buildGaveUp());
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
    const result = scoreDish(expectedPlate(this.request.order), {
      layers: this.dish,
      modifiers: [],
    });
    this.request.onServe(result);
    // No result pop-up: the customer's reaction is the feedback.
    this.finish(buildReaction(result.score));
  }

  /** Shows the customer's last words, locks the counter, then closes. */
  private finish(line: string): void {
    this.busy = true;
    this.serveButton.setEnabled(false);
    this.resetButton.setEnabled(false);
    this.recipeBook.close();
    this.bubble.setLines([line]);
    this.time.delayedCall(CLOSE_DELAY_MS, () => {
      // stop() shuts this scene down (its timers, objects and input
      // listeners go with it); the floor underneath was running all along.
      this.scene.stop();
      this.request.onClose();
    });
  }

  private refreshDish(): void {
    this.dishView.setLayers(this.dish);
    // Serving an empty plate would always score "wrong", so disable it to
    // prevent accidental misclicks rather than punish them.
    const hasItems = this.dish.length > 0 && !this.busy;
    this.serveButton.setEnabled(hasItems);
    this.resetButton.setEnabled(hasItems);
  }

  /**
   * The customer's patience, on the counter under them. Patience stops once
   * served, so after serving the bar simply freezes.
   */
  private drawPatienceBar(): void {
    const g = this.patienceBar;
    g.clear();
    const fraction = Phaser.Math.Clamp(this.request.patience(), 0, 1);
    const x = 24;
    const y = COUNTER_TOP_Y + 12;
    const width = 80;
    g.fillStyle(COLORS.ink);
    g.fillRect(x, y, width, 8);
    g.fillStyle(patienceColor(fraction));
    g.fillRect(x + 2, y + 2, Math.ceil((width - 4) * fraction), 4);
  }

  /** One square button per owned ingredient along the bottom of the counter. */
  private createIngredientBins(): void {
    const size = 48;
    const spacing = 72;
    const startX = 64;
    const y = 300;

    STARTER_OWNED.ingredients.forEach((id, i) => {
      const x = startX + i * spacing;
      // The number on the bin is its keyboard shortcut.
      const bin = new Button(this, x, y, size, size, String(i + 1), INGREDIENTS[id].color, () =>
        this.addIngredient(id),
      );
      this.binButtons.push(bin);
      this.add
        .text(x, y + size / 2 + 6, INGREDIENTS[id].name, TEXT.label)
        .setOrigin(0.5, 0);
    });
  }

  /**
   * Optional PC shortcuts. Every key "presses" an on-screen button rather
   * than calling game logic directly, so keys and clicks can never behave
   * differently (a disabled button ignores its key too).
   */
  private setupKeyboard(): void {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return; // holding a key down shouldn't spam layers

      // Book controls work whether or not the book is open.
      if (event.key === 'r' || event.key === 'R') {
        if (this.recipeBook.isOpen()) this.recipeBook.close();
        else this.recipesButton.press();
        return;
      }
      if (event.key === 'Escape') {
        this.recipeBook.close();
        return;
      }

      // While the book is open it covers the counter, so the counter's keys
      // are ignored, just like clicks on it are.
      if (this.recipeBook.isOpen()) return;

      // event.key is the character typed, so both the top number row and
      // the numpad give '1', '2', ...
      const binIndex = Number(event.key) - 1;
      if (Number.isInteger(binIndex) && binIndex >= 0 && binIndex < this.binButtons.length) {
        this.binButtons[binIndex].press();
      } else if (event.key === 'Enter') {
        this.serveButton.press();
      } else if (event.key === 'Backspace') {
        // Stop the browser treating Backspace as "go back" in older browsers.
        event.preventDefault();
        this.resetButton.press();
      }
    };
    // keyboard is null when the game runs without a keyboard plugin (some
    // touch-only setups), hence the optional chaining.
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    // Prep opens and closes many times; remove the listener on close
    // explicitly so old ones can never pile up and fire twice.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
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
    g.fillStyle(this.request.fur);
    // Ears
    g.fillTriangle(x - 20, y - 22, x - 8, y - 22, x - 16, y - 40);
    g.fillTriangle(x + 8, y - 22, x + 20, y - 22, x + 16, y - 40);
    g.fillRoundedRect(x - 24, y - 28, 48, 64, 12);
    // Eyes
    g.fillStyle(COLORS.ink);
    g.fillRect(x - 12, y - 12, 4, 4);
    g.fillRect(x + 8, y - 12, 4, 4);
  }
}
