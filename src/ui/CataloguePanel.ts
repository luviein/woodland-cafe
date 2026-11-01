import Phaser from 'phaser';
import { PALETTE } from '../art/palette';
import { spriteSize } from '../art/pixelSprite';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { FURNITURE, type DesignId } from '../data/furniture';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT, css } from './theme';

// The catalogue (GAME_DESIGN.md §5.10): a book that opens from its cover to
// two pages of item cards, with tabs down the side for its sections. In the
// cafe's own look: wood, cream paper and the edition's colours on the cover.

/** One section of the catalogue, with a tab down the side. */
export interface CatalogueTab {
  name: string;
  designs: readonly DesignId[];
}

export interface CatalogueBook {
  title: string;
  edition: string;
  tabs: readonly CatalogueTab[];
  /** Sprites standing in the cover's snowy picture, left to right. */
  cover: readonly ArtName[];
}

/** What the catalogue needs from the game: what's owned and the wallet, and how to buy. */
export interface CatalogueShop {
  leaves: () => number;
  /** How many of a design the player has, placed or stored. */
  owned: (design: DesignId) => number;
  canBuy: (design: DesignId) => boolean;
  buy: (design: DesignId) => void;
}

const CARDS_PER_PAGE = 4;
// The open book: two pages either side of the spine, tabs down the right edge.
const BOOK = { left: 20, top: 30, width: 572, height: 300 };
const PAGE_WIDTH = (BOOK.width - 24) / 2;
const CARD = { width: 124, height: 118, gap: 8 };
const HEADER = 34;
const TAB = { x: BOOK.left + BOOK.width + 14, width: 26, height: 84, gap: 6 };
const COVER = { width: 260, height: 300 };
/** Art in a card fits a box this tall (whole-number scales only: pixel art stays crisp). */
const ART_BOX = 52;
const SMALL = { ...TEXT.body, fontSize: '10px', color: css(COLORS.counterEdge) };
const NAME = { ...TEXT.heading, fontSize: '12px' };

/**
 * A catalogue over the scene: its cover first (tap to open), then the book.
 * Cards are rebuilt when the page or tab changes, never by a purchase:
 * refresh() only updates the wallet, counts and price buttons, so a button
 * isn't destroyed under the finger that tapped it.
 */
export class CataloguePanel extends Phaser.GameObjects.Container {
  private tab = 0;
  private spread = 0;
  private cover!: Phaser.GameObjects.Container;
  private book!: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.GameObject[] = [];
  private cardViews: { design: DesignId; button: Button; owned: Phaser.GameObjects.Text }[] = [];
  private tabButtons: Button[] = [];
  private wallet!: Phaser.GameObjects.Text;
  private pageLabel!: Phaser.GameObjects.Text;
  private sectionLabel!: Phaser.GameObjects.Text;
  private prevPage!: Button;
  private nextPage!: Button;
  private readonly onKey: (event: KeyboardEvent) => void;

