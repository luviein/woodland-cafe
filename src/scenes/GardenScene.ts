import { SeedPouchPanel } from '../ui/SeedPouchPanel';
import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { CROPS, GARDEN_PLOTS, type CropId } from '../data/crops';
import { cropRemaining, cropStage, plantCrop, tendCrop } from '../logic/garden';
import { createMover, stepMover, walkToward, type Mover } from '../logic/outdoor';
import { layoutPoint } from '../layout/positions';
import { arrangeable, sizeBox } from '../layout/arrangeable';
import { addArt, artKey } from '../ui/art';
import { Button } from '../ui/Button';
import { createPlayerSprite, addTree } from '../ui/sprites';
import { COLORS, TEXT, css } from '../ui/theme';
import { WalletDisplay } from '../ui/WalletDisplay';
import { getGameState, setGardenGameState, watchGameState } from './gameStore';
import type { ArtName } from '../art/spriteArt';

const cropArt = (crop: CropId): ArtName => `garden${crop[0].toUpperCase()}${crop.slice(1)}` as ArtName;

/** A separate visit: FloorScene stays paused, so returning resumes its live orders. */
export class GardenScene extends Phaser.Scene {
  private from: 'cafe' | 'map' = 'map';
  private selected: CropId = 'mushroom';
  private pouchPanel: SeedPouchPanel | null = null;
  private selectedLabel!: Phaser.GameObjects.Text;
  private plots: { crop: Phaser.GameObjects.Image; status: Phaser.GameObjects.Text }[] = [];
  private hint!: Phaser.GameObjects.Text;
  private player!: Mover;
  private sprite!: Phaser.GameObjects.Container;

  constructor() { super('GardenScene'); }

  init(request: { from?: 'cafe' | 'map' }): void {
    this.from = request?.from === 'cafe' ? 'cafe' : 'map';
  }

