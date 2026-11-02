import Phaser from 'phaser';
import { TILE_SIZE } from '../config/display';
import { buildLayout } from '../logic/furniture';
import { addCafeCanvas, cafeOrigin, centred, drawCafeTiles } from '../ui/cafeTiles';
import { artKey } from '../ui/art';
import { DAY_CONFIG } from '../data/dayConfig';
import { INGREDIENTS } from '../data/ingredients';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { devActions } from '../debug/devActions';
import { devSettings } from '../debug/devSettings';
import {
  cleanSeats,
  clearCustomers,
  countGaveUp,
  createFloorState,
  customerAtCounter,
  hasFreeSeat,
  messySeatsAt,
  releaseCustomer,
  serveCustomer,
  stepFloor,
  type Customer,
  type FloorState,
} from '../logic/floor';
import { clockText, createDay, doorsOpen, isDayOver, stepDay, type DayState } from '../logic/day';
import { recordGaveUp, recordIngredients, recordOutOfStock, recordServe, recordWages } from '../logic/dayStats';
import { payWages } from '../logic/employees';
import { earnLeaves } from '../logic/gameState';
import { missingIngredient, orderIngredients, plateIngredients, useIngredients } from '../logic/stock';
import { pointKey, samePoint, tableById, type Layout, type Point } from '../logic/layout';
import { puffOfDust } from '../ui/effects';
import { StoryBox, type BoxRect } from '../ui/StoryBox';
import { bottomBoxLeft } from '../ui/hudLayout';
import { arrangeable, sizeBox } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { TUTORIAL, type TutorialStep } from '../data/tutorial';
import { finishedBy, floorGuide, isGuidedStart, tutorialOrder, type TutorialEvent, type TutorialState } from '../logic/tutorial';
import { playSound } from '../audio/audio';
import { createCleaner, stepCleaner, type CleanerState } from '../logic/cleaner';
import { isHired } from '../logic/employees';
import {
  cleaningProgress,
  createPlayer,
  stepPlayer,
  takeOrderAtCounter,
  tapTile,
  type PlayerState,
} from '../logic/player';
import { destination, isMoving, walkerPosition, type Walker } from '../logic/walker';
import { COLORS, TEXT, css, patienceColor } from '../ui/theme';
import { ClockDisplay } from '../ui/ClockDisplay';
import { createCleanerSprite, createDressedCritter, createPlayerSprite, critterHeadroom, setBobbing, setFacing } from '../ui/sprites';
import { christmasCustomerOutfit } from '../logic/christmasOutfits';
import type { Outfit } from '../logic/wardrobe';
import type { View } from '../art/sprites/sheetCritters';
import { customerArt } from '../art/spriteArt';
import { WalletDisplay } from '../ui/WalletDisplay';
import { beginCafeDay, endCafeDay, getGameState, setGameState, tutorialEvent, watchGameState } from './gameStore';
import type { DaySummaryRequest } from './DaySummaryScene';
import type { PrepRequest, PrepScene } from './PrepScene';
import type { WorldMapRequest } from './WorldMapScene';

/**
 * Depth sorting on the floor: every critter's depth is the y of its feet,
 * so whoever stands lower on the screen (nearer the viewer) is drawn in
 * front, like outdoors. Feet are never below the screen, so anything that
 * must stay on top of every critter (labels, bars, messages, Grandma's box)
 * goes from OVERLAY up.
 */
const feetDepth = (pixelY: number): number => pixelY + TILE_SIZE;
const OVERLAY = 1000;

/** The view that faces from one tile toward a next-door one: sideways, else up (back) or down (front). */
function facingToward(from: Point, to: Point): View {
  if (to.x > from.x) return 'right';
  if (to.x < from.x) return 'left';
  return to.y < from.y ? 'back' : 'front';
}

/** The tutorial steps Grandma Badger talks through here on the floor. */
const FLOOR_STEPS: ReadonlySet<TutorialStep> = new Set(['intro', 'takeOrder', 'clean', 'freePlay']);
/** Her box: under the cafe, clear of the corner buttons. */
/** Grandma's box along the bottom (movable in Arrange mode); it reaches to the same right edge wherever it starts. */
const guideRect = (): BoxRect => {
  const { x, y } = layoutPoint('floor', 'guide', { x: bottomBoxLeft(), y: 294 });
  return { x, y, width: 604 - x, height: 62 };
};

