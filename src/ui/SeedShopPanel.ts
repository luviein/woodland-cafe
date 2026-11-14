import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import type { CropEvent, CropId, SeedType } from '../data/crops';
import words from '../data/texts/seedShop.json';
import type { ArtName } from '../art/spriteArt';
import type { GameState } from '../logic/gameState';
import { seedShopEntries } from '../logic/seedShop';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { getGameState } from '../scenes/gameStore';
import { addArt, artKey } from './art';
import { Button } from './Button';
import { LeafText } from './LeafText';
import { COLORS, TEXT, css } from './theme';

/** The supplied board owns its decoration; rows overlay only live shop information. */
export class SeedShopPanel extends Phaser.GameObjects.Container {
  private page = 0;
  private entries: ReturnType<typeof seedShopEntries> = [];
  private readonly rows: {
    packet: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; price: LeafText;
    owned: Phaser.GameObjects.Image; locked: Phaser.GameObjects.Image; status: Phaser.GameObjects.Text; lockedStatus: Phaser.GameObjects.Text;
    button: Button; buttonArt: Phaser.GameObjects.Image;
  }[] = [];
  private readonly previousButton: Button;
  private readonly nextButton: Button;
  private readonly pageLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly event: () => CropEvent | null,
    buy: (crop: CropId, seed: SeedType) => void, close: () => void) {
    super(scene, 0, 0);
    this.setName('seedShop');
    scene.add.existing(this);
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.65).setOrigin(0).setInteractive());
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Text>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint('seedShop', name, { x, y });
      object.setName(name).setPosition(at.x, at.y);
      this.add(object);
      arrangeable(scene, 'seedShop', name, at, object);
      return object;
    };
    place('board', 320, 180, addArt(scene, 0, 0, 'seedShopBoard'));
    [131,172,213,256].forEach((y, i) => {
      const packet = place(`row.${i}.packet`, 156, y, addArt(scene, 0, 0, 'seedPacketMushroom'));
      // Every packet uses the same native scale as the pouch, preserving its own artwork.
      const name = place(`row.${i}.name`, 186, y, scene.add.text(0, 0, '', {
        ...TEXT.heading, fontSize: '11px', lineSpacing: 1,
      }).setOrigin(0, 0.5));
      const price = place(`row.${i}.price`, 321, y, new LeafText(scene, 0, 0, '', { ...TEXT.heading, fontSize: '14px' }, 0.5, 0.5));
      const owned = place(`row.${i}.ownedBadge`, 386, y, addArt(scene, 0, 0, 'seedShopOwnedBadge'));
      const locked = place(`row.${i}.lockedBadge`, 398, y, addArt(scene, 0, 0, 'seedShopLockedBadge'));
      const status = place(`row.${i}.status`, 386, y, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px' }).setOrigin(0.5));
      const lockedStatus = place(`row.${i}.lockedStatus`, 398, y, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '8px' }).setOrigin(0.5));
      const buttonArt = addArt(scene, 0, 0, 'seedShopBuy');
      const button = place(`row.${i}.buy`, 480, y, new Button(scene, 0, 0, 56, 28, '', COLORS.serve, () => {
        const entry = this.entries[this.page * 4 + i];
        if (entry) buy(entry.crop, entry.seed);
      }).setIcon(buttonArt).setSound('buy'));
      (button.getAt(0) as Phaser.GameObjects.Rectangle).setVisible(false);
      this.rows.push({ packet, name, price, owned, locked, status, lockedStatus, button, buttonArt });
    });
    const closeButton = place('close', 320, 301, new Button(scene, 0, 0, 126, 32, '', COLORS.reset, close));
    (closeButton.getAt(0) as Phaser.GameObjects.Rectangle).setVisible(false);
    // The reference already contains the red Close button and its lettering.
    this.previousButton = place('previous', 238, 301, new Button(scene, 0, 0, 24, 22, '<', COLORS.counter, () => { this.page--; this.refresh(); }));
    this.nextButton = place('next', 402, 301, new Button(scene, 0, 0, 24, 22, '>', COLORS.counter, () => { this.page++; this.refresh(); }));
    this.pageLabel = place('page', 320, 328, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '9px', color: css(COLORS.paper), stroke: css(COLORS.ink), strokeThickness: 1 }).setOrigin(0.5));
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.repeat) close(); };
    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey));
    this.refresh();
    arrangeablePanel(scene, 'seedShop', 'panel', this);
  }

  refresh(state: GameState = getGameState(this.scene)): void {
    this.entries = seedShopEntries(state, this.event());
    const pages = Math.ceil(this.entries.length / 4);
    this.page = Math.max(0, Math.min(pages - 1, this.page));
    this.rows.forEach((row, i) => {
      const entry = this.entries[this.page * 4 + i];
      for (const object of [row.packet, row.name, row.price, row.status, row.button]) object.setVisible(!!entry);
      row.owned.setVisible(!!entry && !entry.locked && !entry.outOfSeason);
      row.locked.setVisible(!!entry && (entry.locked || entry.outOfSeason));
      row.status.setVisible(row.owned.visible);
      row.lockedStatus.setVisible(row.locked.visible);
      if (!entry) return;
      row.packet.setTexture(artKey(entry.art as ArtName), 0);
      row.name.setText(`${entry.seed === 'christmas' ? words.christmas + '\n' : ''}${entry.name} ${words.seed}`);
      row.price.setText(`🍃${entry.price}`);
      row.status.setText(`${words.owned} ${entry.owned}`);
      row.lockedStatus.setText(entry.locked ? words.locked : words.outOfSeason);
      row.button.setEnabled(entry.enabled);
      row.buttonArt.setFrame(entry.enabled ? 0 : 1).setAlpha(1);
    });
    this.previousButton.setEnabled(this.page > 0);
    this.nextButton.setEnabled(this.page < pages - 1);
    this.pageLabel.setText(`${this.page + 1} / ${pages}`);
  }
}
