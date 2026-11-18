import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { MAP_IMAGE, MAP_IMAGE_KEY, MAP_WALLET_PAPER, MAP_WATERFALL, MAP_WATERFALL_IMAGE, MAP_WATERFALL_KEY } from '../assets/worldMap';
import { MAP_HUD, MAP_PLACES } from '../data/mapPresentation';
import { getSoundSettings, onSoundSettings } from '../audio/audio';
import type { HudScene } from './HudScene';
import { LOCATION_IDS, LOCATIONS, type LocationId } from '../data/locations';
import { arrangeable, arrangeablePanel, sizeBox, type Placeable } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { startNextDay } from '../logic/gameState';
import type { Point } from '../logic/layout';
import { chooseLocation } from '../logic/worldMap';
import { Button } from '../ui/Button';
import { COLORS, TEXT, css } from '../ui/theme';
import { createMascotSprite } from '../ui/sprites';
import { isHired } from '../logic/employees';
import { IllustratedMapWallet } from '../ui/IllustratedMapWallet';
import { addMapWater } from '../ui/MapWater';
import { addMapWaterfall } from '../ui/MapWaterfall';
import { beginCafeDay, getGameState, setGameState, tutorialEvent, watchGameState } from './gameStore';
import { StoryBox, type ArrowTarget } from '../ui/StoryBox';
import { bottomBoxLeft } from '../ui/hudLayout';
import { exploredAll } from '../logic/gameState';
import { tourLock } from '../logic/tutorial';
import { TUTORIAL } from '../data/tutorial';

/** What a location's scene is started with. */
export interface LocationRequest {
  location: LocationId;
}

/** What opens the map: which place the player is leaving from (highlighted). */
export interface WorldMapRequest {
  current: LocationId;
}

/**
 * The world map: a woodland island with the places the player can go
 * (GAME_DESIGN.md §5.2). Opened with "Exit cafe" at the end of a day.
 * Tapping a signpost goes there; the Cafe starts the next day.
 *
 * Places come from data/locations.ts; their landmarks are pixel art.
 */
export class WorldMapScene extends Phaser.Scene {
  private request!: WorldMapRequest;
  private confirmOpen = false;

  constructor() {
    super('WorldMapScene');
  }

  init(request: WorldMapRequest): void {
    this.request = request;
  }

  preload(): void {
    this.load.image(MAP_IMAGE_KEY, MAP_IMAGE);
    this.load.spritesheet(MAP_WATERFALL_KEY, MAP_WATERFALL_IMAGE, {
      frameWidth: MAP_WATERFALL.display.width, frameHeight: MAP_WATERFALL.display.height,
      startFrame: 0, endFrame: MAP_WATERFALL.count - 1,
    });
  }

  create(): void {
    this.confirmOpen = false;
    const texture = this.textures.get(MAP_IMAGE_KEY);
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const frame = MAP_WALLET_PAPER;
    if (!texture.has(frame.name)) texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
    const background = layoutPoint('worldMap', 'illustration', { x: 320, y: 180 });
    // Adding the wallet frame changes Phaser's default frame; explicitly keep the full illustration.
    const image = this.add.image(background.x, background.y, MAP_IMAGE_KEY, '__BASE').setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    arrangeable(this, 'worldMap', 'illustration', background, image);
    addMapWater(this);
    addMapWaterfall(this);
    for (const id of LOCATION_IDS) {
      const landmark = this.drawLandmark(id);
      const sign = this.createSignpost(id);
      arrangeable(this, 'worldMap', 'place.' + id, LOCATIONS[id].position, ...landmark, ...(sign.followsPlace ? sign.parts : []));
      arrangeable(this, 'worldMap', 'sign.' + id, sign.point, ...sign.parts);
    }
    if (isHired(getGameState(this), 'mascot')) this.addDancingMascot();
    const walletAt = layoutPoint('worldMap', 'walletContents', { x: 41, y: 19 });
    const wallet = new IllustratedMapWallet(this, walletAt.x, walletAt.y);
    arrangeable(this, 'worldMap', 'walletContents', walletAt, wallet);
    watchGameState(this, state => wallet.setLeaves(state.leaves));
    this.createIllustratedHud();
    this.showTutorial();
  }