interface CustomerSprite {
  body: Phaser.GameObjects.Container;
  /**
   * Kept OUT of the body container, on its own higher layer: inside the
   * container it shared the body's depth, so other customers drawn later
   * (e.g. the rest of the queue) could cover it.
   */
  label: Phaser.GameObjects.Text;
}

/** How the customer at the counter is doing, for their label. */
type CounterStatus = 'readyToOrder' | 'noSeat' | null;

/**
 * Little hint above a customer's head:
 *   "!"   at the counter, ready to order (tap them!)
 *   "?"   at the counter but no clean seat is free (go clean a table!)
 *   "..." their order is being made
 *   "!!"  leaving upset (ran out of patience), in red
 * How patient they are shows as a bar instead (drawPatienceBars).
 */
function statusLabel(c: Customer, counter: CounterStatus): { text: string; color: number } {
  const calm = COLORS.statusCalm;
  if (counter === 'readyToOrder') return { text: '!', color: calm };
  if (counter === 'noSeat') return { text: '?', color: COLORS.statusImpatient };
  if (c.phase === 'ordered') return { text: '...', color: calm };
  if (c.phase === 'leaving' && c.upset) return { text: '!!', color: COLORS.statusUpset };
  return { text: '', color: calm };
}

/**
 * Top-down cafe floor. Drawn entirely from the layout data, so editing
 * data/cafeLayout.ts changes the room without touching this file.
 *
 * Like PrepScene, this only wires things up: the rules live in logic/
 * (walker, pathfinding, floor, player); this class turns taps into commands
 * and draws the current state each frame.
 */
export class FloorScene extends Phaser.Scene {
  private layout!: Layout;
  /** Pixel position of tile (0, 0); the grid is centred on screen. */
  private origin!: Point;

  private player!: PlayerState;
  private playerSprite!: Phaser.GameObjects.Container;
  private destinationMarker!: Phaser.GameObjects.Rectangle;
  /** The hired Cleaner, or null if nobody's hired today (GAME_DESIGN.md §5.8). */
  private cleaner: { state: CleanerState; sprite: Phaser.GameObjects.Container } | null = null;

  private floor!: FloorState;
  /** Today's clock. Runs on floor time, so `speed` makes the day go faster too. */
  private day!: DayState;
  private clock!: ClockDisplay;
  /** Messes and plates on tables; redrawn every frame from the floor state. */
  private tableOverlay!: Phaser.GameObjects.RenderTexture;
  /** Drawn above all characters (depth 20) so nobody can cover it. */
  private progressBar!: Phaser.GameObjects.Graphics;
  /** Patience bars over waiting customers, above all characters (depth 15). */
  private patienceBars!: Phaser.GameObjects.Graphics;
  /** One sprite per customer id, created and destroyed as customers come and go. */
  private customerSprites = new Map<number, CustomerSprite>();
  private customerOutfits = new Map<number, Outfit>();

  /** True while the prep station is on screen (taps on the floor are ignored). */
  private prepOpen = false;
  /**
   * The customer whose order is being cooked, until served or they give up.
   * Cleared on serve, while prep stays open a moment longer for their reaction.
   */
  private prepCustomerId: number | null = null;
  /** True once the day is over and its summary is up. */
  private summaryOpen = false;
  /** Grandma Badger's box for the tutorial step on screen here, if any (GAME_DESIGN.md §5.9). */
  private guide: StoryBox | null = null;
  /** The tutorial step `guide` was made for, to notice when it moves on. */
  private guideStep: TutorialState | null = null;
  /** The step's action happened, but Grandma has more to say first: sent when she's done. */
  private pendingEvent: TutorialEvent | null = null;

  constructor() {
    super('FloorScene');
  }

