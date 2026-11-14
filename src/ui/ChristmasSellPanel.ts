import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { CROP_IDS } from '../data/crops';
import words from '../data/texts/cropExchange.json';
import merchantWords from '../data/texts/christmasMerchant.json';
import { CHRISTMAS_TICKET_RATES, sellChristmasCrop } from '../logic/cropExchange';
import type { GameState } from '../logic/gameState';
import { getGameState, setGardenGameState } from '../scenes/gameStore';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** Live fields sit within the supplied board's original badges and card insets. */
export class ChristmasSellPanel extends Phaser.GameObjects.Container {
  private readonly balance: Phaser.GameObjects.Text;
  private readonly ticket: Phaser.GameObjects.Image;
  private readonly help: Phaser.GameObjects.Text;
  private readonly cards: { count: Phaser.GameObjects.Text; one: Button; all: Button; oneArt: Phaser.GameObjects.Image; allArt: Phaser.GameObjects.Image }[] = [];

  constructor(scene: Phaser.Scene, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('christmasSell');
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.65).setOrigin(0).setInteractive());
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Zone>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint('christmasSell', name, { x, y });
      object.setName(name).setPosition(at.x, at.y);
      this.add(object);
      arrangeable(scene, 'christmasSell', name, at, object);
      return object;
    };
    place('board', 320, 180, addArt(scene, 0, 0, 'christmasSellBoard'));
    // Centre the whole icon-and-text group, including longer saved balances.
    const balanceGroup = place('ticketBalance', 320, 101, scene.add.container());
    this.ticket = addArt(scene, 0, 0, 'christmasTicket');
    this.balance = scene.add.text(0, 0, '', { ...TEXT.heading, fontSize: '13px' }).setOrigin(0, 0.5);
    balanceGroup.add([this.ticket, this.balance]);
    place('close', 509, 79, scene.add.zone(0, 0, 60, 24).setInteractive({ useHandCursor: true }).on('pointerup', close));
    CROP_IDS.forEach((crop, i) => {
      const x = 170 + i * 149;
      const count = place(`card.${i}.count`, x, 207, scene.add.text(0, 0, '', { ...TEXT.heading, fontSize: '12px' }).setOrigin(0.5));
      const rate = CHRISTMAS_TICKET_RATES[crop];
      const rateGroup = place(`card.${i}.rate`, x, 225, scene.add.container());
      const label = scene.add.text(0, 0, rate === 1 ? words.rateOne : words.rate.replace('{amount}', String(rate)), {
        ...TEXT.heading, fontSize: '10px',
      }).setOrigin(0, 0.5);
      const width = 20 + 5 + label.width;
      rateGroup.add([addArt(scene, -width / 2 + 10, 0, 'christmasTicketSmall'), label.setX(-width / 2 + 25)]);
      const sell = (amount: number | 'all') => {
        setGardenGameState(scene, sellChristmasCrop(getGameState(scene), crop, amount));
        this.refresh();
      };
      const oneArt = addArt(scene, 0, 0, 'christmasSellOne');
      const allArt = addArt(scene, 0, 0, 'christmasSellAll');
      const one = place(`card.${i}.sellOne`, x - 32, 250, new Button(scene, 0, 0, 60, 25, '', COLORS.serve, () => sell(1)).setIcon(oneArt).setBackgroundVisible(false));
      const all = place(`card.${i}.sellAll`, x + 32, 250, new Button(scene, 0, 0, 60, 25, '', COLORS.serve, () => sell('all')).setIcon(allArt).setBackgroundVisible(false));
      this.cards.push({ count, one, all, oneArt, allArt });
    });
    this.help = place('help', 320, 299, scene.add.text(0, 0, '', {
      ...TEXT.heading, fontSize: '9px', align: 'center', wordWrap: { width: 260 }, lineSpacing: 2,
    }).setOrigin(0.5));
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.repeat) close(); };
    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey));
    this.refresh();
    arrangeablePanel(scene, 'christmasSell', 'panel', this);
  }

  refresh(state: GameState = getGameState(this.scene)): void {
    this.balance.setFontSize(13).setText(words.balance.replace('{amount}', String(state.christmasTickets)));
    // The reference's decorative rays bound the header; long balances stay inside.
    if (this.balance.width > 160) this.balance.setFontSize(Math.max(8, Math.floor(13 * 160 / this.balance.width)));
    const width = 30 + 8 + this.balance.width;
    this.ticket.setX(-width / 2 + 15);
    this.balance.setX(-width / 2 + 38);
    CROP_IDS.forEach((crop, i) => {
      const card = this.cards[i], amount = state.garden.harvests.christmas[crop];
      card.count.setText(`x${amount}`).setFontSize(String(amount).length > 4 ? 9 : 12);
      card.one.setEnabled(amount > 0);
      card.all.setEnabled(amount > 0);
      // Keep the supplied disabled texture opaque instead of fading its outline.
      card.oneArt.setFrame(amount > 0 ? 0 : 1).setAlpha(1);
      card.allArt.setFrame(amount > 0 ? 0 : 1).setAlpha(1);
    });
    this.help.setText(CROP_IDS.some(crop => state.garden.harvests.christmas[crop] > 0) ? words.help : merchantWords.emptySales);
  }
}
