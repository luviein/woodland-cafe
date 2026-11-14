import { activeCropEvent, buySeed } from '../logic/garden';
import { christmasCatalogueShop } from '../ui/christmasCatalogueShop';
import { addChristmasVendor } from '../ui/StallVendor';
import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, GROUND_TILE, TILE_SIZE } from '../config/display';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { LOCATIONS } from '../data/locations';
import { OUTDOOR_AREAS, OUTDOOR_WALK_AREA, isOutdoor, outdoorEntry, type OutdoorLocationId } from '../data/outdoorAreas';
import type { ForageSpotDef } from '../data/forageSpots';
import { INGREDIENTS } from '../data/ingredients';
import { LEAF_CONFIG } from '../data/leafConfig';
import { SHOPS, STOCK_BUY_AMOUNTS, TOOLS_ON_SALE, type ShopId } from '../data/shops';
import { UPGRADES } from '../data/upgrades';
import { FURNITURE, designsSoldBy } from '../data/furniture';
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
  stallBase,
  unlockableIngredients,
  unlockIngredient,
} from '../logic/shop';
import { Button } from '../ui/Button';
import { ShopPanel, type ShopRowView } from '../ui/ShopPanel';
import { SeedShopPanel } from '../ui/SeedShopPanel';
import { CataloguePanel } from '../ui/CataloguePanel';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel, arrangeRule, sizeBox } from '../layout/arrangeable';
import { LeafText } from '../ui/LeafText';
import { TREE_TRUNK_HEIGHT, addGround, addStanding, addTree, createPlayerSprite } from '../ui/sprites';
import { spriteSize } from '../art/pixelSprite';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import { devSettings } from '../debug/devSettings';
import { CHRISTMAS_CATALOGUE } from '../data/furniture';
import { addArt } from '../ui/art';
import { playSound } from '../audio/audio';
import { COLORS, TEXT, css } from '../ui/theme';
import { WalletDisplay } from '../ui/WalletDisplay';
import { getGameState, setGameState, tutorialEvent, watchGameState } from './gameStore';
import { StoryBox, type ArrowTarget } from '../ui/StoryBox';
import { bottomBoxLeft } from '../ui/hudLayout';
import { TIPS } from '../data/tutorial';
import { exploredAll, seeTip } from '../logic/gameState';
import type { LocationRequest, WorldMapRequest } from './WorldMapScene';

/** Half the player sprite (16x16): the mover's position is the sprite's centre. */
const HALF = TILE_SIZE / 2;
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
/** Inside the area the player can walk (OUTDOOR_WALK_AREA). */
function inWalkArea({ x, y }: Point): boolean {
  const a = OUTDOOR_WALK_AREA;
  return x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height;
}

export class OutdoorScene extends Phaser.Scene {
  private location!: OutdoorLocationId;
  private player!: Mover;
  private playerSprite!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Arc;
  /** Leaves on the ground (plain data) and their sprites, matched by leaf id. */
  private leafField!: LeafField;
  private leafGround!: LeafGround;
  private leafSprites = new Map<number, Phaser.GameObjects.Image>();
  /** Forage spots here, their sprites (by spot id), and what the player is gathering. */
  private spots: ForageSpotDef[] = [];
  private spotSprites = new Map<string, Phaser.GameObjects.Image>();
  private gathering: Gathering | null = null;
  private progressBar!: Phaser.GameObjects.Graphics;
  /** Shop stalls here, the one the player is walking to, and the open panel. */
  private shops: ShopId[] = [];
  private walkingToShop: ShopId | null = null;
  /** The open stall: a shop list, or (the Christmas stall) a catalogue. */
  private shop: { id: ShopId; panel: ShopPanel | CataloguePanel | SeedShopPanel } | null = null;
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
    addGround(this, area.ground);
    // Depth sorting by y: everything's depth is the y of its base, where it
    // touches the ground, and higher depths draw on top. Something lower on
    // the screen is nearer the viewer, so the player walking behind a tree
    // (feet above its base) is hidden by it, and in front of it covers it.
    // The Forest mixes oaks and pines; the Marketplace has oaks.
    area.trees.forEach((t, i) => {
      const base = t.y + TREE_TRUNK_HEIGHT;
      const kind = this.location === 'forest' && i % 2 === 1 ? 'pine' : 'oak';
      arrangeable(this, this.location, `tree.${i}`, t, addTree(this, t.x, base, kind).setDepth(base));
    });
    this.createForageSpots();
    this.createShops();
    this.progressBar = this.add.graphics().setDepth(HUD_DEPTH);