  create(): void {
    // No autosaves while the cafe is open (GAME_DESIGN.md §6.1). Leaving the
    // floor, normally through the summary's "Exit cafe", ends the day and
    // saves; quitting the browser mid-day just never saves it.
    beginCafeDay(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => endCafeDay(this));

    // The room plus today's furniture (the player arranges it from the map).
    this.layout = buildLayout(getGameState(this).furniture);
    this.origin = cafeOrigin(this.layout);

    // One canvas for the whole static floor (it never changes during a day),
    // and one for the messes and plates on top, redrawn every frame.
    drawCafeTiles(addCafeCanvas(this), this.layout, this.origin, getGameState(this).furniture.placed);
    this.tableOverlay = addCafeCanvas(this);
    this.progressBar = this.add.graphics().setDepth(OVERLAY + 20);
    this.patienceBars = this.add.graphics().setDepth(OVERLAY + 15);

    // Employees hired at the Notice Board work from the day the cafe opens.
    // (The Mascot dances outside, so it's drawn on the world map, not here.)
    const game = getGameState(this);
    this.floor = createFloorState(FLOOR_CONFIG, isHired(game, 'mascot'));
    this.cleaner = isHired(game, 'cleaner')
      ? { state: createCleaner(this.layout), sprite: createCleanerSprite(this) }
      : null;
    // Map entries point at the previous run's destroyed sprites if the scene
    // restarts, so start with a fresh map.
    this.customerSprites = new Map();
    this.customerOutfits = new Map();
    this.prepOpen = false;
    this.prepCustomerId = null;
    this.summaryOpen = false;
    this.guide = null;
    this.guideStep = null;
    this.pendingEvent = null;
    this.day = createDay();
    // Side by side on the top wall, clear of the floor.
    const clockAt = layoutPoint('floor', 'clock', { x: 88, y: 8 });
    this.clock = new ClockDisplay(this, clockAt.x, clockAt.y);
    arrangeable(this, 'floor', 'clock', clockAt, this.clock);
    const walletAt = layoutPoint('floor', 'wallet', { x: 8, y: 8 });
    const wallet = new WalletDisplay(this, walletAt.x, walletAt.y);
    arrangeable(this, 'floor', 'wallet', walletAt, wallet);
    watchGameState(this, (state) => wallet.setLeaves(state.leaves));

    // Small outline showing where the player is heading; hidden when idle.
    this.destinationMarker = this.add
      .rectangle(0, 0, TILE_SIZE - 2, TILE_SIZE - 2)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.paper)
      .setVisible(false);

    this.player = createPlayer(this.layout);
    this.playerSprite = createPlayerSprite(this, () => !this.prepOpen && !this.summaryOpen);

