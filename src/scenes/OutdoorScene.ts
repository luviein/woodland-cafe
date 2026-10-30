import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { LOCATIONS } from '../data/locations';
import { OUTDOOR_AREAS, OUTDOOR_ENTRY, OUTDOOR_WALK_AREA, isOutdoor, type OutdoorLocationId } from '../data/outdoorAreas';
import { earnLeaves } from '../logic/gameState';
import type { Point } from '../logic/layout';
import { collectLeaves, createLeafField, stepLeafField, type LeafField, type LeafGround } from '../logic/leafPickups';
import { createMover, stepMover, walkToward, type Mover } from '../logic/outdoor';
import { Button } from '../ui/Button';
import { STALL_HEIGHT, TREE_TRUNK_HEIGHT, createPlayerSprite, drawLeaf, drawStall, drawTree } from '../ui/sprites';
import { COLORS, TEXT, css } from '../ui/theme';
import { WalletDisplay } from '../ui/WalletDisplay';
import { getGameState, setGameState, watchGameState } from './gameStore';
import type { LocationRequest, WorldMapRequest } from './WorldMapScene';

/** Half the player sprite (16x16): the mover's position is the sprite's centre. */
const HALF = TILE_SIZE / 2;
const TREE_SIZE = 1.4;
/** Above all the y-sorted scenery (whose depths are at most the screen height). */
const HUD_DEPTH = 1000;
/**
 * Leaves don't land this close to a tree's or stall's base, where they would
 * be hidden behind it. (A tree's leafy top is ~14px wide each side.)
 */
const LEAF_CLEARANCE = 22;

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
  /** Leaves on the ground (plain data) and their sprites, matched by leaf id. */
  private leafField!: LeafField;
  private leafGround!: LeafGround;
  private leafSprites = new Map<number, Phaser.GameObjects.Graphics>();

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
    // Depth sorting by y: everything's depth is the y of its base, where it
    // touches the ground, and higher depths draw on top. Something lower on
    // the screen is nearer the viewer, so the player walking behind a tree
    // (feet above its base) is hidden by it, and in front of it covers it.
    // That needs one Graphics per tree/stall rather than one for all of them.
    for (const t of area.trees) {
      drawTree(this.add.graphics().setDepth(t.y + TREE_TRUNK_HEIGHT * TREE_SIZE), t.x, t.y, TREE_SIZE);
    }
    for (const s of area.stalls) drawStall(this.add.graphics().setDepth(s.y + STALL_HEIGHT), s.x, s.y);

    // A fresh field each visit: leaves don't wait for you while you're away.
    this.leafGround = {
      area: OUTDOOR_WALK_AREA,
      keepClear: [
        ...area.trees.map((t) => ({ x: t.x, y: t.y + TREE_TRUNK_HEIGHT * TREE_SIZE })),
        ...area.stalls.map((s) => ({ x: s.x, y: s.y + STALL_HEIGHT })),
      ],
      clearance: LEAF_CLEARANCE,
    };
    this.leafField = createLeafField(this.leafGround, Math.random);
    // Map entries would point at destroyed sprites from the last visit.
    this.leafSprites = new Map();

    this.player = createMover(OUTDOOR_ENTRY);
    this.playerSprite = createPlayerSprite(this);
    // Small ring where the player is heading; hidden when standing still.
    // Depth 1: on the ground, under everything standing on it.
    this.marker = this.add.circle(0, 0, 5).setStrokeStyle(2, COLORS.apron).setVisible(false).setDepth(1);

    // Top strip: wallet, place name, and the way back.
    const wallet = new WalletDisplay(this, 8, 8).setDepth(HUD_DEPTH);
    watchGameState(this, (state) => wallet.setLeaves(state.leaves));
    this.add
      .text(BASE_WIDTH / 2, 10, LOCATIONS[this.location].name, {
        ...TEXT.heading,
        color: css(COLORS.paper),
        stroke: css(COLORS.ink),
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH);
    new Button(this, BASE_WIDTH - 48, 20, 80, 28, 'Map', COLORS.book, () => this.backToMap()).setDepth(HUD_DEPTH);

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
    const { x, y } = this.player.position;
    this.playerSprite.setPosition(x - HALF, y - HALF);
    this.playerSprite.setDepth(y + HALF); // its feet, for the depth sorting in create()
    if (!this.player.target) this.marker.setVisible(false);

    this.leafField = stepLeafField(this.leafField, deltaMs / 1000, this.leafGround, Math.random);
    const picked = collectLeaves(this.leafField, this.player.position);
    this.leafField = picked.field;
    if (picked.collected.length > 0) {
      setGameState(this, earnLeaves(getGameState(this), picked.collected.length));
      for (const leaf of picked.collected) this.showFloatingText(leaf.position, '+1 🍃');
    }
    this.syncLeafSprites();
  }

  /** One sprite per leaf on the ground: new leaves get one, picked-up ones lose theirs. */
  private syncLeafSprites(): void {
    const onGround = new Set(this.leafField.leaves.map((l) => l.id));
    for (const [id, sprite] of this.leafSprites) {
      if (!onGround.has(id)) {
        sprite.destroy();
        this.leafSprites.delete(id);
      }
    }
    for (const leaf of this.leafField.leaves) {
      if (this.leafSprites.has(leaf.id)) continue;
      const sprite = this.add.graphics({ x: leaf.position.x, y: leaf.position.y });
      drawLeaf(sprite);
      // Lying flat on the ground: under anything standing near it. Then a
      // little rocking, so it catches the eye on the grass.
      sprite.setDepth(2).setAngle(-15);
      this.tweens.add({ targets: sprite, angle: 15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.leafSprites.set(leaf.id, sprite);
    }
  }

  /** "+1 🍃" drifting up from where a leaf was picked up. */
  private showFloatingText(at: Point, message: string): void {
    const text = this.add
      .text(at.x, at.y - 8, message, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(HUD_DEPTH);
    this.tweens.add({ targets: text, y: text.y - 16, alpha: 0, duration: 800, onComplete: () => text.destroy() });
  }

  private backToMap(): void {
    const request: WorldMapRequest = { current: this.location };
    this.scene.start('WorldMapScene', request);
  }
}