  constructor(
    scene: Phaser.Scene,
    private readonly catalogue: CatalogueBook,
    private readonly shop: CatalogueShop,
    private readonly onClose: () => void,
  ) {
    super(scene, 0, 0);
    // The dim layer takes taps, so nothing behind the catalogue can be pressed.
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.5).setOrigin(0).setInteractive());
    this.createCover();
    this.createBook();
    this.book.setVisible(false);
    this.onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
      else if (!this.book.visible && (event.key === 'Enter' || event.key === ' ')) this.open();
      else if (event.key === 'ArrowLeft') this.turn(-1);
      else if (event.key === 'ArrowRight') this.turn(1);
    };
    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey);
    scene.add.existing(this);
  }

  override destroy(fromScene?: boolean): void {
    this.scene?.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey);
    super.destroy(fromScene);
  }

  /** The wallet, counts and price buttons, from the game as it is now. */
  refresh(): void {
    this.wallet.setText(`🍃${this.shop.leaves()}`);
    for (const { design, button, owned } of this.cardViews) {
      button.setEnabled(this.shop.canBuy(design));
      const n = this.shop.owned(design);
      owned.setText(n > 0 ? `have ${n}` : '');
    }
  }

  // ---- The cover ----------------------------------------------------------

  /** A container centred on the screen, so it can be flipped (squashed sideways) around its middle. */
  private centred(): Phaser.GameObjects.Container {
    const c = this.scene.add.container(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    this.add(c);
    return c;
  }

  private createCover(): void {
    const s = this.scene;
    const c = (this.cover = this.centred());
    const w = COVER.width, h = COVER.height;
    // A green cloth cover with a gold frame and corner studs.
    c.add(s.add.rectangle(0, 0, w, h, PALETTE.forest).setStrokeStyle(3, COLORS.ink).setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.open()));
    c.add(s.add.rectangle(0, 0, w - 16, h - 16).setStrokeStyle(2, PALETTE.gold));
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.add(s.add.rectangle(x * (w / 2 - 8), y * (h / 2 - 8), 6, 6, PALETTE.gold));
    // The title on a cream plate.
    const plateY = -h / 2 + 46;
    c.add(s.add.rectangle(0, plateY, w - 48, 52, COLORS.paper).setStrokeStyle(2, COLORS.ink));
    c.add(s.add.text(0, plateY - 12, this.catalogue.title, { ...TEXT.body, fontSize: '11px' }).setOrigin(0.5));
    c.add(s.add.text(0, plateY + 8, 'CATALOGUE', { ...TEXT.heading, fontSize: '18px', color: css(PALETTE.wine) }).setOrigin(0.5));
    c.add(s.add.text(0, plateY + 40, this.catalogue.edition, { ...TEXT.heading, color: css(PALETTE.gold) }).setOrigin(0.5));
    // A snowy picture: the edition's pieces standing in the snow, snowflakes above.
    const ground = 70;
    c.add(s.add.ellipse(0, ground, w - 50, 34, PALETTE.white));
    const flakes = [[-90, -40], [-60, -10], [-100, 20], [70, -50], [95, -15], [50, 10], [-20, -55], [15, -30], [100, 35], [-75, 45]];
    for (const [x, y] of flakes) c.add(s.add.rectangle(x, y, 2, 2, PALETTE.white));
    const spacing = (w - 90) / Math.max(1, this.catalogue.cover.length - 1);
    this.catalogue.cover.forEach((art, i) => {
      const x = -(w - 90) / 2 + i * spacing;
      c.add(addArt(s, x, ground + 6, art).setOrigin(0.5, 1).setScale(2));
    });
    const tap = s.add.text(0, h / 2 - 22, 'Tap to open', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0.5);
    c.add(tap);
    s.tweens.add({ targets: tap, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    c.add(this.closeButton(w / 2 - 4, -h / 2 + 4));
  }

  private closeButton(x: number, y: number): Button {
    return new Button(this.scene, x, y, 24, 24, 'X', COLORS.reset, () => this.close());
  }

  /** Flips the cover open: it squashes shut sideways, then the book opens out the same way. */
  private open(): void {
    if (this.book.visible || !this.cover.visible) return;
    this.scene.tweens.add({
      targets: this.cover,
      scaleX: 0,
      duration: 140,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.cover.setVisible(false);
        this.book.setVisible(true).setScale(0, 1);
        this.scene.tweens.add({ targets: this.book, scaleX: 1, duration: 160, ease: 'Quad.easeOut' });
      },
    });
  }

  private close(): void {
    this.scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey);
    this.onClose();
  }

  // ---- The book -------------------------------------------------------------

  /** Screen position to the centred book container's own coordinates. */
  private at(x: number, y: number): [number, number] {
    return [x - BASE_WIDTH / 2, y - BASE_HEIGHT / 2];
  }

  private createBook(): void {
    const s = this.scene;
    const b = (this.book = this.centred());
    const { left, top, width, height } = BOOK;
    // Wooden covers behind two cream pages, with a shadow down the spine.
    b.add(s.add.rectangle(...this.at(left + width / 2, top + height / 2), width, height, COLORS.counter).setStrokeStyle(3, COLORS.ink));
    const pageY = top + height / 2;
    b.add(s.add.rectangle(...this.at(left + 8 + PAGE_WIDTH / 2, pageY), PAGE_WIDTH, height - 16, COLORS.paper));
    b.add(s.add.rectangle(...this.at(left + width - 8 - PAGE_WIDTH / 2, pageY), PAGE_WIDTH, height - 16, COLORS.paper));
    b.add(s.add.rectangle(...this.at(left + width / 2, pageY), 8, height - 16, COLORS.paperEdge));
    // The header along the left page: section and edition; page arrows; the wallet on the right page.
    const headerY = top + 8 + HEADER / 2;
    b.add(s.add.rectangle(...this.at(left + 8 + PAGE_WIDTH / 2, headerY), PAGE_WIDTH, HEADER, PALETTE.wine));
    this.sectionLabel = s.add.text(...this.at(left + 18, headerY), '', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0, 0.5);
    b.add(this.sectionLabel);
    b.add(s.add.text(...this.at(left + 18, headerY + 11), this.catalogue.edition, { ...SMALL, color: css(PALETTE.gold) }).setOrigin(0, 0.5));
    const arrowsX = left + 8 + PAGE_WIDTH - 56;
    this.prevPage = new Button(s, ...this.at(arrowsX - 30, headerY), 22, 22, '<', COLORS.book, () => this.turn(-1));
    this.nextPage = new Button(s, ...this.at(arrowsX + 30, headerY), 22, 22, '>', COLORS.book, () => this.turn(1));
    this.pageLabel = s.add.text(...this.at(arrowsX, headerY), '', { ...TEXT.body, color: css(COLORS.paper) }).setOrigin(0.5);
    b.add([this.prevPage, this.nextPage, this.pageLabel]);
    const rightPageLeft = left + width - 8 - PAGE_WIDTH;
    b.add(s.add.rectangle(...this.at(rightPageLeft + PAGE_WIDTH - 50, headerY), 84, 24, COLORS.counterEdge).setStrokeStyle(2, COLORS.ink));
    this.wallet = s.add.text(...this.at(rightPageLeft + PAGE_WIDTH - 50, headerY), '', { ...TEXT.heading, color: css(PALETTE.gold) }).setOrigin(0.5);
    b.add(this.wallet);
    b.add(this.closeButton(...this.at(left + width - 2, top + 2)));
    // A tab per section down the right edge, its name running down it.
    this.tabButtons = this.catalogue.tabs.map((tab, i) => {
      const y = top + 16 + TAB.height / 2 + i * (TAB.height + TAB.gap);
      const button = new Button(s, ...this.at(TAB.x, y), TAB.width, TAB.height, '', COLORS.book, () => this.showTab(i));
      button.add(s.add.text(0, 0, tab.name, { ...TEXT.body, fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setAngle(90));
      b.add(button);
      return button;
    });
    this.showTab(0);
  }

  private spreads(): number {
    return Math.max(1, Math.ceil(this.catalogue.tabs[this.tab].designs.length / (CARDS_PER_PAGE * 2)));
  }

  private showTab(i: number): void {
    this.tab = i;
    this.spread = 0;
    this.tabButtons.forEach((button, j) => button.setAlpha(j === i ? 1 : 0.6));
    this.showSpread();
  }

  private turn(by: number): void {
    if (!this.book.visible) return;
    const to = Phaser.Math.Clamp(this.spread + by, 0, this.spreads() - 1);
    if (to === this.spread) return;
    this.spread = to;
    this.showSpread();
  }

  /** Builds the two pages of cards for the current tab and spread. */
  private showSpread(): void {
    for (const o of this.cards) o.destroy();
    this.cards = [];
    this.cardViews = [];
    const tab = this.catalogue.tabs[this.tab];
    this.sectionLabel.setText(tab.name);
    this.pageLabel.setText(`${this.spread + 1}/${this.spreads()}`);
    this.prevPage.setEnabled(this.spread > 0);
    this.nextPage.setEnabled(this.spread < this.spreads() - 1);
    const perSpread = CARDS_PER_PAGE * 2;
    const designs = tab.designs.slice(this.spread * perSpread, (this.spread + 1) * perSpread);
    designs.forEach((design, i) => {
      const page = Math.floor(i / CARDS_PER_PAGE);
      const slot = i % CARDS_PER_PAGE;
      const pageLeft = page === 0 ? BOOK.left + 8 : BOOK.left + BOOK.width - 8 - PAGE_WIDTH;
      const gridWidth = 2 * CARD.width + CARD.gap;
      const x = pageLeft + (PAGE_WIDTH - gridWidth) / 2 + (slot % 2) * (CARD.width + CARD.gap);
      const y = BOOK.top + 8 + HEADER + 8 + Math.floor(slot / 2) * (CARD.height + CARD.gap);
      this.createCard(design, x, y);
    });
    this.refresh();
  }

  /** One item: its picture, name, a line about it, how many you have, and its price to buy one. */
  private createCard(design: DesignId, x: number, y: number): void {
    const s = this.scene;
    const def = FURNITURE[design];
    const midX = x + CARD.width / 2;
    const parts: Phaser.GameObjects.GameObject[] = [];
    parts.push(s.add.rectangle(...this.at(midX, y + CARD.height / 2), CARD.width, CARD.height, PALETTE.white).setStrokeStyle(2, COLORS.paperEdge));
    // The picture, as big as fits at a whole-number scale, standing on the art box's bottom.
    const { width, height } = spriteSize(SPRITE_ART[def.art]);
    const scale = Phaser.Math.Clamp(Math.floor(ART_BOX / Math.max(width, height)), 1, 3);
    parts.push(addArt(s, ...this.at(midX, y + 6 + ART_BOX), def.art).setOrigin(0.5, 1).setScale(scale));
    const name = s.add.text(...this.at(midX, y + ART_BOX + 10), def.name, { ...NAME, align: 'center', wordWrap: { width: CARD.width - 8 } }).setOrigin(0.5, 0);
    parts.push(name);
    // Right under the name, however many lines it took.
    parts.push(s.add.text(name.x, name.y + name.height + 1, def.blurb, { ...SMALL, align: 'center', wordWrap: { width: CARD.width - 10 } }).setOrigin(0.5, 0));
    const button = new Button(s, ...this.at(x + 40, y + CARD.height - 14), 64, 20, `🍃${def.price}`, COLORS.serve, () => {
      if (this.shop.canBuy(design)) this.shop.buy(design);
    });
    const owned = s.add.text(...this.at(x + CARD.width - 8, y + CARD.height - 14), '', SMALL).setOrigin(1, 0.5);
    parts.push(button, owned);
    this.book.add(parts);
    this.cards.push(...parts);
    this.cardViews.push({ design, button, owned });
  }
}