    // Listen on the whole scene, not on each tile: one handler converts the
    // tap position to a tile. 'pointerup' works the same for mouse and touch.
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // Taps on a button are the button's business, not a walk command.
        // The prep overlay covers the floor, so its taps aren't floor taps
        // either: this scene still hears them, since both scenes run at once.
        if (over.length > 0 || this.prepOpen || this.summaryOpen) return;
        this.onTileTapped(this.pixelToTile(pointer.worldX, pointer.worldY));
      },
    );

    // Dev console `mess` / `clean`. Only FREE seats get messy: a reserved or
    // occupied seat with a mess would be a state normal play can't reach.
    devActions.setMessy = (messy) => {
      const before = this.floor.messySeats.length;
      if (!messy) {
        this.floor = { ...this.floor, messySeats: [] };
        return before;
      }
      const taken = new Set(this.floor.customers.flatMap((c) => (c.seat ? [pointKey(c.seat.seat)] : [])));
      const free = this.layout.tables.flatMap((t) => t.seats).map(pointKey).filter((k) => !taken.has(k));
      this.floor = { ...this.floor, messySeats: [...new Set([...this.floor.messySeats, ...free])] };
      return this.floor.messySeats.length - before;
    };
    // Dev console `time` / `endday`. Ending the day moves the clock to
    // closing time and sends every customer away; the normal closing rules
    // do the rest next frame (an open prep station closes on its customer,
    // as if they gave up, then the summary shows).
    devActions.dayTime = () =>
      `Day ${getGameState(this).day}, ${clockText(this.day)} (${this.floor.doorsOpen ? 'open' : 'closed'})`;
    devActions.endDay = () => {
      this.day = { ...this.day, elapsed: Math.max(this.day.elapsed, DAY_CONFIG.dayLengthSeconds) };
      this.floor = clearCustomers(this.floor);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      devActions.setMessy = null;
      devActions.dayTime = null;
      devActions.endDay = null;
    });
  }

  update(_time: number, deltaMs: number): void {
    const seconds = deltaMs / 1000;
    this.syncTutorial();

    // Player first, so a table cleaned this frame can seat someone this frame.
    const { player, cleanedSeats } = stepPlayer(this.player, this.floor, seconds);
    this.player = player;
    if (cleanedSeats.length > 0) this.wiped(cleanedSeats);

    // Dev console "speed" command scales time for the critters (the Cleaner
    // too) and the day clock only; the player keeps walking at normal speed.
    const floorSeconds = seconds * devSettings.floorTimeScale;
    if (this.cleaner) {
      const playerTable = this.player.cleaning?.tableId ?? null;
      const worked = stepCleaner(this.cleaner.state, this.floor, this.layout, playerTable, floorSeconds);
      this.cleaner.state = worked.cleaner;
      if (worked.cleanedSeats.length > 0) this.wiped(worked.cleanedSeats);
      const at = this.walkerToPixel(worked.cleaner.walker);
      this.cleaner.sprite.setPosition(at.x, at.y).setDepth(feetDepth(at.y) + 0.1);
    }
    // The clock waits while Grandma Badger guides the start of Day 1.
    if (!isGuidedStart(getGameState(this).tutorial)) this.day = stepDay(this.day, floorSeconds);
    // Closing time: the day decides, the floor just stops letting people in.
    if (this.floor.doorsOpen && !doorsOpen(this.day)) this.floor = { ...this.floor, doorsOpen: false };
    const before = this.floor;
    this.floor = stepFloor(this.floor, this.layout, floorSeconds);
    const gaveUp = countGaveUp(before, this.floor);
    if (gaveUp > 0) {
      this.day = { ...this.day, stats: recordGaveUp(this.day.stats, gaveUp) };
      playSound('upset');
    }
    this.clock.show(clockText(this.day), this.floor.doorsOpen);

    // Closed and empty: the day is done. (Not while prep is still showing a
    // reaction, so the summary never pops up over it.)
    if (!this.summaryOpen && !this.prepOpen && isDayOver(this.day, this.floor)) this.openSummary();

    // After the floor step, so a customer who just reached the order spot
    // can be served this frame.
    const frontId = this.floor.queue[0];
    // The tutorial's guided customer always orders the same simple dish.
    const pickOrder = isGuidedStart(getGameState(this).tutorial) ? tutorialOrder : undefined;
    const taken = takeOrderAtCounter(this.player, this.floor, this.layout, getGameState(this), Math.random, pickOrder);
    this.player = taken.player;
    this.floor = taken.floor;
    if (taken.result === 'noSeat') this.showFloatingText(this.layout.orderSpot, 'No clean seats!');
    if (taken.result === 'outOfStock') this.onOutOfStock(frontId);
    if (taken.result === 'ordered') {
      playSound('order');
      this.tutorialAction('orderTaken');
      this.openPrep(this.floor.queue[0]);
    }

    // Ran out of patience while their order was cooking? Prep closes on them.
    if (this.prepCustomerId !== null && this.customer(this.prepCustomerId)?.phase !== 'ordered') {
      this.prepCustomerId = null;
      (this.scene.get('PrepScene') as PrepScene).customerGaveUp();
    }

    this.drawTableOverlay();
    this.drawProgressBar();
    this.syncCustomerSprites();
    this.drawPatienceBars();

    const pos = this.walkerToPixel(this.player.walker);
    // A hair in front of anyone on exactly the same row.
    this.playerSprite.setPosition(pos.x, pos.y).setDepth(feetDepth(pos.y) + 0.2);
    setFacing(this.playerSprite, this.playerFacing());
    if (!isMoving(this.player.walker) && !this.player.cleaning) {
      this.destinationMarker.setVisible(false);
    }
  }

  /**
   * Keeps the floor in step with the tutorial (GAME_DESIGN.md §5.9): how
   * customers may come, and Grandma Badger's box for the cafe's steps.
   */
  private syncTutorial(): void {
    const step = getGameState(this).tutorial;
    const guide = floorGuide(step);
    if (this.floor.guide !== guide) this.floor = { ...this.floor, guide };

    // A dish served wrong means they leave without eating, so no mess: with
    // the floor empty and clean there's nothing to wipe, so move on anyway.
    if (step === 'clean' && !this.pendingEvent && this.floor.customers.length === 0 && this.floor.messySeats.length === 0) {
      this.tutorialAction('wiped');
      return; // the box changes next frame
    }

    if (step !== this.guideStep) {
      this.guide?.destroy();
      this.guide = null;
      this.guideStep = step;
      this.pendingEvent = null;
      if (step !== 'done' && FLOOR_STEPS.has(step)) {
        const rect = guideRect();
        this.guide = new StoryBox(this, {
          rect,
          depth: OVERLAY + 100,
          step: TUTORIAL[step],
          arrow: (line) => this.tutorialArrow(TUTORIAL[step].pointsAt[line]),
          // Next on the last line: the step's own event if it was waiting on Grandma, else Next.
          onFinished: () => tutorialEvent(this, this.pendingEvent ?? 'next'),
          onSkip: () => tutorialEvent(this, 'skip'),
        });
        arrangeable(this, 'floor', 'guide', rect, this.guide, ...sizeBox(this, rect.x, rect.y, rect.width, rect.height));
      }
    }
    this.guide?.refreshArrow();
  }

  /**
   * The player did something a tutorial step may wait for. If it's this
   * step's action and Grandma has lines after the waiting one, she says those
   * first and the step ends on her last Next; otherwise it ends now.
   */
  private tutorialAction(event: TutorialEvent): void {
    const step = this.guideStep;
    const waitsHere = step && step !== 'done' && finishedBy(step) === event;
    if (waitsHere && this.guide?.actionDone()) this.pendingEvent = event;
    else tutorialEvent(this, event);
  }

  /** Where Grandma Badger's arrow points on the floor, by name (data/tutorial.ts ARROW_TARGETS). */
  private tutorialArrow(target: string | null | undefined): Point | null {
    const atCounter = customerAtCounter(this.floor, this.layout);
    if (target === 'customer' && atCounter) {
      const { x, y } = this.tileToPixel(this.layout.orderSpot);
      return { x: x + TILE_SIZE / 2, y: y - critterHeadroom(customerArt(atCounter.id)) - 14 }; // over their head and the "!"
    }
    if (target === 'mess' && this.floor.messySeats.length > 0) {
      const messy = this.floor.messySeats[0];
      const table = this.layout.tables.find((t) => t.seats.some((s) => pointKey(s) === messy));
      const seat = table?.seats.find((s) => pointKey(s) === messy);
      if (!table || !seat) return null;
      const { x, y } = this.seatSideCenter(table.position, seat);
      return { x, y: y - 5 };
    }
    return null;
  }

  /** Seats just wiped clean (by the player or the Cleaner): clean them, with a puff of dust where each mess was. */
  private wiped(seats: readonly Point[]): void {
    this.floor = cleanSeats(this.floor, seats);
    playSound('wipe');
    this.tutorialAction('wiped');
    for (const seat of seats) {
      const table = this.layout.tables.find((t) => t.seats.some((s) => samePoint(s, seat)));
      if (!table) continue;
      const { x, y } = this.seatSideCenter(table.position, seat);
      puffOfDust(this, x, y);
    }
  }

  /**
   * A short message that drifts up from a tile and fades out, e.g. "No clean
   * seats!". A tween animates it, then it destroys itself: no bookkeeping.
   */
  private showFloatingText(tile: Point, message: string): void {
    const { x, y } = this.tileToPixel(tile);
    const text = this.add
      .text(x + TILE_SIZE / 2, y - 8, message, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(OVERLAY + 25);
    this.tweens.add({
      targets: text,
      y: text.y - 12,
      alpha: 0,
      delay: 600, // readable for a moment before it fades
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }

  /** Their dish couldn't be made, so they're leaving: say what ran out. */
  private onOutOfStock(customerId: number): void {
    this.day = { ...this.day, stats: recordOutOfStock(this.day.stats) };
    const order = this.customer(customerId)?.order;
    const missing = order && missingIngredient(getGameState(this), orderIngredients(order));
    const message = missing ? `Out of ${INGREDIENTS[missing].name.toLowerCase()}!` : 'Out of stock!';
    this.showFloatingText(this.layout.orderSpot, message);
  }

  /**
   * Shows the day summary over the floor. "Exit cafe" opens the world map;
   * picking the Cafe there moves the game state on a day and starts this
   * scene again, whose create() builds a fresh floor (clean tables, empty
   * queue, clock back to 8:00). Leaves and stock live in the game state and
   * carry over.
   */
  private openSummary(): void {
    this.children.getByName('wardrobe')?.destroy();
    this.summaryOpen = true;
    // The day ended with "Off you go!" still up: that's read enough, so the
    // tutorial carries on with the summary (GAME_DESIGN.md §5.9).
    if (getGameState(this).tutorial === 'freePlay') tutorialEvent(this, 'next');
    playSound('dayEnd');
    this.destinationMarker.setVisible(false);
    // Wages come out at the end of the day, after the day's takings are in.
    const wages = payWages(getGameState(this));
    setGameState(this, wages.state);
    this.day = { ...this.day, stats: recordWages(this.day.stats, wages.paid, wages.quit) };
    const request: DaySummaryRequest = {
      stats: this.day.stats,
      onExit: () => {
        const map: WorldMapRequest = { current: 'cafe' };
        // start() stops this scene (the summary has already closed itself).
        this.scene.start('WorldMapScene', map);
      },
    };
    this.scene.launch('DaySummaryScene', request);
  }

  private customer(id: number): Customer | undefined {
    return this.floor.customers.find((c) => c.id === id);
  }

  /**
   * Opens the prep station on top of the floor for this customer's order.
   * launch() (not start()) runs it alongside this scene, so the floor keeps
   * going: patience drops and others keep eating while the player cooks.
   */
  private openPrep(customerId: number): void {
    const order = this.customer(customerId)?.order;
    if (!order) return;
    this.children.getByName('wardrobe')?.destroy();
    this.prepOpen = true;
    this.prepCustomerId = customerId;
    this.destinationMarker.setVisible(false);

    const request: PrepRequest = {
      order,
      art: customerArt(customerId),
      outfit: this.outfitFor(customerId),
      clock: () => ({ text: clockText(this.day), open: this.floor.doorsOpen }),
      patience: () => (this.customer(customerId)?.patience ?? 0) / FLOOR_CONFIG.patienceSeconds,
      onServe: (result, payment, plate) => {
        // Patience stops now, but they wait at the counter while reacting.
        this.floor = serveCustomer(this.floor, customerId, result.score);
        this.prepCustomerId = null;
        // Whatever is on the plate is used up, right or wrong: stock first,
        // rush deliveries paid from the wallet. Then the customer pays in.
        // (The wallet display updates itself from the state.)
        const used = useIngredients(getGameState(this), plateIngredients(plate, order.quantity));
        setGameState(this, earnLeaves(used.state, payment.total));
        tutorialEvent(this, 'served');
        const stats = recordServe(this.day.stats, result.score, payment);
        this.day = { ...this.day, stats: recordIngredients(stats, used.plan) };
      },
      onClose: () => {
        this.prepOpen = false;
        // Only now do they walk off (to their seat, or out if it was wrong),
        // so the player sees them go. No-op if they gave up instead.
        this.floor = releaseCustomer(this.floor, this.layout, customerId);
      },
    };
    this.scene.launch('PrepScene', request);
  }

  private onTileTapped(tile: Point): void {
    const next = tapTile(this.player, this.layout, this.floor, tile);
    if (next === this.player) return; // nothing to do there: walls, clean tables, outside the room
    this.player = next;

    // Outline the table being cleaned, or else the tile being walked to.
    const target = next.cleaning
      ? tableById(this.layout, next.cleaning.tableId).position
      : destination(next.walker);
    const marker = this.tileToPixel(target);
    this.destinationMarker.setPosition(marker.x + 1, marker.y + 1).setVisible(true);
  }

  /** Top-left pixel of a tile. */
  private tileToPixel(p: Point): Point {
    return { x: this.origin.x + p.x * TILE_SIZE, y: this.origin.y + p.y * TILE_SIZE };
  }

  /**
   * Where to draw a walker (player or customer), which may be between tiles.
   * Rounded to whole pixels so sprites never sit between pixels (blurry).
   */
  private walkerToPixel(walker: Walker): Point {
    const pos = walkerPosition(walker);
    return {
      x: Math.round(this.origin.x + pos.x * TILE_SIZE),
      y: Math.round(this.origin.y + pos.y * TILE_SIZE),
    };
  }

  /** Which tile a screen pixel falls in (may be outside the grid). */
  private pixelToTile(px: number, py: number): Point {
    return {
      x: Math.floor((px - this.origin.x) / TILE_SIZE),
      y: Math.floor((py - this.origin.y) / TILE_SIZE),
    };
  }

  /**
   * Messes and plates, each drawn on the half of the table facing its seat.
   * Messes are per seat, so a table can be messy on one side and in use on
   * the other.
   */
  private drawTableOverlay(): void {
    const canvas = this.tableOverlay;
    canvas.clear(); // cheap: a handful of tables, redrawn from scratch each frame
    for (const table of this.layout.tables) {
      for (const seat of messySeatsAt(this.floor, table)) {
        const { x, y } = this.seatSideCenter(table.position, seat);
        const at = centred('mess', x, y);
        canvas.drawFrame(artKey('mess'), 0, at.x, at.y);
      }
    }

    for (const c of this.floor.customers) {
      if (c.phase !== 'eating' || !c.seat) continue;
      const table = tableById(this.layout, c.seat.tableId);
      const { x, y } = this.seatSideCenter(table.position, c.seat.seat);
      const at = centred('plate', x, y);
      canvas.drawFrame(artKey('plate'), 0, at.x, at.y);
    }
  }

  /**
   * Pixel centre of the half of a table tile facing a seat. E.g. a seat to
   * the left of the table -> the middle of the table's left half.
   */
  private seatSideCenter(table: Point, seat: Point): Point {
    const { x, y } = this.tileToPixel(table);
    const quarter = TILE_SIZE / 4;
    return {
      x: x + TILE_SIZE / 2 + (seat.x - table.x) * quarter,
      y: y + TILE_SIZE / 2 + (seat.y - table.y) * quarter,
    };
  }

  /**
   * Progress bar above the table being wiped. On its own Graphics layer at
   * a high depth: the table overlay sits under the characters, and the
   * player often stands right where the bar goes (cleaning from above).
   */
  private drawProgressBar(): void {
    const g = this.progressBar;
    g.clear();
    // The player's, and the Cleaner's: never the same table (stepCleaner).
    for (const worker of [this.player, this.cleaner?.state]) {
      const progress = worker && cleaningProgress(worker);
      if (progress === null || progress === undefined || !worker?.cleaning) continue;
      const table = tableById(this.layout, worker.cleaning.tableId);
      const { x, y } = this.tileToPixel(table.position);
      const barWidth = TILE_SIZE - 2;
      g.fillStyle(COLORS.ink);
      g.fillRect(x + 1, y - 5, barWidth, 4);
      g.fillStyle(COLORS.serve);
      // Math.floor: whole-pixel widths keep the bar crisp as it fills.
      g.fillRect(x + 2, y - 4, Math.floor((barWidth - 2) * progress), 2);
    }
  }

  /**
   * A small bar over a customer whose order has been taken, draining as
   * their patience runs out. (Queued customers don't lose patience, so they
   * get no bar.) On its own layer above the characters.
   */
  private drawPatienceBars(): void {
    const g = this.patienceBars;
    g.clear();
    const width = TILE_SIZE - 4;
    for (const c of this.floor.customers) {
      if (c.phase !== 'ordered') continue;
      // Clamp: if `set patienceSeconds` lowers the max mid-game, don't overflow.
      const fraction = Phaser.Math.Clamp(c.patience / FLOOR_CONFIG.patienceSeconds, 0, 1);
      const { x, y } = this.walkerToPixel(c.walker);
      // Just over the head, however far it pokes above the tile.
      const top = y - critterHeadroom(customerArt(c.id)) - 4;
      g.fillStyle(COLORS.ink);
      g.fillRect(x + 2, top, width, 3);
      g.fillStyle(patienceColor(fraction));
      // Math.ceil so a nearly-empty bar still shows one pixel until it hits 0.
      g.fillRect(x + 3, top + 1, Math.ceil((width - 2) * fraction), 1);
    }
  }

  /**
   * Keeps one sprite per customer in the floor state: creates sprites for
   * new arrivals, moves existing ones, destroys those who left. The floor
   * state is the source of truth; sprites just mirror it.
   */
  private syncCustomerSprites(): void {
    const atCounter = customerAtCounter(this.floor, this.layout);
    const counterStatus: CounterStatus = hasFreeSeat(this.floor, this.layout) ? 'readyToOrder' : 'noSeat';

    const present = new Set<number>();
    for (const c of this.floor.customers) {
      present.add(c.id);
      let sprite = this.customerSprites.get(c.id);
      if (!sprite) {
        sprite = this.createCustomerSprite(c.id);
        this.customerSprites.set(c.id, sprite);
      }
      const pos = this.walkerToPixel(c.walker);
      sprite.body.setPosition(pos.x, pos.y).setDepth(feetDepth(pos.y));
      // A little bob while standing at the counter, so the queue looks alive.
      const waiting = (c.phase === 'queued' || c.phase === 'ordered' || c.phase === 'served') && !isMoving(c.walker);
      setBobbing(sprite.body, waiting);
      setFacing(sprite.body, this.customerFacing(c));
      // Above the patience bar, which sits just over the head.
      sprite.label.setPosition(pos.x + TILE_SIZE / 2, pos.y - critterHeadroom(customerArt(c.id)) - 5);

      // Changing a Phaser Text's colour redraws its texture, so only touch
      // it when the status actually changes, not every frame.
      const status = statusLabel(c, c === atCounter ? counterStatus : null);
      if (sprite.label.text !== status.text) {
        sprite.label.setText(status.text).setColor(css(status.color));
      }
    }
    for (const [id, sprite] of this.customerSprites) {
      if (!present.has(id)) {
        sprite.body.destroy();
        sprite.label.destroy(); // not inside the body container, so destroy it separately
        this.customerSprites.delete(id);
      }
    }
  }

  /**
   * Which way the player faces while standing: toward the table they're
   * wiping, forward (toward the customers) behind the counter, else the way
   * they last walked.
   */
  private playerFacing(): View | null {
    const tile = this.player.walker.tile;
    if (this.player.cleaning) return facingToward(tile, tableById(this.layout, this.player.cleaning.tableId).position);
    return samePoint(tile, this.layout.counterSpot) ? 'front' : null;
  }

  /**
   * Which way a standing customer faces: the counter (their back to the
   * player) while queuing and ordering, their table while eating, else the
   * way they last walked.
   */
  private customerFacing(c: Customer): View | null {
    if (c.phase === 'queued' || c.phase === 'ordered' || c.phase === 'served') return 'back';
    if (c.phase === 'eating' && c.seat) return facingToward(c.seat.seat, tableById(this.layout, c.seat.tableId).position);
    return null;
  }

  /** A customer: a fox, rabbit, deer or mouse, picked by id. */
  private createCustomerSprite(id: number): CustomerSprite {
    // Its depth follows its feet every frame (syncCustomerSprites).
    const body = createDressedCritter(this, customerArt(id), this.outfitFor(id));
    // Status text above the head (see statusLabel), on a layer above every
    // character (with the patience bars, under the progress bar), with a
    // dark outline so it reads on any floor colour.
    const label = this.add
      .text(0, 0, '', { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(OVERLAY + 15);
    return { body, label };
  }

  private outfitFor(id: number): Outfit {
    let outfit = this.customerOutfits.get(id);
    if (!outfit) {
      outfit = christmasCustomerOutfit(id, getGameState(this).day, new Date(), !!devSettings.allSeasons);
      this.customerOutfits.set(id, outfit);
    }
    return outfit;
  }
}
