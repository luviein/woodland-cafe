import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { devSettings } from '../debug/devSettings';
import {
  cleanSeats,
  createFloorState,
  messySeatsAt,
  stepFloor,
  type Customer,
  type FloorState,
} from '../logic/floor';
import { parseLayout, tableById, type Layout, type Point, type TileKind } from '../logic/layout';
import { cleaningProgress, createPlayer, stepPlayer, tapTile, type PlayerState } from '../logic/player';
import { destination, isMoving, walkerPosition, type Walker } from '../logic/walker';
import { Button } from '../ui/Button';
import { COLORS, TEXT } from '../ui/theme';

interface CustomerSprite {
  body: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

/**
 * Little hint above a customer's head so you can tell what they're doing:
 * "..." ordering, "?" waiting for a seat, "?!" running out of patience,
 * "!!" leaving upset.
 */
function statusLabel(c: Customer): string {
  switch (c.phase) {
    case 'ordering':
      return '...';
    case 'waitingForSeat':
      return c.timer < FLOOR_CONFIG.seatWaitSeconds / 3 ? '?!' : '?';
    case 'leaving':
      return c.upset ? '!!' : '';
    default:
      return '';
  }
}

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
  /** Messes and plates on tables; redrawn every frame from the floor state. */
  private tableOverlay!: Phaser.GameObjects.Graphics;
  /** Drawn above all characters (depth 20) so nobody can cover it. */
  private progressBar!: Phaser.GameObjects.Graphics;
  /** One sprite per customer id, created and destroyed as customers come and go. */
  private customerSprites = new Map<number, CustomerSprite>();

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

    this.floor = createFloorState();
    // Map entries point at the previous run's destroyed sprites if the scene
    // restarts, so start with a fresh map.
    this.customerSprites = new Map();

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
        if (over.length > 0) return;
        this.onTileTapped(this.pixelToTile(pointer.worldX, pointer.worldY));
      },
    );

    // TEMPORARY (milestone 3 replaces this with walking up to the counter).
    new Button(this, 64, 20, 112, 28, 'Prep >', COLORS.book, () => this.scene.start('PrepScene'));
  }

  update(_time: number, deltaMs: number): void {
    const seconds = deltaMs / 1000;

    // Player first, so a table cleaned this frame can seat someone this frame.
    const { player, cleanedSeats } = stepPlayer(this.player, this.floor, seconds);
    this.player = player;
    if (cleanedSeats.length > 0) this.floor = cleanSeats(this.floor, cleanedSeats);

    // Dev console "speed" command scales time for the critters only; the
    // player keeps walking at normal speed.
    this.floor = stepFloor(this.floor, this.layout, seconds * devSettings.floorTimeScale);
    this.drawTableOverlay();
    this.drawProgressBar();
    this.syncCustomerSprites();

    const pos = this.walkerToPixel(this.player.walker);
    this.playerSprite.setPosition(pos.x, pos.y);
    if (!isMoving(this.player.walker) && !this.player.cleaning) {
      this.destinationMarker.setVisible(false);
    }
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

    // Small dots where the waiting line forms.
    for (const linePoint of this.layout.waitingLine) {
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
   * Keeps one sprite per customer in the floor state: creates sprites for
   * new arrivals, moves existing ones, destroys those who left. The floor
   * state is the source of truth; sprites just mirror it.
   */
  private syncCustomerSprites(): void {
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
      sprite.label.setText(statusLabel(c));
    }
    for (const [id, sprite] of this.customerSprites) {
      if (!present.has(id)) {
        sprite.body.destroy();
        this.customerSprites.delete(id);
      }
    }
  }

  /** Placeholder customer: a round-eared critter, fur colour picked by id. */
  private createCustomerSprite(id: number): CustomerSprite {
    const fur = COLORS.customerFur[id % COLORS.customerFur.length];
    const g = this.add.graphics();
    g.fillStyle(fur);
    g.fillRect(2, 0, 4, 4); // ears
    g.fillRect(10, 0, 4, 4);
    g.fillRect(3, 3, 10, 12); // body
    g.fillStyle(COLORS.ink);
    g.fillRect(5, 6, 2, 2); // eyes
    g.fillRect(9, 6, 2, 2);
    // Small status text above the head; see statusLabel().
    const label = this.add.text(8, -2, '', TEXT.label).setOrigin(0.5, 1);
    const body = this.add.container(0, 0, [g, label]).setDepth(5);
    return { body, label };
  }
}
