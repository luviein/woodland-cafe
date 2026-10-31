import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { LOCATION_IDS, LOCATIONS, MAP_PATHS, type LocationId } from '../data/locations';
import { startNextDay } from '../logic/gameState';
import type { Point } from '../logic/layout';
import { chooseLocation, dotsAlong } from '../logic/worldMap';
import { Button } from '../ui/Button';
import { COLORS, TEXT, css } from '../ui/theme';
import { drawStall, drawTree } from '../ui/sprites';
import { WalletDisplay } from '../ui/WalletDisplay';
import { getGameState, setGameState, watchGameState } from './gameStore';

/** What a location's scene is started with. */
export interface LocationRequest {
  location: LocationId;
}

/** What opens the map: which place the player is leaving from (highlighted). */
export interface WorldMapRequest {
  current: LocationId;
}

/** Signposts sit this far above their landmark's centre. */
const SIGN_OFFSET_Y = 44;
const SIGN_HEIGHT = 22;

/** Purely decorative trees around the island (the forest draws its own). */
const TREES: readonly Point[] = [
  { x: 96, y: 228 }, { x: 120, y: 262 }, { x: 226, y: 288 }, { x: 410, y: 292 },
  { x: 540, y: 236 }, { x: 566, y: 196 }, { x: 392, y: 84 }, { x: 266, y: 70 },
];

/**
 * The world map: a woodland island with the places the player can go
 * (GAME_DESIGN.md §5.2). Opened with "Exit cafe" at the end of a day.
 * Tapping a signpost goes there; the Cafe starts the next day.
 *
 * Placeholder shapes for now: the illustrated island arrives with the art
 * (milestone 10). Places come from data/locations.ts.
 */
export class WorldMapScene extends Phaser.Scene {
  private request!: WorldMapRequest;

  constructor() {
    super('WorldMapScene');
  }

  init(request: WorldMapRequest): void {
    this.request = request;
  }

