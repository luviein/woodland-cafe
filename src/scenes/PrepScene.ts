import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { INGREDIENTS, type IngredientId } from '../data/ingredients';
import { devActions } from '../debug/devActions';
import { buildGaveUp, buildReaction, buildSpeech, hintRatioForDay } from '../logic/dialogue';
import { availableRecipes, expectedPlate } from '../logic/orders';
import { computePayment, type Payment } from '../logic/payment';
import { scoreDish } from '../logic/scoreDish';
import { binStatus, type BinStatus } from '../logic/stock';
import {
  canToast,
  startToasting,
  stepToasting,
  takeFromToaster,
  toastModifiers,
  toastingProgress,
  untoasted,
  type DishToast,
} from '../logic/toasting';
import type { Order, ScoreResult } from '../logic/types';
import { Button } from '../ui/Button';
import { DishView, drawLayerStack } from '../ui/DishView';
import { ToasterView } from '../ui/ToasterView';
import { RecipeBook } from '../ui/RecipeBook';
import { SpeechBubble } from '../ui/SpeechBubble';
import { ClockDisplay } from '../ui/ClockDisplay';
import { WalletDisplay } from '../ui/WalletDisplay';
import { COLORS, TEXT, css, patienceColor } from '../ui/theme';
import { getGameState, watchGameState } from './gameStore';

/** Keeps the stack on screen; no recipe needs more than 4 layers. */
const MAX_DISH_LAYERS = 6;
/** How long the customer's last words stay up (time to read them) before prep closes. */
const CLOSE_DELAY_MS = 1200;
/**
 * After this long, any tap or key closes prep early. The short wait stops the
 * tap/keypress that served the dish (or a quick double-tap) from skipping the
 * reaction before it can be seen.
 */
const SKIP_AFTER_MS = 300;