  /** The artwork supplies the icons; the persistent HUD still owns their panels and pause rules. */
  private createIllustratedHud(): void {
    const hud = this.scene.get('HudScene') as HudScene;
    const actions = { speaker: () => hud.toggleSoundPanel(), notes: () => hud.toggleNotes(), inventory: () => hud.toggleInventory() };
    const controls = (['speaker', 'notes', 'inventory'] as const).map(name => {
      const point = layoutPoint('worldMap', 'hud.' + name, MAP_HUD[name]);
      const size = MAP_HUD[name].size;
      const button = new Button(this, point.x, point.y, size, size, '', COLORS.book, actions[name]).setBackgroundVisible(false);
      const shade = this.add.rectangle(point.x, point.y, size, size, COLORS.overlay, 0.55).setVisible(false);
      arrangeable(this, 'worldMap', 'hud.' + name, point, button, shade);
      return { name, button, shade };
    });
    const speaker = layoutPoint('worldMap', 'hud.speaker', MAP_HUD.speaker);
    const muted = this.add.text(speaker.x, speaker.y, '\u00d7', { ...TEXT.heading, fontSize: '24px', color: css(COLORS.statusUpset), stroke: css(COLORS.ink), strokeThickness: 2 }).setOrigin(0.5);
    arrangeable(this, 'worldMap', 'hud.speakerMuted', speaker, muted);
    const refreshSound = () => muted.setVisible(getSoundSettings().muted);
    refreshSound();
    const stopSound = onSoundSettings(refreshSound);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopSound);
    watchGameState(this, state => {
      for (const { name, button, shade } of controls) {
        const enabled = name === 'speaker' || (name === 'notes' ? state.tutorial === 'farewell' || state.tutorial === 'done' : state.tutorial === 'done');
        button.setEnabled(enabled);
        shade.setVisible(!enabled);
      }
    });
  }

  /**
   * The tutorial's last step (GAME_DESIGN.md §5.9): Grandma Badger at the
   * bottom of the map, pointing at the Marketplace, then the Forest. OK on
   * her last line ends the tutorial.
   */
  private showTutorial(): void {
    // Both place guides seen (maybe on an earlier day): on to the farewell.
    if (getGameState(this).tutorial === 'explore' && exploredAll(getGameState(this))) tutorialEvent(this, 'explored');
    const step = getGameState(this).tutorial;
    if (step !== 'map' && step !== 'explore' && step !== 'farewell') return;

    // Just above a sign; above its "You are here" label too, for the place the player is at.
    const signTop = (id: LocationId) => {
      const { x, y } = this.signPosition(id);
      return { x, y: y - MAP_PLACES[id].sign.height / 2 - 4 };
    };
    const target = (name: string | null | undefined): ArrowTarget | null => {
      if (name === 'notes') {
        const notes = { ...layoutPoint('worldMap', 'hud.notes', MAP_HUD.notes), size: MAP_HUD.notes.size };
        return { x: notes.x, y: notes.y - notes.size / 2 - 2 };
      }
      return name && name in LOCATIONS ? signTop(name as LocationId) : null;
    };
    // The explore reminder points at whichever place is still to be seen.
    const seen = getGameState(this).tipsSeen;
    const unseen = (['marketplace', 'forest'] as const).find((place) => !seen.includes(place)) ?? null;
    const guideAt = layoutPoint('worldMap', 'guide', { x: Math.max(bottomBoxLeft(), MAP_HUD.inventory.x + MAP_HUD.inventory.size / 2 + 8), y: 292 });
    const guideRect = { x: guideAt.x, y: guideAt.y, width: BASE_WIDTH - 36 - guideAt.x, height: 62 };
    const guide = new StoryBox(this, {
      rect: guideRect,
      step: TUTORIAL[step],
      arrow: (line) => (step === 'explore' ? target(unseen) : target(TUTORIAL[step].pointsAt[line])),
      onFinished: () => {
        tutorialEvent(this, 'next');
        guide.destroy();
        // Redraw the map so the signs unlock: after the tour (the Forest and
        // Marketplace, then the explore reminder or the farewell) and after
        // the farewell (the Cafe).
        if (step === 'map' || step === 'farewell') this.scene.restart(this.request);
      },
      onSkip: () => {
        tutorialEvent(this, 'skip');
        guide.destroy();
      },
    });
    arrangeable(this, 'worldMap', 'guide', guideAt, guide, ...sizeBox(this, guideRect.x, guideRect.y, guideRect.width, guideRect.height));
  }

  private go(id: LocationId): void {
    if (this.confirmOpen) return;
    const choice = chooseLocation(id);
    const sign = this.signPosition(id);
    if (choice === 'locked') return this.showFloatingText(sign, 'Locked');
    const tutorialLock = tourLock(getGameState(this).tutorial, id);
    if (tutorialLock) return this.showFloatingText(sign, tutorialLock);
    if (choice === 'notBuilt') return this.showFloatingText(sign, 'Coming soon!');

    // The cafe starts a new day, which can't be undone: ask first.
    if (id === 'cafe') return this.confirmNextDay();
    this.enter(id);
  }

  private enter(id: LocationId): void {
    if (id === 'garden') {
      this.scene.start('GardenScene', { from: 'map' });
      return;
    }
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
    if (this.confirmOpen) return;
    this.confirmOpen = true;
    let settled = false;
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
    const depart = (action: () => void) => {
      if (settled) return;
      settled = true;
      removeKeys();
      action();
    };
    const open = new Button(this, cx - 120, top + height - 30, 110, 30, 'Open cafe', COLORS.serve, () => depart(() => {
      // Going back to the cafe opens it for the next day (GAME_DESIGN.md §5.3).
      // The day counts as started first, so the new day number isn't saved
      // until the day is over (GAME_DESIGN.md §6.1).
      beginCafeDay(this);
      setGameState(this, startNextDay(getGameState(this)));
      this.enter('cafe');
    }));
    // Arranging tables and chairs (GAME_DESIGN.md §5.7); only between days.
    const decorate = new Button(this, cx, top + height - 30, 110, 30, 'Decorate', COLORS.book, () =>
      depart(() => this.scene.start('DecorateScene')),
    );
    const notYet = new Button(this, cx + 120, top + height - 30, 110, 30, 'Not yet', COLORS.reset, () => close());

    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter') open.press();
      else if (event.key === 'd' || event.key === 'D') decorate.press();
      // Not notYet.press(): its 80ms un-press flash would fire on a destroyed button.
      else if (event.key === 'Escape') close();
    };
    const removeKeys = () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, removeKeys);
    };
    const prompt = this.add.container(0, 0, [dim, panel, title, note, open, decorate, notYet]).setDepth(100);
    arrangeablePanel(this, 'worldMap', 'cafePrompt', prompt);
    const close = () => {
      if (settled) return;
      settled = true;
      removeKeys();
      this.time.delayedCall(0, () => {
        prompt.destroy();
        this.confirmOpen = false;
      });
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeKeys);
  }

  /** Invisible buttons preserve the supplied buildings and use the normal guarded travel action. */
  private drawLandmark(id: LocationId): Placeable[] {
    const point = LOCATIONS[id].position;
    const bounds = MAP_PLACES[id];
    return [new Button(this, point.x, point.y, bounds.width, bounds.height, '', COLORS.paper, () => this.go(id)).setBackgroundVisible(false)];
  }

  /**
   * The Mascot dancing outside the cafe (GAME_DESIGN.md §5.8): little hops
   * plus a side-to-side sway. Two tweens with different lengths, so the
   * moves drift in and out of step and the dance doesn't look like one loop.
   * Purely for show: the faster arrivals are the floor's rule (FloorState.mascot).
   */
  private addDancingMascot(): void {
    const point = layoutPoint('worldMap', 'mascot', { x: LOCATIONS.cafe.position.x + 72, y: LOCATIONS.cafe.position.y + 42 });
    const { x, y } = point;
    const mascot = createMascotSprite(this).setPosition(x, y).setAngle(-12);
    arrangeable(this, 'worldMap', 'mascot', point, mascot);
    this.tweens.add({ targets: mascot, y: y - 5, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: mascot, angle: 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * The illustrated label's hit area and current/locked overlays.
   * Returns its objects, point, and whether it still sits
   * where its place puts it (not moved on its own in Arrange mode).
   */
  private createSignpost(id: LocationId): { parts: Placeable[]; point: Point; followsPlace: boolean } {
    const location = LOCATIONS[id];
    const here = id === this.request.current;
    const { x, y } = this.signPosition(id);
    const { width, height } = MAP_PLACES[id].sign;
    const locked = location.locked || tourLock(getGameState(this).tutorial, id) !== null;
    const sign = new Button(this, x, y, width, height, '', COLORS.paper, () => this.go(id)).setBackgroundVisible(false).setDepth(10);
    const shade = this.add.rectangle(x, y, width, height, COLORS.overlay, 0.3).setVisible(locked).setDepth(10);
    const highlight = this.add.rectangle(x, y, width + 4, height + 4).setFillStyle(0, 0).setStrokeStyle(1, COLORS.paper).setVisible(here).setDepth(10);
    const lock = this.add.text(x + width / 2, y - height / 2 - 2, '🔒', TEXT.body).setOrigin(1, 1).setVisible(locked).setDepth(11);
    const parts: Placeable[] = [sign, shade, highlight, lock];
    const usual = this.usualSignPosition(id);
    return { parts, point: { x, y }, followsPlace: x === usual.x && y === usual.y };
  }

  /** Where a signpost stands: moved on its own in Arrange mode, else above its place. */
  private signPosition(id: LocationId): Point {
    return layoutPoint('worldMap', `sign.${id}`, this.usualSignPosition(id));
  }

  private usualSignPosition(id: LocationId): Point {
    const { x, y } = LOCATIONS[id].position;
    return { x, y: y + MAP_PLACES[id].sign.dy };
  }

  /** Same idea as on the floor: a short message that drifts up and fades. */
  private showFloatingText(at: Point, message: string): void {
    const text = this.add
      .text(at.x, at.y - 30, message, { ...TEXT.label, stroke: css(COLORS.ink), strokeThickness: 3 })
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