  create(): void {
    this.drawIsland();
    this.drawPaths();
    const trees = this.add.graphics();
    for (const point of TREES) drawTree(trees, point.x, point.y);
    for (const id of LOCATION_IDS) {
      this.drawLandmark(id);
      this.createSignpost(id);
    }

    const wallet = new WalletDisplay(this, 8, 8);
    watchGameState(this, (state) => wallet.setLeaves(state.leaves));
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 10, 'Tap a signpost to go there', {
        ...TEXT.label,
        stroke: css(COLORS.ink),
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
  }

  private go(id: LocationId): void {
    const choice = chooseLocation(id);
    const sign = this.signPosition(id);
    if (choice === 'locked') return this.showFloatingText(sign, 'Locked');
    if (choice === 'notBuilt') return this.showFloatingText(sign, 'Coming soon!');

    // The cafe starts a new day, which can't be undone: ask first.
    if (id === 'cafe') return this.confirmNextDay();
    this.enter(id);
  }

  private enter(id: LocationId): void {
    // start() stops this scene and starts the other one fresh. The place id
    // goes along, so one scene (OutdoorScene) can serve several places.
    const request: LocationRequest = { location: id };
    this.scene.start(LOCATIONS[id].scene!, request);
  }

  /**
   * "Start Day N at the cafe?" with Open cafe / Decorate / Not yet (Enter /
   * D / Esc). Decorating doesn't start the day: it comes back to the map.
   * Built on demand and destroyed on "Not yet"; the dim layer underneath
   * takes taps, so the signposts can't be pressed while it's open.
   */
  private confirmNextDay(): void {
    const nextDay = getGameState(this).day + 1;
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;
    const width = 380;
    const height = 130;
    const top = cy - height / 2;

    const dim = this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.5).setOrigin(0).setInteractive();
    const panel = this.add.rectangle(cx, cy, width, height, COLORS.paper).setStrokeStyle(3, COLORS.ink);
    const title = this.add.text(cx, top + 18, `Start Day ${nextDay} at the cafe?`, TEXT.heading).setOrigin(0.5, 0);
    const note = this.add
      .text(cx, top + 44, 'Forage spots grow back and new leaves fall.', TEXT.body)
      .setOrigin(0.5, 0);
    const open = new Button(this, cx - 120, top + height - 30, 110, 30, 'Open cafe', COLORS.serve, () => {
      // Going back to the cafe opens it for the next day (GAME_DESIGN.md §5.3).
      setGameState(this, startNextDay(getGameState(this)));
      this.enter('cafe');
    });
    // Arranging tables and chairs (GAME_DESIGN.md §5.7); only between days.
    const decorate = new Button(this, cx, top + height - 30, 110, 30, 'Decorate', COLORS.book, () =>
      this.scene.start('DecorateScene'),
    );
    const notYet = new Button(this, cx + 120, top + height - 30, 110, 30, 'Not yet', COLORS.reset, () => close());

    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter') open.press();
      else if (event.key === 'd' || event.key === 'D') decorate.press();
      // Not notYet.press(): its 80ms un-press flash would fire on a destroyed button.
      else if (event.key === 'Escape') close();
    };
    const close = () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
      for (const o of [dim, panel, title, note, open, decorate, notYet]) o.destroy();
    };
    for (const o of [dim, panel, title, note, open, decorate, notYet]) o.setDepth(100);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
  }

  /** Water, a sandy shore, then grass on top. */
  private drawIsland(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2 + 4;
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.water).setOrigin(0);
    // A few lighter ripples, so the water doesn't read as a flat background.
    const ripples = this.add.graphics().fillStyle(COLORS.waterLight);
    for (const [x, y] of [[40, 40], [590, 60], [60, 320], [600, 316], [300, 20]]) ripples.fillRect(x, y, 14, 2);

    this.add.ellipse(cx, cy, 560, 300, COLORS.sand);
    this.add.ellipse(cx, cy, 536, 276, COLORS.grass);
    // A darker patch under the forest.
    const { x, y } = LOCATIONS.forest.position;
    this.add.ellipse(x, y + 6, 150, 90, COLORS.grassDark);
  }

  private drawPaths(): void {
    const g = this.add.graphics().fillStyle(COLORS.paper);
    for (const [a, b] of MAP_PATHS) {
      for (const dot of dotsAlong(LOCATIONS[a].position, LOCATIONS[b].position, 10, 30)) {
        g.fillRect(Math.round(dot.x) - 1, Math.round(dot.y) - 1, 3, 3);
      }
    }
  }

  /** Placeholder landmark for each place; real art replaces these later. */
  private drawLandmark(id: LocationId): void {
    const { x, y } = LOCATIONS[id].position;
    const g = this.add.graphics();
    switch (id) {
      case 'cafe':
        // A little house: walls, door, roof.
        g.fillStyle(COLORS.paper).fillRect(x - 22, y - 8, 44, 28);
        g.fillStyle(COLORS.treeTrunk).fillRect(x - 5, y + 6, 10, 14);
        g.fillStyle(COLORS.roof).fillTriangle(x - 28, y - 6, x + 28, y - 6, x, y - 28);
        break;
      case 'forest':
        for (const [dx, dy, size] of [[-30, 4, 1.2], [0, -10, 1.4], [28, 6, 1.2], [-12, 18, 1], [14, 20, 1]]) {
          drawTree(g, x + dx, y + dy, size);
        }
        break;
      case 'marketplace':
        drawStall(g, x - 22, y);
        drawStall(g, x + 22, y);
        break;
    }
  }

  /** The clickable signpost: a post and a board, green for where the player is. */
  private createSignpost(id: LocationId): void {
    const location = LOCATIONS[id];
    const here = id === this.request.current;
    const { x, y } = this.signPosition(id);
    const text = location.locked ? `🔒 ${location.name}` : location.name;
    // About 8px per character in the 16px button font, plus some padding.
    const width = text.length * 9 + 16;

    this.add.rectangle(x, y + SIGN_HEIGHT / 2 + 5, 4, 10, COLORS.treeTrunk); // the post
    const sign = new Button(this, x, y, width, SIGN_HEIGHT, text, here ? COLORS.signpostHere : COLORS.signpost, () =>
      this.go(id),
    );
    sign.setDepth(10);
    if (here) {
      this.add
        .text(x, y - SIGN_HEIGHT / 2 - 2, 'You are here', { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
        .setOrigin(0.5, 1)
        .setDepth(10);
    }
  }

  private signPosition(id: LocationId): Point {
    const { x, y } = LOCATIONS[id].position;
    return { x, y: y - SIGN_OFFSET_Y };
  }

  /** Same idea as on the floor: a short message that drifts up and fades. */
  private showFloatingText(at: Point, message: string): void {
    const text = this.add
      .text(at.x, at.y - SIGN_HEIGHT / 2 - 16, message, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.tweens.add({
      targets: text,
      y: text.y - 12,
      alpha: 0,
      delay: 600,
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }
}