const COUNTER_TOP_Y = 140;
/** Centre of the plate; the dish is grabbed from, and dropped back onto, the area around it. */
const PLATE_X = 320;
const PLATE_Y = 214;
const PLATE_AREA = new Phaser.Geom.Rectangle(PLATE_X - 88, PLATE_Y - 84, 176, 112);

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
  /** The day clock, read every frame: the day keeps going while the player cooks. */
  clock: () => { text: string; open: boolean };
  /**
   * Called once, when the player serves, with what the customer pays and
   * the plate's layers (the floor uses them up from stock).
   */
  onServe: (result: ScoreResult, payment: Payment, plate: readonly IngredientId[]) => void;
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
  /** The dish's trip through the toaster (logic/toasting.ts). */
  private toast: DishToast = untoasted();
  /** Only there once the Toaster has been bought. */
  private toaster: ToasterView | null = null;
  /** The copy of the dish following the pointer while it's dragged; null when not dragging. */
  private dragged: Phaser.GameObjects.Container | null = null;

  private bubble!: SpeechBubble;
  private recipeBook!: RecipeBook;
  private dishView!: DishView;
  private patienceBar!: Phaser.GameObjects.Graphics;
  private clock!: ClockDisplay;
  private serveButton!: Button;
  private resetButton!: Button;
  private recipesButton!: Button;
  /** Ingredient bins, in hotkey order: binButtons[0] is key 1. */
  private binButtons: Button[] = [];
  /** What each bin holds, and the stock / rush-price text above it (same order). */
  private binIds: IngredientId[] = [];
  private binCounts: Phaser.GameObjects.Text[] = [];

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
    this.toast = untoasted();
    this.toaster = null;
    this.dragged = null;
    this.binButtons = [];
    this.binIds = [];
    this.binCounts = [];

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
    // Hints get more common as the days go by (data/hintConfig.ts).
    this.bubble.setLines(buildSpeech(this.request.order, hintRatioForDay(getGameState(this).day)));
    this.dishView = new DishView(this, PLATE_X, PLATE_Y);
    if (getGameState(this).upgrades.includes('toaster')) this.createToaster();

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
      this.recipeBook.open(availableRecipes(getGameState(this))),
    );

    // Same wallet and clock as on the floor, but top-right, under the Recipes
    // button: the customer peeks over the counter in the top-left. The
    // wallet ticks up the moment the customer pays.
    this.clock = new ClockDisplay(this, 560, 78);
    const wallet = new WalletDisplay(this, 560, 52);
    watchGameState(this, (state) => {
      wallet.setLeaves(state.leaves);
      this.refreshDish(); // bins depend on stock and Leaves
    });

    this.setupKeyboard();
    this.refreshDish();

    // Dev console `serve`: skip cooking and serve as if the dish scored that.
    // The plate counts as the recipe's layers, which the order was checked to
    // be makeable with when it was taken.
    devActions.serve = (score) => {
      if (!this.busy) this.deliver({ score, missingModifiers: [], extraModifiers: [] }, expectedPlate(this.request.order).layers);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      devActions.serve = null;
    });
  }

  update(_time: number, deltaMs: number): void {
    if (this.toast.place === 'toasting' && !this.busy) {
      this.toast = stepToasting(this.toast, deltaMs / 1000);
      this.toaster?.setProgress(toastingProgress(this.toast));
      if (this.toast.place === 'ready') {
        this.toaster?.popUp(this.dish);
        this.refreshDish();
      }
    }
    this.drawPatienceBar();
    const { text, open } = this.request.clock();
    this.clock.show(text, open);
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
    if (this.busy || this.dish.length >= MAX_DISH_LAYERS || this.binStatus(id).kind === 'out') return;
    this.dish.push(id);
    this.refreshDish();
  }

  private resetDish(): void {
    if (this.busy || this.toast.place !== 'plate') return;
    this.dish = [];
    this.toast = untoasted();
    this.refreshDish();
  }

  /**
   * The Toaster beside the plate, and the two drags (GAME_DESIGN.md §3.4
   * "Toasting"): the dish from the plate into the toaster, and once it pops
   * up, from the top of the toaster back onto the plate.
   */
  private createToaster(): void {
    const toaster = new ToasterView(this, 456, 200);
    this.toaster = toaster;
    this.add.text(456, 222, 'Toaster (T)', TEXT.label).setOrigin(0.5, 0);

    this.addDragSource(
      PLATE_AREA,
      () => canToast(this.toast, this.dish.length),
      () => this.dishView.setLayers([], false, ''), // it's in your hand now
      () => toaster.dropArea(),
      () => this.putInToaster(),
    );
    this.addDragSource(
      toaster.topArea(),
      () => this.toast.place === 'ready',
      () => toaster.showOnTop([]),
      () => PLATE_AREA,
      () => this.takeBackFromToaster(),
    );
  }

  /**
   * Lets the dish be dragged out of `area` and dropped on `target()`.
   * Dropped anywhere else, it goes back where it came from (refreshDish
   * redraws it there). Only starts when `canGrab()` says so.
   */
  private addDragSource(
    area: Phaser.Geom.Rectangle,
    canGrab: () => boolean,
    onGrab: () => void,
    target: () => Phaser.Geom.Rectangle,
    onDrop: () => void,
  ): void {
    const zone = this.add
      .zone(area.centerX, area.centerY, area.width, area.height)
      .setInteractive({ draggable: true, useHandCursor: true });
    zone.on(Phaser.Input.Events.GAMEOBJECT_DRAG_START, (pointer: Phaser.Input.Pointer) => {
      if (this.busy || this.dragged || !canGrab()) return;
      this.dragged = this.add.container(pointer.worldX, pointer.worldY).setDepth(30);
      drawLayerStack(this.dragged, this.dish, this.toast.toasted);
      onGrab();
    });
    // Phaser would move the zone itself; we move the copy instead and leave
    // the zone where it is, ready for the next grab.
    zone.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (pointer: Phaser.Input.Pointer) => {
      this.dragged?.setPosition(pointer.worldX, pointer.worldY);
    });
    zone.on(Phaser.Input.Events.GAMEOBJECT_DRAG_END, (pointer: Phaser.Input.Pointer) => {
      if (!this.dragged) return;
      this.dragged.destroy();
      this.dragged = null;
      if (!this.busy && target().contains(pointer.worldX, pointer.worldY)) onDrop();
      else this.refreshDish();
    });
  }

  private putInToaster(): void {
    if (this.busy || !this.toaster || !canToast(this.toast, this.dish.length)) return;
    this.toast = startToasting(this.toast);
    this.toaster.startToasting();
    this.refreshDish();
  }

  private takeBackFromToaster(): void {
    if (this.busy || !this.toaster || this.toast.place !== 'ready') return;
    this.toast = takeFromToaster(this.toast);
    this.refreshDish();
  }

  private serve(): void {
    if (this.busy || this.dish.length === 0 || this.toast.place !== 'plate') return;

    // Toasted is the only modifier so far (a missing one cuts the tip, §4).
    const result = scoreDish(expectedPlate(this.request.order), {
      layers: this.dish,
      modifiers: toastModifiers(this.toast),
    });
    this.deliver(result, this.dish);
  }

  /** Hands the scored dish over: payment, reaction, then prep closes. */
  private deliver(result: ScoreResult, plate: readonly IngredientId[]): void {
    // Pays when served, tipping by the patience left right now.
    const payment = computePayment(this.request.order, result, this.request.patience());
    this.request.onServe(result, payment, plate);
    // No result pop-up: the customer's reaction (and their Leaves) is the feedback.
    this.finish(buildReaction(result.score));
    if (payment.total > 0) this.showPayment(payment);
  }

  /** "+7 🍃" floating up from the customer, with the tip on a second line. */
  private showPayment(payment: Payment): void {
    const lines = [`+${payment.total} 🍃`];
    if (payment.tip > 0) lines.push(`(${payment.tip} tip)`);
    const text = this.add
      .text(64, COUNTER_TOP_Y - 76, lines, {
        ...TEXT.heading,
        color: css(COLORS.paper),
        stroke: css(COLORS.ink),
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(40); // over the prep UI, under the recipe book (50)
    this.tweens.add({ targets: text, y: text.y - 16, duration: 900, ease: 'Sine.easeOut' });
  }

  /** Shows the customer's last words, locks the counter, then closes. */
  private finish(line: string): void {
    this.busy = true;
    this.refreshDish(); // greys out every button
    this.recipeBook.close();
    this.bubble.setLines([line]);

    // Closes after the delay, or sooner on a tap/key; whichever comes first wins.
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      // stop() shuts this scene down (its timers, objects and input
      // listeners go with it); the floor underneath was running all along.
      this.scene.stop();
      this.request.onClose();
    };
    this.time.delayedCall(CLOSE_DELAY_MS, close);
    this.time.delayedCall(SKIP_AFTER_MS, () => {
      // On pointer UP, one tick later: the floor scene hears this same
      // pointerup, and by then it has already ignored it (prep still open).
      // Closing straight away would turn the tap into a walk on the floor.
      this.input.once(Phaser.Input.Events.POINTER_UP, () => this.time.delayedCall(0, close));
      this.input.keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, close);
    });
  }

  private refreshDish(): void {
    const onPlate = this.toast.place === 'plate';
    const away = this.toast.place === 'toasting' ? 'In the toaster...' : 'Toasted! Drag it back to the plate';
    this.dishView.setLayers(onPlate ? this.dish : [], this.toast.toasted, onPlate ? 'Empty plate' : away);
    // On top of the toaster once it pops (also puts it back after a drag that missed the plate).
    this.toaster?.showOnTop(this.toast.place === 'ready' ? this.dish : []);
    // Serving an empty plate would always score "wrong", so disable it to
    // prevent accidental misclicks rather than punish them. Same while the
    // dish is in the toaster: there's nothing on the plate.
    const hasItems = onPlate && this.dish.length > 0 && !this.busy;
    this.serveButton.setEnabled(hasItems);
    this.resetButton.setEnabled(hasItems);
    this.refreshBins();
  }

  /** Stock (or rush price) over each bin; bins that can't be used are greyed out. */
  private refreshBins(): void {
    const full = this.busy || this.toast.place !== 'plate' || this.dish.length >= MAX_DISH_LAYERS;
    this.binIds.forEach((id, i) => {
      const status = this.binStatus(id);
      this.binButtons[i].setEnabled(!full && status.kind !== 'out');
      this.binCounts[i].setText(
        status.kind === 'stock' ? `x${status.left}` : status.kind === 'rush' ? `🍃${status.price}` : 'Out',
      );
    });
  }

  private binStatus(id: IngredientId): BinStatus {
    return binStatus(getGameState(this), this.dish, id, this.request.order.quantity);
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

    getGameState(this).ingredients.forEach((id, i) => {
      const x = startX + i * spacing;
      // The number on the bin is its keyboard shortcut.
      const bin = new Button(this, x, y, size, size, String(i + 1), INGREDIENTS[id].color, () =>
        this.addIngredient(id),
      );
      this.binButtons.push(bin);
      this.binIds.push(id);
      this.add
        .text(x, y + size / 2 + 6, INGREDIENTS[id].name, TEXT.label)
        .setOrigin(0.5, 0);
      // Filled in by refreshBins(): "x5" left, "🍃2" rush price, or "Out".
      this.binCounts.push(this.add.text(x, y - size / 2 - 4, '', TEXT.label).setOrigin(0.5, 1));
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
      } else if (event.key === 't' || event.key === 'T') {
        // Keyboard stand-in for the drags: in, then (once it pops) back out.
        if (this.toast.place === 'ready') this.takeBackFromToaster();
        else this.putInToaster();
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
