import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { CROP_IDS, CROPS, type CropId } from '../data/crops';
import type { Garden } from '../logic/garden';
import type { IngredientId } from '../data/ingredients';
import type { ArtName } from '../art/spriteArt';
import { getGameState } from '../scenes/gameStore';
import { arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** An inventory picker; choosing a packet never spends or plants a seed. */
export class SeedPouchPanel extends Phaser.GameObjects.Container {
  private cards: { button: Button; count: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text }[] = [];

  constructor(scene: Phaser.Scene, selected: CropId, choose: (crop: CropId) => void, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(10000).setName('seedPouchPanel');
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.55).setOrigin(0).setInteractive());
    const at = layoutPoint('seedPouch', 'frame', { x: 320, y: 180 });
    const panel = scene.add.container(at.x, at.y);
    this.add(panel);
    // Stepped cream borders and olive edging echo the supplied pouch panel.
    panel.add(scene.add.rectangle(0, 0, 490, 260, 0x526334).setStrokeStyle(3, COLORS.ink));
    panel.add(scene.add.rectangle(0, 0, 480, 250, 0x8e9b46));
    panel.add(scene.add.rectangle(0, 0, 470, 240, 0xffe0ad).setStrokeStyle(2, 0xc18a5c));
    panel.add(scene.add.rectangle(0, -94, 256, 36, 0x916044).setStrokeStyle(3, 0xc18a5c));
    panel.add(scene.add.text(0, -94, 'Seed Pouch', { ...TEXT.heading, fontSize: '22px', color: '#fff0ca' }).setOrigin(0.5));
    panel.add(addArt(scene, -194, -102, 'seedPouch').setScale(2));
    panel.add(addArt(scene, -113, -94, 'seedFlower'));
    panel.add(addArt(scene, 113, -94, 'seedFlower'));
    for (const x of [-222, 222]) panel.add(addArt(scene, x, 105, 'seedFlower').setScale(2));
    panel.add(scene.add.text(0, -62, 'Choose a packet for planting', { ...TEXT.body, fontSize: '11px' }).setOrigin(0.5));
    panel.add(new Button(scene, 218, -104, 24, 24, 'X', COLORS.reset, close));
    CROP_IDS.forEach((crop, i) => {
      const x = (i - 1) * 144;
      const button = new Button(scene, x, 18, 122, 130, '', 0xffe8bd, () => choose(crop));
      const art = `seedPacket${crop[0].toUpperCase()}${crop.slice(1)}` as ArtName;
      button.add(addArt(scene, 0, -17, art).setScale(2));
      button.add(scene.add.text(0, 28, CROPS[crop].name, { ...TEXT.body, fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5));
      const count = scene.add.text(0, 46, '', { ...TEXT.body, fontSize: '13px' }).setOrigin(0.5);
      const status = scene.add.text(0, -58, crop === selected ? 'Selected' : '', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5);
      button.add([count, status]); panel.add(button);
      this.cards.push({ button, count, status });
    });
    panel.add(scene.add.text(0, 101, 'More seeds: Marketplace  |  Locked crops: Specialty', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5));
    const state = getGameState(scene);
    this.refresh(state.garden, state.ingredients);
    arrangeablePanel(scene, 'seedPouch', 'panel', this);
  }

  refresh(garden: Garden, ingredients: readonly IngredientId[]): void {
    CROP_IDS.forEach((crop, i) => {
      const owned = ingredients.includes(crop), card = this.cards[i];
      card.button.setEnabled(owned);
      card.count.setText(owned ? 'x' + garden.seeds[crop] : 'Locked');
      if (!owned) card.status.setText('Unlock at Specialty');
    });
  }
}
