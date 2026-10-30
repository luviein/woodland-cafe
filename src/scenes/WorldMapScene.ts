import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { LOCATION_IDS, LOCATIONS, MAP_PATHS, type LocationId } from '../data/locations';
import { startNextDay } from '../logic/gameState';
import type { Point } from '../logic/layout';
import { chooseLocation, dotsAlong } from '../logic/worldMap';
import { Button } from '../ui/Button';
import { COLORS, TEXT, css } from '../ui/theme';
import { WalletDisplay } from '../ui/WalletDisplay';
import { getGameState, setGameState, watchGameState } from './gameStore';

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
    for (const point of TREES) this.drawTree(point.x, point.y, 1);
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

    // Going back to the cafe opens it for the next day (GAME_DESIGN.md §5.3).
    if (id === 'cafe') setGameState(this, startNextDay(getGameState(this)));
    // start() stops this scene and starts the other one fresh.
    this.scene.start(LOCATIONS[id].scene!);
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
          this.drawTree(x + dx, y + dy, size);
        }
        break;
      case 'marketplace':
        // Two stalls with awnings.
        for (const dx of [-22, 22]) {
          g.fillStyle(COLORS.counter).fillRect(x + dx - 16, y, 32, 16);
          g.fillStyle(COLORS.awning).fillRect(x + dx - 18, y - 10, 36, 10);
          g.fillStyle(COLORS.roof);
          for (let s = 0; s < 36; s += 12) g.fillRect(x + dx - 18 + s, y - 10, 6, 10);
        }
        break;
    }
  }

  private drawTree(x: number, y: number, size: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.treeTrunk).fillRect(x - 2 * size, y, 4 * size, 8 * size);
    g.fillStyle(COLORS.treeLeaf).fillCircle(x, y - 4 * size, 10 * size);
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