    // A fresh field each visit: leaves don't wait for you while you're away.
    this.leafGround = {
      area: OUTDOOR_WALK_AREA,
      keepClear: [
        ...area.trees.map((t) => ({ x: t.x, y: t.y + TREE_TRUNK_HEIGHT })),
        ...this.shops.map(stallBase),
        ...this.spots.map((s) => s.position),
      ],
      clearance: LEAF_CLEARANCE,
    };
    this.leafField = createLeafField(this.leafGround, Math.random, LEAF_CONFIG, leavesLeftToday(getGameState(this)));
    // Map entries would point at destroyed sprites from the last visit.
    this.leafSprites = new Map();

    const entry = outdoorEntry(this.location);
    this.player = createMover(entry);
    // Arrange mode: where the player arrives, shown as a small marker (nothing is drawn there in play).
    if (import.meta.env.DEV) arrangeable(this, this.location, 'entry', entry, this.add.zone(entry.x, entry.y - 8, 16, 16));
    this.playerSprite = createPlayerSprite(this, () => !this.shop);
    // Small ring where the player is heading; hidden when standing still.
    // Depth 1: on the ground, under everything standing on it.
    this.marker = this.add.circle(0, 0, 5).setStrokeStyle(2, COLORS.paper).setVisible(false).setDepth(1);

