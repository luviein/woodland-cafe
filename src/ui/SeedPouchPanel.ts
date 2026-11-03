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
  private cards: { button: Button; count: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text; slot: Phaser.GameObjects.Image; packet: Phaser.GameObjects.Image }[] = [];

  constructor(scene: Phaser.Scene, selected: CropId, choose: (crop: CropId) => void, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(10000).setName('seedPouchPanel');
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.55).setOrigin(0).setInteractive());
    const at = layoutPoint('seedPouch', 'frame', { x: 320, y: 180 });
    const panel = scene.add.container(at.x, at.y);
    this.add(panel);
    // The supplied decorative frame keeps its shaped edge and carved header.
    // Inventory samples were cleared in the import script, so counts stay live.
    panel.add(addArt(scene, 0, 0, 'seedPouchFrame').setScale(2));
    panel.add(scene.add.text(0, -56, 'Choose a packet for planting', { ...TEXT.body, fontSize: '11px' }).setOrigin(0.5));
    const closeButton = new Button(scene, 210, -110, 36, 36, '', COLORS.reset, close);
    (closeButton.getAt(0) as Phaser.GameObjects.Rectangle).setVisible(false);
    panel.add(closeButton); // Its hit area sits over the reference's drawn X.
    CROP_IDS.forEach((crop, i) => {
      const x = (i - 1) * 142;
      const button = new Button(scene, x, 30, 124, 148, '', 0xffe8bd, () => choose(crop));
      (button.getAt(0) as Phaser.GameObjects.Rectangle).setVisible(false);
      const slot = addArt(scene, 0, 0, 'seedPouchCard').setScale(2);
      button.addAt(slot, 0);
      const art = `seedPacket${crop[0].toUpperCase()}${crop.slice(1)}` as ArtName;
      const packet = addArt(scene, 0, -17, art).setScale(2);
      button.add(packet);
      button.add(scene.add.text(0, 36, CROPS[crop].name, { ...TEXT.body, fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5));
      const count = scene.add.text(0, 56, '', { ...TEXT.body, fontSize: '13px' }).setOrigin(0.5);
      const status = scene.add.text(0, -63, crop === selected ? 'Selected' : '', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5);
      button.add([count, status]); panel.add(button);
      this.cards.push({ button, count, status, slot, packet });
    });
    panel.add(scene.add.text(0, 126, 'More seeds: Marketplace  |  Locked crops: Specialty', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5));
    const state = getGameState(scene);
    this.refresh(state.garden, state.ingredients);
    arrangeablePanel(scene, 'seedPouch', 'panel', this);
  }

  refresh(garden: Garden, ingredients: readonly IngredientId[]): void {
    CROP_IDS.forEach((crop, i) => {
      const owned = ingredients.includes(crop), card = this.cards[i];
      card.button.setEnabled(owned);
      card.slot.setAlpha(owned ? 1 : 0.65);
      card.packet.setAlpha(owned ? 1 : 0.45);
      card.count.setText(owned ? 'x' + garden.seeds[crop] : 'Locked');
      if (!owned) card.status.setText('Unlock at Specialty');
    });
  }
}
