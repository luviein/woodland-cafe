import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { CROPS, CROP_IDS, GARDEN_PLOTS, type CropId } from '../data/crops';
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
  private selected: CropId = 'mushroom';
  private seeds: Button[] = [];
  private plots: { crop: Phaser.GameObjects.Image; status: Phaser.GameObjects.Text }[] = [];
  private hint!: Phaser.GameObjects.Text;
  private player!: Mover;
  private sprite!: Phaser.GameObjects.Container;

  constructor() { super('GardenScene'); }

  create(): void {
    this.selected = 'mushroom'; this.seeds = []; this.plots = [];
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
    door.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.returnToCafe());
    const back = new Button(this, doorAt.x, doorAt.y + 40, 100, 26, 'Cafe', COLORS.book, () => this.returnToCafe());
    arrangeable(this, 'garden', 'returnDoor', doorAt, door, back);
    for (let i = 0; i < 2; i++) {
      const at = point('tree.' + i, i === 0 ? 44 : 595, i === 0 ? 280 : 180);
      arrangeable(this, 'garden', 'tree.' + i, at, addTree(this, at.x, at.y, i === 0 ? 'oak' : 'pine'));
    }
    const fenceAt = point('fence', 136, 324);
    const fences = this.add.container(fenceAt.x, fenceAt.y);
    for (let i = 0; i < 14; i++) fences.add(addArt(this, i * 32, 0, 'gardenFence').setOrigin(0, 1));
    arrangeable(this, 'garden', 'fence', fenceAt, fences);
    CROP_IDS.forEach((crop, i) => {
      const at = point('seed.' + crop, 212 + i * 144, 64);
      const button = new Button(this, at.x, at.y, 132, 34, '', COLORS.book, () => {
        this.selected = crop;
        this.hint.setText(`${CROPS[crop].name}: tap an empty bed to plant, then tap again to water.`);
        this.refresh();
      });
      button.add(this.add.text(0, 0, '', { ...TEXT.label, fontSize: '11px' }).setOrigin(0.5).setName('seedLabel'));
      this.seeds.push(button);
      arrangeable(this, 'garden', 'seed.' + crop, at, button);
    });
    for (let i = 0; i < GARDEN_PLOTS; i++) {
      const at = point('plot.' + i, 212 + i % 3 * 144, 132 + Math.floor(i / 3) * 100);
      const bed = addArt(this, at.x, at.y + 6, 'gardenSoil').setScale(2).setInteractive({ useHandCursor: true });
      const crop = addArt(this, at.x, at.y - 10, 'gardenMushroom').setScale(2);
      const status = this.add.text(at.x, at.y + 52, '', { ...TEXT.label, fontSize: '10px', align: 'center', color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 3 }).setOrigin(0.5);
      bed.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.tend(i));
      this.plots.push({ crop, status });
      arrangeable(this, 'garden', 'plot.' + i, at, bed, crop, status);
    }
    const entry = point('entry', 70, 214);
    this.player = createMover(entry);
    this.sprite = createPlayerSprite(this, () => false).setPosition(entry.x, entry.y).setDepth(500);
    arrangeable(this, 'garden', 'entry', entry, this.sprite);
    const hintAt = point('hint', 344, 344);
    this.hint = this.add.text(hintAt.x, hintAt.y, 'Choose seeds, plant, then water once. Buy seeds at the Marketplace.', {
      ...TEXT.label, fontSize: '11px', align: 'center', wordWrap: { width: 520 }, stroke: css(COLORS.ink), strokeThickness: 3,
    }).setOrigin(0.5);
    arrangeable(this, 'garden', 'hint', hintAt, this.hint);
    watchGameState(this, state => { wallet.setLeaves(state.leaves); this.refresh(); });
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length) return;
      this.player = walkToward(this.player, { x: pointer.worldX, y: pointer.worldY }, { x: 32, y: 180, width: 560, height: 112 });
    });
    this.input.keyboard?.on('keydown-ESC', this.returnToCafe, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-ESC', this.returnToCafe, this));
  }

  update(_time: number, delta: number): void {
    this.player = stepMover(this.player, delta * 0.1);
    this.sprite.setPosition(Math.round(this.player.position.x), Math.round(this.player.position.y));
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
    CROP_IDS.forEach((crop, i) => {
      const owned = state.ingredients.includes(crop), button = this.seeds[i];
      button.setEnabled(owned);
      (button.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(2, crop === this.selected ? COLORS.paper : COLORS.ink);
      (button.getByName('seedLabel') as Phaser.GameObjects.Text).setText(`${CROPS[crop].name}  ${owned ? 'x' + state.garden.seeds[crop] : 'Locked'}`);
    });
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

  private returnToCafe(): void {
    this.scene.resume('FloorScene');
    this.scene.stop();
  }
}