  create(): void {
    this.selected = 'mushroom'; this.pouchPanel = null; this.plots = [];
    const point = (name: string, x: number, y: number) => layoutPoint('garden', name, { x, y });
    const groundAt = point('ground', 0, 0);
    const ground = this.add.renderTexture(groundAt.x, groundAt.y, BASE_WIDTH, BASE_HEIGHT).setOrigin(0);
    for (let y = 0; y < BASE_HEIGHT; y += 16) for (let x = 0; x < BASE_WIDTH; x += 16)
      ground.drawFrame(artKey('grass'), (x / 16 + y / 16 * 3) % 4, x, y);
    arrangeable(this, 'garden', 'ground', groundAt, ground, ...sizeBox(this, groundAt.x, groundAt.y, BASE_WIDTH, BASE_HEIGHT));
    const headerAt = point('header', 320, 24);
    const title = this.add.text(headerAt.x, headerAt.y, 'Your kitchen garden', { ...TEXT.heading, color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 4 }).setOrigin(0.5);
    arrangeable(this, 'garden', 'header', headerAt, title);
    const walletAt = point('wallet', 8, 8);
    const wallet = new WalletDisplay(this, walletAt.x, walletAt.y);
    arrangeable(this, 'garden', 'wallet', walletAt, wallet);
    const doorAt = point('returnDoor', 70, 108);
    const door = addArt(this, doorAt.x, doorAt.y, 'gardenDoor').setScale(2).setInteractive({ useHandCursor: true });
    door.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.returnToEntrance());
    const back = new Button(this, doorAt.x, doorAt.y + 40, 100, 26, this.from === 'cafe' ? 'Cafe' : 'Map', COLORS.book, () => this.returnToEntrance());
    arrangeable(this, 'garden', 'returnDoor', doorAt, door, back);
    for (let i = 0; i < 2; i++) {
      const at = point('tree.' + i, i === 0 ? 25 : 595, i === 0 ? 280 : 180);
      arrangeable(this, 'garden', 'tree.' + i, at, addTree(this, at.x, at.y, i === 0 ? 'oak' : 'pine'));
    }
    const fenceAt = point('fence', 136, 324);
    const fences = this.add.container(fenceAt.x, fenceAt.y);
    for (let i = 0; i < 14; i++) fences.add(addArt(this, i * 32, 0, 'gardenFence').setOrigin(0, 1));
    arrangeable(this, 'garden', 'fence', fenceAt, fences);
    const tableAt = point('seedTable', 84, 250);
    const table = addArt(this, tableAt.x, tableAt.y, 'gardenTable').setInteractive({ useHandCursor: true });
    const pouch = addArt(this, tableAt.x, tableAt.y - 16, 'seedPouch').setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    table.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.openPouch());
    pouch.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.openPouch());
    const tableLabel = this.add.text(tableAt.x, tableAt.y + 30, 'Seed pouch', { ...TEXT.label, fontSize: '10px', stroke: css(COLORS.ink), strokeThickness: 3 }).setOrigin(0.5);
    arrangeable(this, 'garden', 'seedTable', tableAt, table, pouch, tableLabel);
    const selectedAt = point('selectedCrop', 356, 64);
    this.selectedLabel = this.add.text(selectedAt.x, selectedAt.y, '', { ...TEXT.heading, fontSize: '12px', color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 3 }).setOrigin(0.5);
    arrangeable(this, 'garden', 'selectedCrop', selectedAt, this.selectedLabel);
    for (let i = 0; i < GARDEN_PLOTS; i++) {
      const at = point('plot.' + i, 212 + i % 3 * 144, 132 + Math.floor(i / 3) * 100);
      const bed = addArt(this, at.x, at.y + 6, 'gardenSoil').setScale(2).setInteractive({ useHandCursor: true });
      const crop = addArt(this, at.x, at.y - 10, 'gardenMushroom').setScale(2);
      const status = this.add.text(at.x, at.y + 52, '', { ...TEXT.label, fontSize: '10px', align: 'center', color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 3 }).setOrigin(0.5);
      bed.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.tend(i));
      this.plots.push({ crop, status });
      arrangeable(this, 'garden', 'plot.' + i, at, bed, crop, status);
    }
    const entry = point('entry', 70, 180);
    this.player = createMover(entry);
    this.sprite = createPlayerSprite(this, () => false).setPosition(entry.x, entry.y).setDepth(500);
    arrangeable(this, 'garden', 'entry', entry, this.sprite);
    const hintAt = point('hint', 344, 344);
    this.hint = this.add.text(hintAt.x, hintAt.y, 'Open the seed pouch on the table to choose seeds, then plant and water.', {
      ...TEXT.label, fontSize: '11px', align: 'center', wordWrap: { width: 520 }, stroke: css(COLORS.ink), strokeThickness: 3,
    }).setOrigin(0.5);
    arrangeable(this, 'garden', 'hint', hintAt, this.hint);
    watchGameState(this, state => { wallet.setLeaves(state.leaves); this.refresh(); });
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || this.pouchPanel) return;
      this.player = walkToward(this.player, { x: pointer.worldX, y: pointer.worldY }, { x: 32, y: 180, width: 560, height: 112 });
    });
    this.input.keyboard?.on('keydown-ESC', this.returnToEntrance, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-ESC', this.returnToEntrance, this));
  }

  update(_time: number, delta: number): void {
    this.player = stepMover(this.player, delta * 0.1);
    // Keep movement precise for facing; pixelArt rounds only the rendered pixels.
    // Rounding here made diagonal steps alternate between sideways and forwards.
    this.sprite.setPosition(this.player.position.x, this.player.position.y);
  }

  private tend(index: number): void {
    const state = getGameState(this), plant = state.garden.plots[index];
    const next = plant ? tendCrop(state, index, Date.now()) : plantCrop(state, index, this.selected);
    if (next === state) {
      this.hint.setText(plant ? 'Still growing — you can leave and come back later.' : 'No seeds for this crop. Visit the Marketplace Seeds stall.');
      return;
    }
    setGardenGameState(this, next);
    this.hint.setText(!plant ? 'Planted! Tap this bed to water it.' : plant.wateredAt === null
      ? 'Watered! Your crop keeps growing even when the game is closed.' : `Harvested ${CROPS[plant.crop].yield} ${CROPS[plant.crop].name} into your stock.`);
  }

  private refresh(): void {
    const state = getGameState(this), now = Date.now();
    this.selectedLabel.setText(`${CROPS[this.selected].name} seeds: x${state.garden.seeds[this.selected]}  |  Choose from the pouch`);
    this.pouchPanel?.refresh(state.garden, state.ingredients);
    this.plots.forEach(({ crop, status }, i) => {
      const plant = state.garden.plots[i];
      crop.setVisible(plant !== null);
      if (!plant) { status.setText('Empty bed'); return; }
      crop.setTexture(artKey(cropArt(plant.crop)), cropStage(plant, now));
      const seconds = Math.ceil(cropRemaining(plant, now) / 1000);
      const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      status.setText(`${CROPS[plant.crop].name}\n${plant.wateredAt === null ? 'Tap to water' : seconds === 0 ? 'Ready — tap to harvest' : time}`);
    });
  }

  private openPouch(): void {
    if (this.pouchPanel) return;
    this.player = { ...this.player, target: null };
    this.pouchPanel = new SeedPouchPanel(this, this.selected, crop => {
      this.selected = crop;
      this.hint.setText(`${CROPS[crop].name}: tap an empty bed to plant, then tap again to water.`);
      this.refresh();
      this.closePouch();
    }, () => this.closePouch());
  }

  private closePouch(): void {
    const panel = this.pouchPanel;
    // Keep the modal active until this pointer-up has finished dispatching.
    this.time.delayedCall(0, () => { panel?.destroy(); if (this.pouchPanel === panel) this.pouchPanel = null; });
  }

  private returnToEntrance(): void {
    if (this.pouchPanel) { this.closePouch(); return; }

    if (this.from === 'cafe' && this.scene.isPaused('FloorScene')) {
      this.scene.resume('FloorScene');
      this.scene.stop();
    } else this.scene.start('WorldMapScene', { current: 'garden' });
  }
}
