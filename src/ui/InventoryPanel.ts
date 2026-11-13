import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import words from '../data/texts/inventory.json';
import type { ArtName } from '../art/spriteArt';
import type { GameState } from '../logic/gameState';
import { inventoryEntries, type InventoryTab } from '../logic/inventory';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { getGameState } from '../scenes/gameStore';
import { addArt, artKey } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** Viewing a collection never moves items or spends any of the player's stock. */
export class InventoryPanel extends Phaser.GameObjects.Container {
  private tab: InventoryTab = 'seasonal';
  private readonly tabs: { key: InventoryTab; button: Button }[] = [];
  private readonly cards: { back: Phaser.GameObjects.Rectangle; image: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; count: Phaser.GameObjects.Text }[] = [];
  private readonly help: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, close: () => void) {
    super(scene, 0, 0);
    this.setName('inventoryPanel').setDepth(10000);
    scene.add.existing(this);
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.65).setOrigin(0).setInteractive());
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint('inventory', name, { x, y });
      object.setName(name).setPosition(at.x, at.y);
      this.add(object);
      arrangeable(scene, 'inventory', name, at, object);
      return object;
    };
    place('frame', 320, 180, scene.add.rectangle(0, 0, 566, 316, COLORS.counter).setStrokeStyle(3, COLORS.ink));
    place('paper', 320, 180, scene.add.rectangle(0, 0, 550, 300, COLORS.paper).setStrokeStyle(2, COLORS.paperEdge));
    place('title', 320, 50, scene.add.text(0, 0, words.title, TEXT.heading).setOrigin(0.5));
    place('close', 548, 50, new Button(scene, 0, 0, 76, 24, words.close, COLORS.reset, close));
    (['ingredients', 'seasonal'] as const).forEach((key, i) => {
      const button = place(`tab.${key}`, i === 0 ? 232 : 408, 86,
        new Button(scene, 0, 0, 160, 26, words.tabs[key], COLORS.book, () => {
          this.tab = key;
          this.refresh(getGameState(scene));
        }));
      this.tabs.push({ key, button });
    });
    for (let i = 0; i < 6; i++) {
      const x = 150 + i % 3 * 170, y = 152 + Math.floor(i / 3) * 94;
      const back = place(`card.${i}`, x, y, scene.add.rectangle(0, 0, 154, 84, 0xffe8bd).setStrokeStyle(2, COLORS.paperEdge));
      const image = place(`card.${i}.art`, x, y - 17, addArt(scene, 0, 0, 'mushroom').setScale(2));
      const name = place(`card.${i}.name`, x, y + 12, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '11px', fontStyle: 'bold' }).setOrigin(0.5));
      const count = place(`card.${i}.count`, x, y + 30, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '13px' }).setOrigin(0.5));
      this.cards.push({ back, image, name, count });
    }
    this.help = place('help', 320, 312, scene.add.text(0, 0, '', {
      ...TEXT.body, fontSize: '11px', align: 'center', wordWrap: { width: 506 },
    }).setOrigin(0.5));
    this.refresh(getGameState(scene));
    arrangeablePanel(scene, 'inventory', 'panel', this);
  }

  refresh(state: GameState): void {
    const entries = inventoryEntries(state, this.tab);
    entries.forEach((entry, i) => {
      const card = this.cards[i], faded = entry.locked || entry.amount === 0;
      card.image.setTexture(artKey(entry.art as ArtName), 0).setAlpha(faded ? 0.4 : 1);
      card.back.setAlpha(faded ? 0.65 : 1);
      card.name.setText(entry.name);
      card.count.setText(entry.locked ? words.locked : `x${entry.amount}`);
    });
    for (const tab of this.tabs) tab.button.setAlpha(tab.key === this.tab ? 1 : 0.6);
    this.help.setText(this.tab === 'ingredients' ? words.ingredientsHelp
      : entries.some(entry => entry.amount > 0) ? words.seasonalHelp : words.emptySeasonalHelp);
  }
}
