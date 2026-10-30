import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { LOCATIONS } from '../data/locations';
import { OUTDOOR_AREAS, OUTDOOR_ENTRY, OUTDOOR_WALK_AREA, isOutdoor, type OutdoorLocationId } from '../data/outdoorAreas';
import { createMover, stepMover, walkToward, type Mover } from '../logic/outdoor';
import { Button } from '../ui/Button';
import { createPlayerSprite, drawStall, drawTree } from '../ui/sprites';
import { COLORS, TEXT, css } from '../ui/theme';
import { WalletDisplay } from '../ui/WalletDisplay';
import { watchGameState } from './gameStore';
import type { LocationRequest, WorldMapRequest } from './WorldMapScene';

/** Half the player sprite (16x16): the mover's position is the sprite's centre. */
const HALF = TILE_SIZE / 2;

/**
 * A grassy outdoor place: Forest or Marketplace. One scene for both, set up
 * from data/outdoorAreas.ts by the place id it's started with. Tap anywhere
 * to walk there; "Map" goes back to the world map.
 */
export class OutdoorScene extends Phaser.Scene {
  private location!: OutdoorLocationId;
  private player!: Mover;
  private playerSprite!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Arc;

  constructor() {
    super('OutdoorScene');
  }

  init(request: LocationRequest): void {
    if (!isOutdoor(request.location)) throw new Error(`OutdoorScene: '${request.location}' is not an outdoor place`);
    this.location = request.location;
  }

  create(): void {
    const area = OUTDOOR_AREAS[this.location];
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS[area.ground]).setOrigin(0);
    const scenery = this.add.graphics();
    for (const t of area.trees) drawTree(scenery, t.x, t.y, 1.4);
    for (const s of area.stalls) drawStall(scenery, s.x, s.y);

    this.player = createMover(OUTDOOR_ENTRY);
    this.playerSprite = createPlayerSprite(this);
    // Small ring where the player is heading; hidden when standing still.
    this.marker = this.add.circle(0, 0, 5).setStrokeStyle(2, COLORS.apron).setVisible(false);

    // Top strip: wallet, place name, and the way back.
    const wallet = new WalletDisplay(this, 8, 8);
    watchGameState(this, (state) => wallet.setLeaves(state.leaves));
    this.add
      .text(BASE_WIDTH / 2, 10, LOCATIONS[this.location].name, {
        ...TEXT.heading,
        color: css(COLORS.paper),
        stroke: css(COLORS.ink),
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    new Button(this, BASE_WIDTH - 48, 20, 80, 28, 'Map', COLORS.book, () => this.backToMap()).setDepth(30);

    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // the Map button's tap, not a walk
        this.player = walkToward(this.player, { x: pointer.worldX, y: pointer.worldY }, OUTDOOR_WALK_AREA);
        this.marker.setPosition(this.player.target!.x, this.player.target!.y).setVisible(true);
      },
    );
  }

  update(_time: number, deltaMs: number): void {
    // Same walking speed as in the cafe (tiles per second, in pixels here).
    this.player = stepMover(this.player, FLOOR_CONFIG.playerSpeed * TILE_SIZE * (deltaMs / 1000));
    this.playerSprite.setPosition(this.player.position.x - HALF, this.player.position.y - HALF);
    if (!this.player.target) this.marker.setVisible(false);
  }

  private backToMap(): void {
    const request: WorldMapRequest = { current: this.location };
    this.scene.start('WorldMapScene', request);
  }
}