    // Top strip: wallet, place name, and the way back.
    // The same in every outdoor place, so one layout for them all (screen 'outdoor').
    const hud = (name: string, x: number, y: number) => layoutPoint('outdoor', name, { x, y });
    const walletAt = hud('wallet', 8, 8);
    const wallet = new WalletDisplay(this, walletAt.x, walletAt.y).setDepth(HUD_DEPTH);
    arrangeable(this, 'outdoor', 'wallet', walletAt, wallet);
    const hudText = { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 };
    const countAt = hud('leafCount', 8, 34);
    this.leafCount = this.add.text(countAt.x, countAt.y, '', hudText).setDepth(HUD_DEPTH);
    arrangeable(this, 'outdoor', 'leafCount', countAt, this.leafCount);
    const bareAt = hud('bareGround', BASE_WIDTH / 2, BASE_HEIGHT - 10);
    this.bareGround = this.add
      .text(bareAt.x, bareAt.y, 'The ground is bare. Come back tomorrow!', hudText)
      .setOrigin(0.5, 1)
      .setDepth(HUD_DEPTH)
      .setVisible(false);
    arrangeable(this, 'outdoor', 'bareGround', bareAt, this.bareGround);
    watchGameState(this, (state) => {
      wallet.setLeaves(state.leaves);
      this.leafCount.setText(`Leaves today: ${state.leavesPickedToday}/${LEAF_CONFIG.leavesPerDay}`);
      this.redrawSpots();
      const panel = this.shop?.panel;
      if (panel instanceof ShopPanel) panel.setRows(this.shopRows(this.shop!.id));
      else if (panel instanceof SeedShopPanel) panel.refresh(state);
      else panel?.refresh();
    });
    const titleAt = hud('title', BASE_WIDTH / 2, 10);
    const title = this.add
      .text(titleAt.x, titleAt.y, LOCATIONS[this.location].name, {
        ...TEXT.heading,
        color: css(COLORS.paper),
        stroke: css(COLORS.ink),
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH);
    arrangeable(this, 'outdoor', 'title', titleAt, title);
    const mapAt = hud('map', BASE_WIDTH - 48, 20);
    arrangeable(this, 'outdoor', 'map', mapAt, new Button(this, mapAt.x, mapAt.y, 80, 28, 'Map', COLORS.book, () => this.backToMap()).setDepth(HUD_DEPTH));

    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a button's, forage spot's or stall's tap, not a walk
        this.gathering = null; // walking off cancels gathering, like cleaning on the floor
        this.walkingToShop = null;
        this.walkTo({ x: pointer.worldX, y: pointer.worldY });
      },
    );
    this.showGuide();
  }

  /**
   * Grandma's guide to this place, the first time the player walks in
   * (GAME_DESIGN.md §5.9), whatever step the tutorial is at: a one-off tip,
   * pointing at each stall or at a forage spot. Seeing both places' guides
   * finishes the tutorial's explore step.
   */
  private showGuide(): void {
    const tip = this.location;
    if (getGameState(this).tipsSeen.includes(tip)) return;
    const def = TIPS[tip];
    const target = (name: string | null | undefined): ArrowTarget | null => {
      if (name === 'forage') {
        const spot = this.spots[0];
        return spot ? { x: spot.position.x, y: spot.position.y - 20 } : null;
      }
      if (name && name in SHOPS) {
        const { x, y } = SHOPS[name as ShopId].stall;
        return { x, y: y - 26 }; // over the stall's name sign
      }
      return null;
    };
    const guideAt = layoutPoint('outdoor', 'guide', { x: bottomBoxLeft(), y: 292 });
    const guideRect = { x: guideAt.x, y: guideAt.y, width: BASE_WIDTH - 36 - guideAt.x, height: 62 };
    const guide = new StoryBox(this, {
      rect: guideRect,
      step: def,
      arrow: (line) => target(def.pointsAt[line]),
      // Over the y-sorted scenery and the HUD.
      depth: HUD_DEPTH + 10,
      onFinished: () => {
        setGameState(this, seeTip(getGameState(this), tip));
        const state = getGameState(this);
        if (state.tutorial === 'explore' && exploredAll(state)) tutorialEvent(this, 'explored');
        guide.destroy();
      },
      onSkip: () => {
        tutorialEvent(this, 'skip');
        guide.destroy();
      },
    });
    arrangeable(this, 'outdoor', 'guide', guideAt, guide, ...sizeBox(this, guideRect.x, guideRect.y, guideRect.width, guideRect.height));
  }

  update(_time: number, deltaMs: number): void {
    // Same walking speed as in the cafe (tiles per second, in pixels here).
    this.player = stepMover(this.player, FLOOR_CONFIG.playerSpeed * GROUND_TILE * (deltaMs / 1000));
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
      playSound('leaf');
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
      const sprite = addStanding(this, x, y, spot.kind).setDepth(y);
      this.spotSprites.set(spot.id, sprite);
      // A bit bigger than the drawing, so it's easy to tap on a phone.
      const tapArea = this.add
        .zone(x, y - 8, 32, 28)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onSpotTapped(spot));
      arrangeable(this, this.location, `spot.${spot.id}`, spot.position, sprite, tapArea);
    }
    this.redrawSpots();
  }

  /** Full or bare, from the game state (called whenever it changes). */
  private redrawSpots(): void {
    const state = getGameState(this);
    for (const spot of this.spots) {
      const sprite = this.spotSprites.get(spot.id);
      if (!sprite) continue; // watchGameState fires once before the spots exist
      // Frame 0 is full, 1 bare.
      sprite.setFrame(gatheredToday(state, spot) ? 1 : 0);
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
    // Seasonal stalls by today's date, or all year while testing (the dev build).
    this.shops = shopsAt(this.location, new Date(), devSettings.allSeasons);
    this.walkingToShop = null;
    this.shop = null;
    for (const id of this.shops) {
      const art = (SHOPS[id] as { art?: ArtName }).art ?? 'stall';
      const { width, height } = spriteSize(SPRITE_ART[art]);
      const base = stallBase(id);
      const stall = addStanding(this, base.x, base.y, art).setDepth(base.y);
      const vendor = id === 'christmas' ? addChristmasVendor(this, base.y, () => this.onShopTapped(id)) : null;
      // The name sign hangs over the top of the stall (the plain stall's awning, the Christmas stall's roof).
      const sign = this.add
        .text(base.x, base.y - height + 4, SHOPS[id].name, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
        .setOrigin(0.5, 1)
        .setDepth(base.y);
      // The whole stall, plus a bit, for fingers.
      const tapArea = this.add
        .zone(base.x, base.y - height / 2, width + 4, height + 2)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onShopTapped(id));
      arrangeable(this, this.location, `stall.${id}`, SHOPS[id].stall, stall, sign, tapArea, ...(vendor ? [vendor] : []));
    }
    // Arrange mode: forage spots, too, where the player can walk to them.
    arrangeRule(this, () =>
      this.spots.flatMap((spot) => (inWalkArea(spot.position) ? [] : [{ name: `spot.${spot.id}`, problem: 'outside where the player can walk' }])),
    );
    // Arrange mode: a stall's base must be where the player can walk, so they can reach its counter.
    arrangeRule(this, () =>
      this.shops.flatMap((id) => {
        return inWalkArea(stallBase(id)) ? [] : [{ name: `stall.${id}`, problem: 'its counter is outside where the player can walk' }];
      }),
    );
  }

  /** Walk up to the counter; the panel opens on arrival (see update()). */
  private onShopTapped(id: ShopId): void {
    if (this.shop) return; // a panel is already open (its dim layer should catch this anyway)
    this.gathering = null;
    this.walkingToShop = id;
    this.walkTo(shopStandPoint(id));
  }

  private openShop(id: ShopId): void {
    this.children.getByName('wardrobe')?.destroy();
    const panel =
      id === 'christmas'
        ? this.openCatalogue()
        : id === 'seeds' ? new SeedShopPanel(this, () => activeCropEvent(new Date(), !!devSettings.allSeasons),
          (crop, seed) => setGameState(this, buySeed(getGameState(this), crop, seed, activeCropEvent(new Date(), !!devSettings.allSeasons))),
          () => this.closeShop())
        : new ShopPanel(this, SHOPS[id].name, SHOPS[id].blurb, this.shopRows(id), () => this.closeShop());
    // Movable in Arrange mode (one place for every stall's list); the catalogue moves itself.
    if (panel instanceof ShopPanel) arrangeablePanel(this, 'shop', 'panel', panel);
    // Above the HUD, so its dim layer covers the Map button too.
    this.shop = { id, panel: panel.setDepth(HUD_DEPTH + 1) };
  }

  /** Furniture goes to storage; one-time clothing purchases unlock the wardrobe. */
  private openCatalogue(): CataloguePanel {
    return new CataloguePanel(
      this,
      CHRISTMAS_CATALOGUE,
      christmasCatalogueShop(this),
      () => this.closeShop(),
    );
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
      return designsSoldBy('carpenter').map((design) => ({
        name: FURNITURE[design].name,
        detail: `🍃${FURNITURE[design].price}   stored: ${state.furniture.stored[design]}`,
        buttons: [
          {
            label: '+1',
            enabled: canBuyFurniture(state, design),
            onPress: () => setGameState(this, buyFurniture(getGameState(this), design)),
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
    playSound('gather');
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
      const { x, y } = leaf.position;
      // Drifts down onto its spot, swaying side to side, then lies there.
      // About 2.6s: two slow sways (650ms each way) while it sinks.
      const sprite = addArt(this, x - 6, y - 36, 'leaf').setAlpha(0);
      this.tweens.add({ targets: sprite, y, duration: 2600, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: sprite, alpha: 1, duration: 600 });
      this.tweens.add({ targets: sprite, x: x + 6, duration: 650, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => sprite.setX(x) });
      // Lying flat on the ground: under anything standing near it. Plus a
      // little rocking, so it catches the eye on the grass.
      sprite.setDepth(2).setAngle(-15);
      this.tweens.add({ targets: sprite, angle: 15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.leafSprites.set(leaf.id, sprite);
    }
  }

  /** A short message drifting up from a spot, e.g. "+1 🍃" where a leaf was picked up. */
  private showFloatingText(at: Point, message: string): void {
    const text = new LeafText(this, at.x, at.y - 8, message, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 }, 0.5, 1).setDepth(HUD_DEPTH);
    this.tweens.add({ targets: text, y: text.y - 16, alpha: 0, duration: 800, onComplete: () => text.destroy() });
  }

  private backToMap(): void {
    const request: WorldMapRequest = { current: this.location };
    this.scene.start('WorldMapScene', request);
  }
}
