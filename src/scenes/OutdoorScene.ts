import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { LOCATIONS } from '../data/locations';
import { OUTDOOR_AREAS, OUTDOOR_ENTRY, OUTDOOR_WALK_AREA, isOutdoor, type OutdoorLocationId } from '../data/outdoorAreas';
import type { ForageSpotDef } from '../data/forageSpots';
import { INGREDIENTS } from '../data/ingredients';
import { LEAF_CONFIG } from '../data/leafConfig';
import { SHOPS, STOCK_BUY_AMOUNTS, TOOLS_ON_SALE, type ShopId } from '../data/shops';
import { UPGRADES } from '../data/upgrades';
import { FURNITURE, FURNITURE_KINDS } from '../data/furniture';
import { EMPLOYEE_ROLES, EMPLOYEES } from '../data/employees';
import { hire, isHired, letGo } from '../logic/employees';
import { leavesLeftToday, pickUpLeaves } from '../logic/gameState';
import {
  forage,
  gatheredToday,
  gatheringProgress,
  spotsAt,
  standPoint,
  startGathering,
  stepGathering,
  type Gathering,
} from '../logic/foraging';
import type { Point } from '../logic/layout';
import { collectLeaves, createLeafField, stepLeafField, type LeafField, type LeafGround } from '../logic/leafPickups';
import { createMover, stepMover, walkToward, type Mover } from '../logic/outdoor';
import {
  buyFurniture,
  buyStock,
  buyUpgrade,
  canBuyFurniture,
  canBuyStock,
  canBuyUpgrade,
  canUnlock,
  newRecipesWith,
  shopStandPoint,
  shopsAt,
  unlockableIngredients,
  unlockIngredient,
} from '../logic/shop';
import { Button } from '../ui/Button';
import { ShopPanel, type ShopRowView } from '../ui/ShopPanel';
import {
  STALL_HEIGHT,
  TREE_TRUNK_HEIGHT,
  createPlayerSprite,
  drawBerryBush,
  drawLeaf,
  drawMushroomPatch,
  drawStall,
  drawTree,
} from '../ui/sprites';
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
  /** Forage spots here, their sprites (by spot id), and what the player is gathering. */
  private spots: ForageSpotDef[] = [];
  private spotSprites = new Map<string, Phaser.GameObjects.Graphics>();
  private gathering: Gathering | null = null;
  private progressBar!: Phaser.GameObjects.Graphics;
  /** Shop stalls here, the one the player is walking to, and the open panel. */
  private shops: ShopId[] = [];
  private walkingToShop: ShopId | null = null;
  private shop: { id: ShopId; panel: ShopPanel } | null = null;
  /** "Leaves today: 6/15", and the line shown once the day's leaves are gone. */
  private leafCount!: Phaser.GameObjects.Text;
  private bareGround!: Phaser.GameObjects.Text;

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
    // That needs one Graphics per tree (and stall) rather than one for all of them.
    for (const t of area.trees) {
      drawTree(this.add.graphics().setDepth(t.y + TREE_TRUNK_HEIGHT * TREE_SIZE), t.x, t.y, TREE_SIZE);
    }
    this.createForageSpots();
    this.createShops();
    this.progressBar = this.add.graphics().setDepth(HUD_DEPTH);

    // A fresh field each visit: leaves don't wait for you while you're away.
    this.leafGround = {
      area: OUTDOOR_WALK_AREA,
      keepClear: [
        ...area.trees.map((t) => ({ x: t.x, y: t.y + TREE_TRUNK_HEIGHT * TREE_SIZE })),
        ...this.shops.map((id) => ({ x: SHOPS[id].stall.x, y: SHOPS[id].stall.y + STALL_HEIGHT })),
        ...this.spots.map((s) => s.position),
      ],
      clearance: LEAF_CLEARANCE,
    };
    this.leafField = createLeafField(this.leafGround, Math.random, LEAF_CONFIG, leavesLeftToday(getGameState(this)));
    // Map entries would point at destroyed sprites from the last visit.
    this.leafSprites = new Map();

    this.player = createMover(OUTDOOR_ENTRY);
    this.playerSprite = createPlayerSprite(this);
    // Small ring where the player is heading; hidden when standing still.
    // Depth 1: on the ground, under everything standing on it.
    this.marker = this.add.circle(0, 0, 5).setStrokeStyle(2, COLORS.apron).setVisible(false).setDepth(1);

    // Top strip: wallet, place name, and the way back.
    const wallet = new WalletDisplay(this, 8, 8).setDepth(HUD_DEPTH);
    const hudText = { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 };
    this.leafCount = this.add.text(8, 34, '', hudText).setDepth(HUD_DEPTH);
    this.bareGround = this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT - 10, 'The ground is bare. Come back tomorrow!', hudText)
      .setOrigin(0.5, 1)
      .setDepth(HUD_DEPTH)
      .setVisible(false);
    watchGameState(this, (state) => {
      wallet.setLeaves(state.leaves);
      this.leafCount.setText(`Leaves today: ${state.leavesPickedToday}/${LEAF_CONFIG.leavesPerDay}`);
      this.redrawSpots();
      if (this.shop) this.shop.panel.setRows(this.shopRows(this.shop.id));
    });
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
        if (over.length > 0) return; // a button's, forage spot's or stall's tap, not a walk
        this.gathering = null; // walking off cancels gathering, like cleaning on the floor
        this.walkingToShop = null;
        this.walkTo({ x: pointer.worldX, y: pointer.worldY });
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

    if (this.gathering) {
      const step = stepGathering(this.gathering, this.player, deltaMs / 1000);
      const spot = this.spots.find((s) => s.id === this.gathering!.spotId)!;
      this.gathering = step.gathering;
      if (step.finished) this.finishGathering(spot);
    }
    this.drawProgressBar();
    if (this.walkingToShop && !this.player.target) {
      this.openShop(this.walkingToShop);
      this.walkingToShop = null;
    }

    const leftToday = leavesLeftToday(getGameState(this));
    this.leafField = stepLeafField(this.leafField, deltaMs / 1000, this.leafGround, Math.random, LEAF_CONFIG, leftToday);
    const picked = collectLeaves(this.leafField, this.player.position);
    this.leafField = picked.field;
    if (picked.collected.length > 0) {
      setGameState(this, pickUpLeaves(getGameState(this), picked.collected.length));
      for (const leaf of picked.collected) this.showFloatingText(leaf.position, '+1 🍃');
    }
    this.syncLeafSprites();
    // Only once the last one is picked up: until then, there's still a leaf to find.
    this.bareGround.setVisible(leavesLeftToday(getGameState(this)) === 0 && this.leafField.leaves.length === 0);
  }

  private walkTo(point: Point): void {
    this.player = walkToward(this.player, point, OUTDOOR_WALK_AREA);
    this.marker.setPosition(this.player.target!.x, this.player.target!.y).setVisible(true);
  }

  /** A sprite and a tap area for each forage spot in this place. */
  private createForageSpots(): void {
    this.spots = spotsAt(this.location);
    this.spotSprites = new Map();
    this.gathering = null;
    for (const spot of this.spots) {
      const { x, y } = spot.position;
      // Depth sorted by its base, like the trees.
      this.spotSprites.set(spot.id, this.add.graphics({ x, y }).setDepth(y));
      // A bit bigger than the drawing, so it's easy to tap on a phone.
      this.add
        .zone(x, y - 8, 32, 28)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onSpotTapped(spot));
    }
    this.redrawSpots();
  }

  /** Full or bare, from the game state (called whenever it changes). */
  private redrawSpots(): void {
    const state = getGameState(this);
    for (const spot of this.spots) {
      const g = this.spotSprites.get(spot.id);
      if (!g) continue; // watchGameState fires once before the spots exist
      g.clear();
      const full = !gatheredToday(state, spot);
      if (spot.kind === 'mushroomPatch') drawMushroomPatch(g, full);
      else drawBerryBush(g, full);
    }
  }

  private onSpotTapped(spot: ForageSpotDef): void {
    if (gatheredToday(getGameState(this), spot)) {
      this.showFloatingText(spot.position, 'Grows back tomorrow');
      return;
    }
    this.walkingToShop = null;
    this.gathering = startGathering(spot);
    this.walkTo(standPoint(spot));
  }

  /** A stall, its name sign and a tap area for each shop in this place. */
  private createShops(): void {
    this.shops = shopsAt(this.location);
    this.walkingToShop = null;
    this.shop = null;
    for (const id of this.shops) {
      const { x, y } = SHOPS[id].stall;
      drawStall(this.add.graphics().setDepth(y + STALL_HEIGHT), x, y);
      this.add
        .text(x, y - 12, SHOPS[id].name, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
        .setOrigin(0.5, 1)
        .setDepth(y + STALL_HEIGHT);
      // Covers the awning and counter (36x26), plus a bit, for fingers.
      this.add
        .zone(x, y + 2, 44, 34)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onShopTapped(id));
    }
  }

  /** Walk up to the counter; the panel opens on arrival (see update()). */
  private onShopTapped(id: ShopId): void {
    if (this.shop) return; // a panel is already open (its dim layer should catch this anyway)
    this.gathering = null;
    this.walkingToShop = id;
    this.walkTo(shopStandPoint(id));
  }

  private openShop(id: ShopId): void {
    const panel = new ShopPanel(this, SHOPS[id].name, SHOPS[id].blurb, this.shopRows(id), () => this.closeShop());
    // Above the HUD, so its dim layer covers the Map button too.
    this.shop = { id, panel: panel.setDepth(HUD_DEPTH + 1) };
  }

  private closeShop(): void {
    // Destroyed once the Close tap is over: removing the button inside its
    // own pointer-up handler would pull it out from under Phaser's input loop.
    const panel = this.shop?.panel;
    this.shop = null;
    this.time.delayedCall(0, () => panel?.destroy());
  }

  /** What the open shop shows, from the current game state. */
  private shopRows(id: ShopId): ShopRowView[] {
    const state = getGameState(this);
    if (id === 'specialty') {
      // Every unlockable stays listed once bought, so the rows keep their
      // shape (ShopPanel.setRows) and the player sees what they own.
      return unlockableIngredients().map((ingredient) => {
        const owned = state.ingredients.includes(ingredient);
        const recipes = newRecipesWith(state, ingredient);
        return {
          name: INGREDIENTS[ingredient].name,
          detail: owned
            ? 'Owned: stock at Pantry'
            : `🍃${INGREDIENTS[ingredient].unlockPrice}   +${recipes} recipe${recipes === 1 ? '' : 's'}`,
          buttons: [
            {
              label: owned ? '-' : 'Buy',
              enabled: canUnlock(state, ingredient),
              onPress: () => setGameState(this, unlockIngredient(getGameState(this), ingredient)),
            },
          ],
        };
      });
    }
    if (id === 'noticeBoard') {
      return EMPLOYEE_ROLES.map((role) => {
        const hired = isHired(state, role);
        const { does, wage } = EMPLOYEES[role];
        return {
          name: EMPLOYEES[role].name,
          detail: `${hired ? 'Hired' : does}   🍃${wage}/day`,
          buttons: [
            {
              label: hired ? 'Let go' : 'Hire',
              enabled: true,
              onPress: () => {
                const now = getGameState(this);
                setGameState(this, isHired(now, role) ? letGo(now, role) : hire(now, role));
              },
            },
          ],
        };
      });
    }
    if (id === 'carpenter') {
      return FURNITURE_KINDS.map((kind) => ({
        name: FURNITURE[kind].name,
        detail: `🍃${FURNITURE[kind].price}   stored: ${state.furniture.stored[kind]}`,
        buttons: [
          {
            label: '+1',
            enabled: canBuyFurniture(state, kind),
            onPress: () => setGameState(this, buyFurniture(getGameState(this), kind)),
          },
        ],
      }));
    }
    if (id === 'tools') {
      return TOOLS_ON_SALE.map((upgrade) => {
        const owned = state.upgrades.includes(upgrade);
        return {
          name: UPGRADES[upgrade].name,
          detail: owned ? 'Owned' : `🍃${UPGRADES[upgrade].price}   ${UPGRADES[upgrade].effect}`,
          buttons: [
            {
              label: owned ? '-' : 'Buy',
              enabled: canBuyUpgrade(state, upgrade),
              onPress: () => setGameState(this, buyUpgrade(getGameState(this), upgrade)),
            },
          ],
        };
      });
    }
    return state.ingredients.map((ingredient) => ({
      name: INGREDIENTS[ingredient].name,
      detail: `x${state.stock[ingredient]}   🍃${INGREDIENTS[ingredient].unitPrice} each`,
      buttons: STOCK_BUY_AMOUNTS.map((amount) => ({
        label: `+${amount}`,
        enabled: canBuyStock(state, ingredient, amount),
        onPress: () => setGameState(this, buyStock(getGameState(this), ingredient, amount)),
      })),
    }));
  }

  private finishGathering(spot: ForageSpotDef): void {
    setGameState(this, forage(getGameState(this), spot));
    this.showFloatingText(spot.position, `+${spot.amount} ${INGREDIENTS[spot.ingredient].name}`);
  }

  /** Over the spot being gathered, filling up while the player works. */
  private drawProgressBar(): void {
    const g = this.progressBar;
    g.clear();
    if (!this.gathering) return;
    const progress = gatheringProgress(this.gathering, this.player);
    if (progress === null) return;
    const spot = this.spots.find((s) => s.id === this.gathering!.spotId)!;
    const x = spot.position.x - 10;
    const y = spot.position.y - 30;
    g.fillStyle(COLORS.ink).fillRect(x, y, 20, 4);
    // Math.floor: whole-pixel widths keep the bar crisp as it fills.
    g.fillStyle(COLORS.serve).fillRect(x + 1, y + 1, Math.floor(18 * progress), 2);
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

  /** A short message drifting up from a spot, e.g. "+1 🍃" where a leaf was picked up. */
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
