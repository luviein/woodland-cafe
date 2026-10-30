import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { devActions } from '../debug/devActions';
import { devSettings } from '../debug/devSettings';
import {
  cleanSeats,
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
import { recordGaveUp, recordServe } from '../logic/dayStats';
import { earnLeaves, startNextDay } from '../logic/gameState';
import { parseLayout, pointKey, tableById, type Layout, type Point, type TileKind } from '../logic/layout';
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
import { WalletDisplay } from '../ui/WalletDisplay';
import { getGameState, setGameState, watchGameState } from './gameStore';
import type { DaySummaryRequest } from './DaySummaryScene';
import type { PrepRequest, PrepScene } from './PrepScene';

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

/** Each customer's fur colour, picked by id, so they look the same on the floor and at prep. */
const furColor = (id: number): number => COLORS.customerFur[id % COLORS.customerFur.length];

const TILE_COLORS: Record<Exclude<TileKind, 'floor'>, number> = {
  wall: COLORS.wallTile,
  door: COLORS.doorTile,
  counter: COLORS.counterTop,
  table: COLORS.tableTop,
  seat: COLORS.seatTile,
};

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

  private floor!: FloorState;
  /** Today's clock. Runs on floor time, so `speed` makes the day go faster too. */
  private day!: DayState;
  private clock!: ClockDisplay;
  /** Messes and plates on tables; redrawn every frame from the floor state. */
  private tableOverlay!: Phaser.GameObjects.Graphics;
  /** Drawn above all characters (depth 20) so nobody can cover it. */
  private progressBar!: Phaser.GameObjects.Graphics;
  /** Patience bars over waiting customers, above all characters (depth 15). */
  private patienceBars!: Phaser.GameObjects.Graphics;
  /** One sprite per customer id, created and destroyed as customers come and go. */
  private customerSprites = new Map<number, CustomerSprite>();

  /** True while the prep station is on screen (taps on the floor are ignored). */
  private prepOpen = false;
  /**
   * The customer whose order is being cooked, until served or they give up.
   * Cleared on serve, while prep stays open a moment longer for their reaction.
   */
  private prepCustomerId: number | null = null;
  /** True once the day is over and its summary is up. */
  private summaryOpen = false;

  constructor() {
    super('FloorScene');
  }

  create(): void {
    this.layout = parseLayout(CAFE_LAYOUT);
    // Math.floor keeps the grid on whole pixels; a half-pixel offset would
    // make every tile edge blurry.
    this.origin = {
      x: Math.floor((BASE_WIDTH - this.layout.width * TILE_SIZE) / 2),
      y: Math.floor((BASE_HEIGHT - this.layout.height * TILE_SIZE) / 2),
    };

    this.drawTiles();
    this.tableOverlay = this.add.graphics();
    this.progressBar = this.add.graphics().setDepth(20);
    this.patienceBars = this.add.graphics().setDepth(15);

    this.floor = createFloorState();
    // Map entries point at the previous run's destroyed sprites if the scene
    // restarts, so start with a fresh map.
    this.customerSprites = new Map();
    this.prepOpen = false;
    this.prepCustomerId = null;
    this.summaryOpen = false;
    this.day = createDay();
    this.clock = new ClockDisplay(this, 8, 34);
    const wallet = new WalletDisplay(this, 8, 8);
    watchGameState(this, (state) => wallet.setLeaves(state.leaves));

    // Small outline showing where the player is heading; hidden when idle.
    this.destinationMarker = this.add
      .rectangle(0, 0, TILE_SIZE - 2, TILE_SIZE - 2)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.apron)
      .setVisible(false);

    this.player = createPlayer(this.layout);
    this.playerSprite = this.createPlayerSprite();

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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      devActions.setMessy = null;
    });
  }

  update(_time: number, deltaMs: number): void {
    const seconds = deltaMs / 1000;

    // Player first, so a table cleaned this frame can seat someone this frame.
    const { player, cleanedSeats } = stepPlayer(this.player, this.floor, seconds);
    this.player = player;
    if (cleanedSeats.length > 0) this.floor = cleanSeats(this.floor, cleanedSeats);

    // Dev console "speed" command scales time for the critters and the day
    // clock only; the player keeps walking at normal speed.
    const floorSeconds = seconds * devSettings.floorTimeScale;
    this.day = stepDay(this.day, floorSeconds);
    // Closing time: the day decides, the floor just stops letting people in.
    if (this.floor.doorsOpen && !doorsOpen(this.day)) this.floor = { ...this.floor, doorsOpen: false };
    const before = this.floor;
    this.floor = stepFloor(this.floor, this.layout, floorSeconds);
    const gaveUp = countGaveUp(before, this.floor);
    if (gaveUp > 0) this.day = { ...this.day, stats: recordGaveUp(this.day.stats, gaveUp) };
    this.clock.show(clockText(this.day), this.floor.doorsOpen);

    // Closed and empty: the day is done. (Not while prep is still showing a
    // reaction, so the summary never pops up over it.)
    if (!this.summaryOpen && !this.prepOpen && isDayOver(this.day, this.floor)) this.openSummary();

    // After the floor step, so a customer who just reached the order spot
    // can be served this frame.
    const taken = takeOrderAtCounter(this.player, this.floor, this.layout, getGameState(this));
    this.player = taken.player;
    this.floor = taken.floor;
    if (taken.result === 'noSeat') this.showFloatingText(this.layout.orderSpot, 'No clean seats!');
    if (taken.result === 'ordered') this.openPrep(this.floor.queue[0]);

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
    this.playerSprite.setPosition(pos.x, pos.y);
    if (!isMoving(this.player.walker) && !this.player.cleaning) {
      this.destinationMarker.setVisible(false);
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
      .setDepth(25);
    this.tweens.add({
      targets: text,
      y: text.y - 12,
      alpha: 0,
      delay: 600, // readable for a moment before it fades
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Shows the day summary over the floor. "Start next day" moves the game
   * state on a day and restarts this scene: create() builds a fresh floor
   * (clean tables, empty queue, clock back to 8:00), while the wallet lives
   * in the game state and carries over.
   */
  private openSummary(): void {
    this.summaryOpen = true;
    this.destinationMarker.setVisible(false);
    const request: DaySummaryRequest = {
      stats: this.day.stats,
      onNextDay: () => {
        setGameState(this, startNextDay(getGameState(this)));
        this.scene.restart();
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
    this.prepOpen = true;
    this.prepCustomerId = customerId;
    this.destinationMarker.setVisible(false);

    const request: PrepRequest = {
      order,
      fur: furColor(customerId),
      clock: () => ({ text: clockText(this.day), open: this.floor.doorsOpen }),
      patience: () => (this.customer(customerId)?.patience ?? 0) / FLOOR_CONFIG.patienceSeconds,
      onServe: (result, payment) => {
        // Patience stops now, but they wait at the counter while reacting.
        this.floor = serveCustomer(this.floor, customerId, result.score);
        this.prepCustomerId = null;
        // Into the wallet (the wallet display updates itself from the state).
        setGameState(this, earnLeaves(getGameState(this), payment.total));
        this.day = { ...this.day, stats: recordServe(this.day.stats, result.score, payment) };
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

  private drawTiles(): void {
    // One Graphics object for the whole static floor: far cheaper than
    // hundreds of separate rectangle objects, and it never changes.
    const g = this.add.graphics();
    this.layout.tiles.forEach((row, y) => {
      row.forEach((tile, x) => {
        const { x: px, y: py } = this.tileToPixel({ x, y });
        // Checkerboard floor makes the tile grid readable before real art.
        const checker = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        const color = tile === 'floor' ? checker : TILE_COLORS[tile];
        g.fillStyle(color);
        g.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      });
    });

    // Mark where customers stand to order.
    const spot = this.tileToPixel(this.layout.orderSpot);
    g.fillStyle(COLORS.orderSpot);
    g.fillRect(spot.x + 3, spot.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);

    // Small dots where the counter queue forms.
    for (const linePoint of this.layout.queueSpots) {
      const p = this.tileToPixel(linePoint);
      g.fillRect(p.x + 6, p.y + 6, 4, 4);
    }
  }

  /**
   * Placeholder player: a blue critter with a cream apron. Drawn once inside
   * a Container at local (0, 0)-(16, 16), so moving it is just setPosition.
   */
  private createPlayerSprite(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(COLORS.player);
    g.fillRect(3, 1, 10, 14);
    g.fillStyle(COLORS.apron);
    g.fillRect(5, 8, 6, 6);
    g.fillStyle(COLORS.ink);
    g.fillRect(5, 4, 2, 2);
    g.fillRect(9, 4, 2, 2);
    // Depth: draw the player above customers when they overlap.
    return this.add.container(0, 0, [g]).setDepth(10);
  }

  /**
   * Messes and plates, each drawn on the half of the table facing its seat.
   * Messes are per seat, so a table can be messy on one side and in use on
   * the other.
   */
  private drawTableOverlay(): void {
    const g = this.tableOverlay;
    g.clear(); // cheap: a handful of tables, redrawn from scratch each frame

    for (const table of this.layout.tables) {
      for (const seat of messySeatsAt(this.floor, table)) {
        const { x, y } = this.seatSideCenter(table.position, seat);
        // Placeholder crumbs-and-spill splat, about 6x6 px.
        g.fillStyle(COLORS.mess);
        g.fillRect(x - 3, y - 2, 5, 4);
        g.fillRect(x, y - 3, 3, 3);
        g.fillStyle(COLORS.messLight);
        g.fillRect(x + 1, y + 1, 2, 2);
        g.fillRect(x - 3, y + 2, 1, 1);
      }
    }

    for (const c of this.floor.customers) {
      if (c.phase !== 'eating' || !c.seat) continue;
      const table = tableById(this.layout, c.seat.tableId);
      const { x, y } = this.seatSideCenter(table.position, c.seat.seat);
      g.fillStyle(COLORS.plate);
      g.fillRect(x - 3, y - 3, 6, 6);
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
    const progress = cleaningProgress(this.player);
    if (progress === null || !this.player.cleaning) return;

    const table = tableById(this.layout, this.player.cleaning.tableId);
    const { x, y } = this.tileToPixel(table.position);
    const barWidth = TILE_SIZE - 2;
    g.fillStyle(COLORS.ink);
    g.fillRect(x + 1, y - 5, barWidth, 4);
    g.fillStyle(COLORS.serve);
    // Math.floor: whole-pixel widths keep the bar crisp as it fills.
    g.fillRect(x + 2, y - 4, Math.floor((barWidth - 2) * progress), 2);
  }

  /**
   * A small bar over each customer still waiting to be served, draining as
   * their patience runs out. On its own layer above the characters.
   */
  private drawPatienceBars(): void {
    const g = this.patienceBars;
    g.clear();
    const width = TILE_SIZE - 4;
    for (const c of this.floor.customers) {
      if (c.phase !== 'queued' && c.phase !== 'ordered') continue;
      // Clamp: if `set patienceSeconds` lowers the max mid-game, don't overflow.
      const fraction = Phaser.Math.Clamp(c.patience / FLOOR_CONFIG.patienceSeconds, 0, 1);
      const { x, y } = this.walkerToPixel(c.walker);
      g.fillStyle(COLORS.ink);
      g.fillRect(x + 2, y - 4, width, 3);
      g.fillStyle(patienceColor(fraction));
      // Math.ceil so a nearly-empty bar still shows one pixel until it hits 0.
      g.fillRect(x + 3, y - 3, Math.ceil((width - 2) * fraction), 1);
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
      sprite.body.setPosition(pos.x, pos.y);
      // Above the patience bar, which sits just over the head.
      sprite.label.setPosition(pos.x + TILE_SIZE / 2, pos.y - 5);

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

  /** Placeholder customer: a round-eared critter, fur colour picked by id. */
  private createCustomerSprite(id: number): CustomerSprite {
    const g = this.add.graphics();
    g.fillStyle(furColor(id));
    g.fillRect(2, 0, 4, 4); // ears
    g.fillRect(10, 0, 4, 4);
    g.fillRect(3, 3, 10, 12); // body
    g.fillStyle(COLORS.ink);
    g.fillRect(5, 6, 2, 2); // eyes
    g.fillRect(9, 6, 2, 2);
    const body = this.add.container(0, 0, [g]).setDepth(5);
    // Status text above the head (see statusLabel), on a layer above every
    // character (depth 15: over the player at 10, under the progress bar at
    // 20), with a dark outline so it reads on any floor colour.
    const label = this.add
      .text(0, 0, '', { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(15);
    return { body, label };
  }
}
