import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { CROP_IDS, CROPS, type CropId, type SeedType } from '../data/crops';
import { seedCount, type Garden } from '../logic/garden';
import { seedPacketArtName } from '../logic/seedShop';
import type { IngredientId } from '../data/ingredients';
import type { ArtName } from '../art/spriteArt';
import { getGameState } from '../scenes/gameStore';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { addArt, artKey } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** An inventory picker; choosing a packet never spends or plants a seed. */
export class SeedPouchPanel extends Phaser.GameObjects.Container {
  private cards: { button: Button; count: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text; slot: Phaser.GameObjects.Image; packet: Phaser.GameObjects.Image }[] = [];
  private seed: SeedType;
  private description: Phaser.GameObjects.Text;
  private garden!: Garden;
  private ingredients: readonly IngredientId[] = [];
  private tabs: { seed: SeedType; button: Button }[] = [];

  constructor(scene: Phaser.Scene, private readonly selected: CropId, choose: (crop: CropId, seed: SeedType) => void, close: () => void, private readonly selectedSeed: SeedType = 'normal') {
    super(scene, 0, 0);
    this.seed = selectedSeed;
    scene.add.existing(this);
    this.setDepth(10000).setName('seedPouchPanel');
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.55).setOrigin(0).setInteractive());
    const at = layoutPoint('seedPouch', 'frame', { x: 320, y: 180 });
    const panel = scene.add.container(at.x, at.y);
    this.add(panel);
    // The supplied decorative frame keeps its shaped edge and carved header.
    // Inventory samples were cleared in the import script, so counts stay live.
    panel.add(addArt(scene, 0, 0, 'seedPouchFrame').setScale(2));
    this.description = scene.add.text(0, -56, '', { ...TEXT.body, fontSize: '11px' }).setOrigin(0.5);
    panel.add(this.description);
    (['normal', 'christmas'] as const).forEach((seed, i) => {
      const at = layoutPoint('seedPouch', `tab.${seed}`, { x: i === 0 ? -76 : 76, y: -80 });
      const tab = new Button(scene, at.x, at.y, 136, 22, seed === 'normal' ? 'Normal' : 'Christmas', COLORS.book, () => {
        this.seed = seed;
        this.refresh(this.garden, this.ingredients);
      });
      (tab.getAt(1) as Phaser.GameObjects.Text).setFontSize('12px');
      panel.add(tab);
      this.tabs.push({ seed, button: tab });
      arrangeable(scene, 'seedPouch', `tab.${seed}`, at, tab);
    });
    const closeButton = new Button(scene, 210, -110, 36, 36, '', COLORS.reset, close);
    (closeButton.getAt(0) as Phaser.GameObjects.Rectangle).setVisible(false);
    panel.add(closeButton); // Its hit area sits over the reference's drawn X.
    CROP_IDS.forEach((crop, i) => {
      const x = (i - 1) * 142;
      const button = new Button(scene, x, 30, 124, 148, '', 0xffe8bd, () => choose(crop, this.seed));
      (button.getAt(0) as Phaser.GameObjects.Rectangle).setVisible(false);
      const slot = addArt(scene, 0, 0, 'seedPouchCard').setScale(2);
      button.addAt(slot, 0);
      const art = `seedPacket${crop[0].toUpperCase()}${crop.slice(1)}` as ArtName;
      const packet = addArt(scene, 0, -17, art);
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
    this.garden = garden; this.ingredients = ingredients;
    for (const tab of this.tabs) tab.button.setAlpha(tab.seed === this.seed ? 1 : 0.6);
    this.description.setText(this.seed === 'normal' ? 'Normal seeds: rare Golden or seasonal crops' : 'Christmas seeds: guaranteed Christmas crop');
    CROP_IDS.forEach((crop, i) => {
      const owned = ingredients.includes(crop), card = this.cards[i];
      card.button.setEnabled(owned);
      card.slot.setAlpha(owned ? 1 : 0.65);
      card.packet.setAlpha(owned ? 1 : 0.45);
      card.packet.setTexture(artKey(seedPacketArtName(crop, this.seed) as ArtName), 0);
      card.count.setText(owned ? 'x' + seedCount(garden, crop, this.seed) : 'Locked');
      card.status.setText(!owned ? 'Unlock at Specialty' : crop === this.selected && this.seed === this.selectedSeed ? 'Selected' : '');
    });
  }
}
