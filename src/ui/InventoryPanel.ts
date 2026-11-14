import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import words from '../data/texts/inventory.json';
import merchantWords from '../data/texts/christmasMerchant.json';
import exchangeWords from '../data/texts/cropExchange.json';
import { CHRISTMAS_TICKET_RATES, exchangeCrop, sellChristmasCrop } from '../logic/cropExchange';
import type { ArtName } from '../art/spriteArt';
import type { GameState } from '../logic/gameState';
import { inventoryEntries, type InventoryTab } from '../logic/inventory';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { getGameState, setGardenGameState } from '../scenes/gameStore';
import { addArt, artKey } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** Collection sales use the garden checkpoint so the cafe day stays uncommitted. */
export class InventoryPanel extends Phaser.GameObjects.Container {
  private tab: InventoryTab = 'seasonal';
  private readonly tabs: { key: InventoryTab; button: Button }[] = [];
  private readonly cards: { back: Phaser.GameObjects.Rectangle; image: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; count: Phaser.GameObjects.Text; rate: Phaser.GameObjects.Text; sellOne: Button; sellAll: Button }[] = [];
  private readonly help: Phaser.GameObjects.Text;
  private readonly tickets: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, close: () => void, private readonly christmasSales = false) {
    super(scene, 0, 0);
    this.setName('inventoryPanel').setDepth(10000);
    scene.add.existing(this);
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.65).setOrigin(0).setInteractive());
    const screen = christmasSales ? 'christmasSell' : 'inventory';
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint(screen, name, { x, y });
      object.setName(name).setPosition(at.x, at.y);
      this.add(object);
      arrangeable(scene, screen, name, at, object);
      return object;
    };
    place('frame', 320, 180, scene.add.rectangle(0, 0, 566, 344, COLORS.counter).setStrokeStyle(3, COLORS.ink));
    place('paper', 320, 180, scene.add.rectangle(0, 0, 550, 328, COLORS.paper).setStrokeStyle(2, COLORS.paperEdge));
    place('title', 320, 36, scene.add.text(0, 0, christmasSales ? merchantWords.sellTitle : words.title, TEXT.heading).setOrigin(0.5));
    place('close', 548, 36, new Button(scene, 0, 0, 76, 24, words.close, COLORS.reset, close));
    (['ingredients', 'seasonal'] as const).forEach((key, i) => {
      const button = place(`tab.${key}`, i === 0 ? 232 : 408, 68,
        new Button(scene, 0, 0, 160, 26, words.tabs[key], COLORS.book, () => {
          this.tab = key;
          this.refresh(getGameState(scene));
        }));
      button.setVisible(!christmasSales);
      this.tabs.push({ key, button });
    });
    this.tickets = place('christmasTickets', 320, 94, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '11px', fontStyle: 'bold' }).setOrigin(0.5));
    for (let i = 0; i < (christmasSales ? 3 : 6); i++) {
      // Golden cards need only a picture and count; leave room below for sales.
      const lowerRow = christmasSales || i >= 3;
      const x = 150 + i % 3 * 170, y = christmasSales ? 208 : lowerRow ? 249 : 144;
      const back = place(`card.${i}`, x, y, scene.add.rectangle(0, 0, 154, christmasSales ? 152 : lowerRow ? 114 : 76, 0xffe8bd).setStrokeStyle(2, COLORS.paperEdge));
      const image = place(`card.${i}.art`, x, y + (christmasSales ? -45 : lowerRow ? -33 : -15), addArt(scene, 0, 0, 'mushroom').setScale(2));
      const name = place(`card.${i}.name`, x, y + (christmasSales ? -19 : lowerRow ? -8 : 13), scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', fontStyle: 'bold' }).setOrigin(0.5));
      const count = place(`card.${i}.count`, x, y + (christmasSales ? -4 : lowerRow ? 7 : 27), scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5));
      const rate = place(`card.${i}.rate`, x, y + (christmasSales ? 15 : 22), scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5));
      const sell = (amount: number | 'all') => {
        const state = getGameState(scene);
        const entry = this.entries(state)[i];
        const crop = exchangeCrop(entry.id);
        if (!crop) return;
        setGardenGameState(scene, sellChristmasCrop(state, crop, amount));
        this.refresh(getGameState(scene));
      };
      const sellOne = place(`card.${i}.sellOne`, x - 36, y + (christmasSales ? 44 : 42), new Button(scene, 0, 0, 64, 20, exchangeWords.sellOne, COLORS.serve, () => sell(1)).setFontSize(11));
      const sellAll = place(`card.${i}.sellAll`, x + 36, y + (christmasSales ? 44 : 42), new Button(scene, 0, 0, 64, 20, exchangeWords.sellAll, COLORS.serve, () => sell('all')).setFontSize(11));
      this.cards.push({ back, image, name, count, rate, sellOne, sellAll });
    }
    this.help = place('help', 320, 324, scene.add.text(0, 0, '', {
      ...TEXT.body, fontSize: '11px', align: 'center', wordWrap: { width: 506 },
    }).setOrigin(0.5));
    this.refresh(getGameState(scene));
    arrangeablePanel(scene, screen, 'panel', this);
    if (christmasSales) {
      const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
      scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
      this.once(Phaser.GameObjects.Events.DESTROY, () => scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey));
    }
  }

  private entries(state: GameState) {
    const entries = inventoryEntries(state, this.tab);
    return this.christmasSales ? entries.filter(entry => exchangeCrop(entry.id)) : entries;
  }

  refresh(state: GameState): void {
    this.tickets.setText(exchangeWords.balance.replace('{amount}', String(state.christmasTickets)));
    const entries = this.entries(state);
    entries.forEach((entry, i) => {
      const card = this.cards[i], faded = entry.locked || entry.amount === 0;
      card.image.setTexture(artKey(entry.art as ArtName), 0).setAlpha(faded ? 0.4 : 1);
      card.back.setAlpha(faded ? 0.65 : 1);
      card.name.setText(entry.name);
      card.count.setText(entry.locked ? words.locked : `x${entry.amount}`);
      const crop = exchangeCrop(entry.id);
      card.rate.setVisible(!!crop).setText(crop ? CHRISTMAS_TICKET_RATES[crop] === 1 ? exchangeWords.rateOne : exchangeWords.rate.replace('{amount}', String(CHRISTMAS_TICKET_RATES[crop])) : '');
      card.sellOne.setVisible(!!crop).setEnabled(!!crop && entry.amount > 0);
      card.sellAll.setVisible(!!crop).setEnabled(!!crop && entry.amount > 0);
    });
    for (const tab of this.tabs) tab.button.setAlpha(tab.key === this.tab ? 1 : 0.6);
    this.help.setText(this.tab === 'ingredients' ? words.ingredientsHelp
      : entries.some(entry => entry.amount > 0) ? exchangeWords.help : this.christmasSales ? merchantWords.emptySales : words.emptySeasonalHelp);
  }
}
