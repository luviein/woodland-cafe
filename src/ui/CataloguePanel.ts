import Phaser from 'phaser';
import { PALETTE } from '../art/palette';
import type { ArtName } from '../art/spriteArt';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { FURNITURE, type DesignId } from '../data/furniture';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT, css } from './theme';

// The catalogue (GAME_DESIGN.md §5.10): a book. Closed, it shows its cover;
// tapped, the cover swings open on the spine to two pages of item cards.
// Tapping a page's folded bottom corner turns the page. Tabs down the side
// for its sections. In the cafe's own look: wood, cream paper and the
// edition's colours on the cover.
//
// How the turning works: every page is its own container whose origin is
// on the spine, so squashing it sideways (scaleX 1 -> 0) folds it toward the
// spine, and growing it (0 -> 1) unfolds it away from the spine. A page turn
// is the old page folding in, uncovering the page under it, then the back of
// the turned page unfolding on the other side.

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

/** Two tall cards side by side on each page, so every picture fits at the same scale. */
const CARDS_PER_PAGE = 2;
// The open book: two pages either side of the spine, tabs down the right edge.
const BOOK = { left: 20, top: 30, width: 572, height: 300 };
const SPINE_X = BOOK.left + BOOK.width / 2;
const HALF = BOOK.width / 2;
/** Paper inset from the board's edge, and the gap each page leaves at the spine. */
const MARGIN = 8;
const SPINE_GAP = 4;
const PAGE_WIDTH = HALF - MARGIN - SPINE_GAP;
const CARD = { width: 124, height: 214, gap: 8 };
const HEADER = 34;
const TAB = { x: BOOK.left + BOOK.width + 14, width: 26, height: 84, gap: 6 };
/** The folded corner you tap to turn a page. */
const CORNER = 22;
/** How long each half of a page turn takes (fold in, unfold), ms. */
const TURN_MS = 170;
/**
 * Every picture at the same scale, so sizes compare as they do in the cafe
 * (the tree taller than the poinsettia). 2x keeps pixel art crisp, and the
 * tallest piece (the tree, 36) fits the picture box.
 */
const ART_SCALE = 2;
const ART_BOX = 84;
const SMALL = { ...TEXT.body, fontSize: '10px', color: css(COLORS.counterEdge) };
const NAME = { ...TEXT.heading, fontSize: '12px' };

type Side = 'left' | 'right';

/** A page on screen: its container (origin on the spine) and what refresh() updates on it. */
interface Page {
  side: Side;
  container: Phaser.GameObjects.Container;
  cards: { design: DesignId; button: Button; owned: Phaser.GameObjects.Text }[];
  /** Only on the right page: "Your leaves:", the leaf, the amount. */
  wallet?: { label: Phaser.GameObjects.Text; leaf: Phaser.GameObjects.Image; amount: Phaser.GameObjects.Text };
}

/**
 * A catalogue over the scene: its cover first (tap to open), then the book.
 * Pages are rebuilt when the spread or tab changes, never by a purchase:
 * refresh() only updates the wallet, counts and price buttons, so a button
 * isn't destroyed under the finger that tapped it.
 */
export class CataloguePanel extends Phaser.GameObjects.Container {
  private tab = 0;
  private spread = 0;
  private opened = false;
  /** A page turn (or the opening) is playing: further turns wait for it. */
  private busy = false;
  /** Everything that slides: the closed book sits centred, the open one further left. */
  private stage!: Phaser.GameObjects.Container;
  private cover!: Phaser.GameObjects.Container;
  private book!: Phaser.GameObjects.Container;
  private leftBoard!: Phaser.GameObjects.Rectangle;
  private pages: { left: Page; right: Page } | null = null;
  private tabButtons: Button[] = [];
  /** The tabs and Close: shown once the book is open. */
  private openOnly: Button[] = [];
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
    // Closed, only the right half (the front cover) shows: centre it on the screen.
    this.stage = scene.add.container(BASE_WIDTH / 2 - (SPINE_X + HALF / 2), 0);
    this.add(this.stage);
    this.createBook();
    this.createCover();
    this.onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
      else if (!this.opened && (event.key === 'Enter' || event.key === ' ')) this.open();
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
    if (!this.pages) return;
    const wallet = this.pages.right.wallet;
    if (wallet) {
      // Laid out right to left from the page's edge: "Your leaves: (leaf) 120".
      const right = PAGE_WIDTH + SPINE_GAP - 12;
      wallet.amount.setText(String(this.shop.leaves())).setX(right);
      wallet.leaf.setX(right - wallet.amount.width - 4);
      wallet.label.setX(wallet.leaf.x - wallet.leaf.displayWidth - 4);
    }
    for (const page of [this.pages.left, this.pages.right]) {
      for (const { design, button, owned } of page.cards) {
        button.setEnabled(this.shop.canBuy(design));
        const n = this.shop.owned(design);
        owned.setText(n > 0 ? `have ${n}` : '');
      }
    }
  }

  private close(): void {
    this.scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKey);
    this.onClose();
  }

  private closeButton(x: number, y: number): Button {
    return new Button(this.scene, x, y, 24, 24, 'X', COLORS.reset, () => this.close());
  }

  // ---- The cover ------------------------------------------------------------

  /** The front cover: the right half of the book, hinged on the spine (its container's origin). */
  private createCover(): void {
    const s = this.scene;
    const c = (this.cover = s.add.container(SPINE_X, 0));
    this.stage.add(c);
    const w = HALF, h = BOOK.height, top = BOOK.top, cx = w / 2, cy = top + h / 2;
    // A green cloth cover with a gold frame and corner studs.
    c.add(
      s.add
        .rectangle(cx, cy, w, h, PALETTE.forest)
        .setStrokeStyle(3, COLORS.ink)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.open()),
    );
    c.add(s.add.rectangle(cx, cy, w - 16, h - 16).setStrokeStyle(2, PALETTE.gold));
    for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.add(s.add.rectangle(cx + x * (w / 2 - 8), cy + y * (h / 2 - 8), 6, 6, PALETTE.gold));
    // The title on a cream plate.
    const plateY = top + 46;
    c.add(s.add.rectangle(cx, plateY, w - 48, 52, COLORS.paper).setStrokeStyle(2, COLORS.ink));
    c.add(s.add.text(cx, plateY - 12, this.catalogue.title, { ...TEXT.body, fontSize: '11px' }).setOrigin(0.5));
    c.add(s.add.text(cx, plateY + 8, 'CATALOGUE', { ...TEXT.heading, fontSize: '18px', color: css(PALETTE.wine) }).setOrigin(0.5));
    c.add(s.add.text(cx, plateY + 40, this.catalogue.edition, { ...TEXT.heading, color: css(PALETTE.gold) }).setOrigin(0.5));
    // A snowy picture: the edition's pieces standing in the snow, snowflakes above.
    const ground = cy + 70;
    c.add(s.add.ellipse(cx, ground, w - 50, 34, PALETTE.white));
    const flakes = [[-90, -40], [-60, -10], [-100, 20], [70, -50], [95, -15], [50, 10], [-20, -55], [15, -30], [100, 35], [-75, 45]];
    for (const [x, y] of flakes) c.add(s.add.rectangle(cx + x, cy + y, 2, 2, PALETTE.white));
    const spread = w - 100;
    const spacing = spread / Math.max(1, this.catalogue.cover.length - 1);
    this.catalogue.cover.forEach((art, i) => {
      c.add(addArt(s, cx - spread / 2 + i * spacing, ground + 6, art).setOrigin(0.5, 1).setScale(2));
    });
    const tap = s.add.text(cx, top + h - 22, 'Tap to open', { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0.5);
    c.add(tap);
    s.tweens.add({ targets: tap, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    c.add(this.closeButton(w - 4, top + 4));
  }

  /**
   * Opens the book: the cover swings over on its spine (folding in toward
   * it), the book slides from the middle of the screen to its open place, and
   * the inside of the cover with the first left page unfolds on the left.
   */
  private open(): void {
    if (this.opened || this.busy) return;
    this.busy = true;
    const s = this.scene;
    s.tweens.add({ targets: this.stage, x: 0, duration: TURN_MS * 2, ease: 'Quad.easeInOut' });
    s.tweens.add({
      targets: this.cover,
      scaleX: 0,
      duration: TURN_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.cover.setVisible(false);
        this.leftBoard.setVisible(true).setScale(0, 1);
        this.pages!.left.container.setVisible(true).setScale(0, 1);
        s.tweens.add({
          targets: [this.leftBoard, this.pages!.left.container],
          scaleX: 1,
          duration: TURN_MS,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.opened = true;
            this.busy = false;
            for (const o of this.openOnly) o.setVisible(true);
          },
        });
      },
    });
  }

  // ---- The book --------------------------------------------------------------

  private createBook(): void {
    const s = this.scene;
    const b = (this.book = s.add.container(0, 0));
    this.stage.add(b);
    const { top, height } = BOOK;
    // The wooden boards: each hinged on the spine (origin at the spine edge).
    this.leftBoard = s.add.rectangle(SPINE_X, top, HALF, height, COLORS.counter).setOrigin(1, 0).setStrokeStyle(3, COLORS.ink).setVisible(false);
    b.add([this.leftBoard, s.add.rectangle(SPINE_X, top, HALF, height, COLORS.counter).setOrigin(0, 0).setStrokeStyle(3, COLORS.ink)]);
    // Tabs down the right edge (a section each, its name running down it) and Close: shown once open.
    this.tabButtons = this.catalogue.tabs.map((tab, i) => {
      const y = top + 16 + TAB.height / 2 + i * (TAB.height + TAB.gap);
      const button = new Button(s, TAB.x, y, TAB.width, TAB.height, '', COLORS.book, () => this.showTab(i));
      button.add(s.add.text(0, 0, tab.name, { ...TEXT.body, fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setAngle(90));
      return button;
    });
    const close = this.closeButton(BOOK.left + BOOK.width - 2, top + 2);
    this.openOnly = [...this.tabButtons, close];
    for (const o of this.openOnly) o.setVisible(false);
    b.add(this.openOnly);
    this.showTab(0);
  }

  private spreads(): number {
    return Math.max(1, Math.ceil(this.catalogue.tabs[this.tab].designs.length / (CARDS_PER_PAGE * 2)));
  }

  /** Another section: its first spread, straight away (no page turn). */
  private showTab(i: number): void {
    if (this.busy) return;
    this.tab = i;
    this.spread = 0;
    this.tabButtons.forEach((button, j) => button.setAlpha(j === i ? 1 : 0.6));
    if (this.pages) for (const p of [this.pages.left, this.pages.right]) p.container.destroy();
    this.pages = { left: this.createPage('left', 0), right: this.createPage('right', 0) };
    // Before opening, the left page is folded away under the cover.
    if (!this.opened) this.pages.left.container.setVisible(false);
    this.book.add([this.pages.left.container, this.pages.right.container]);
    this.book.bringToTop(this.leftBoard);
    this.book.bringToTop(this.pages.left.container);
    this.book.bringToTop(this.pages.right.container);
    for (const o of this.openOnly) this.book.bringToTop(o);
    this.refresh();
  }

  /**
   * Turns a page: forward (1), the right page folds in to the spine,
   * uncovering the next right page, then its back unfolds on the left as the
   * next left page. Back (-1) is the mirror of that.
   */
  private turn(by: 1 | -1): void {
    if (!this.opened || this.busy || !this.pages) return;
    const to = this.spread + by;
    if (to < 0 || to >= this.spreads()) return;
    this.busy = true;
    this.spread = to;
    const old = this.pages;
    const next = { left: this.createPage('left', to), right: this.createPage('right', to) };
    // The page that's uncovered goes under the one turning away; the one landing goes on top, folded flat to start.
    const [leaving, under, landing, covered] = by === 1 ? [old.right, next.right, next.left, old.left] : [old.left, next.left, next.right, old.right];
    this.book.addAt(under.container, this.book.getIndex(leaving.container));
    this.book.add(landing.container.setScale(0, 1));
    for (const o of this.openOnly) this.book.bringToTop(o);
    this.pages = next;
    this.refresh();
    this.scene.tweens.add({
      targets: leaving.container,
      scaleX: 0,
      duration: TURN_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        leaving.container.destroy();
        this.scene.tweens.add({
          targets: landing.container,
          scaleX: 1,
          duration: TURN_MS,
          ease: 'Quad.easeOut',
          onComplete: () => {
            covered.container.destroy();
            this.busy = false;
          },
        });
      },
    });
  }

  /**
   * One page of a spread, in a container whose origin is on the spine (so
   * it folds toward it): paper, its cards, its page number, and the folded
   * corner to turn it when there's a page that way. The left page has the
   * section's heading; the right page the wallet.
   */
  private createPage(side: Side, spread: number): Page {
    const s = this.scene;
    const c = s.add.container(SPINE_X, 0);
    const dir = side === 'left' ? -1 : 1;
    // x of the page's outer and inner (spine-side) paper edges, in the container's coordinates.
    const inner = dir * SPINE_GAP;
    const outer = dir * (SPINE_GAP + PAGE_WIDTH);
    const leftEdge = Math.min(inner, outer);
    const top = BOOK.top + MARGIN, height = BOOK.height - 2 * MARGIN, bottom = top + height;
    c.add(s.add.rectangle(leftEdge, top, PAGE_WIDTH, height, COLORS.paper).setOrigin(0));
    // A soft shadow along the spine side, so the two pages read as a book.
    c.add(s.add.rectangle(inner, top, 3, height, COLORS.paperEdge).setOrigin(side === 'left' ? 1 : 0, 0));
    const page: Page = { side, container: c, cards: [] };
    const headerY = top + HEADER / 2;
    if (side === 'left') {
      c.add(s.add.rectangle(leftEdge, top, PAGE_WIDTH, HEADER, PALETTE.wine).setOrigin(0));
      c.add(s.add.text(leftEdge + 10, headerY - 4, this.catalogue.tabs[this.tab].name, { ...TEXT.heading, color: css(COLORS.paper) }).setOrigin(0, 0.5));
      c.add(s.add.text(leftEdge + 10, headerY + 9, this.catalogue.edition, { ...SMALL, color: css(PALETTE.gold) }).setOrigin(0, 0.5));
    } else {
      // The wallet, plain on the paper in dark ink; refresh() lays it out.
      page.wallet = {
        label: s.add.text(0, headerY, 'Your leaves:', TEXT.body).setOrigin(1, 0.5),
        leaf: addArt(s, 0, headerY, 'leaf').setOrigin(1, 0.5),
        amount: s.add.text(0, headerY, '', TEXT.heading).setOrigin(1, 0.5),
      };
      c.add([page.wallet.label, page.wallet.leaf, page.wallet.amount]);
    }
    // The cards.
    const perSpread = CARDS_PER_PAGE * 2;
    const first = spread * perSpread + (side === 'left' ? 0 : CARDS_PER_PAGE);
    const designs = this.catalogue.tabs[this.tab].designs.slice(first, first + CARDS_PER_PAGE);
    const rowWidth = CARDS_PER_PAGE * CARD.width + (CARDS_PER_PAGE - 1) * CARD.gap;
    designs.forEach((design, slot) => {
      const x = leftEdge + (PAGE_WIDTH - rowWidth) / 2 + slot * (CARD.width + CARD.gap);
      page.cards.push(this.createCard(c, design, x, top + HEADER + 8));
    });
    // The page number at the bottom, and the folded corner when there's a page to turn to.
    const number = spread * 2 + (side === 'left' ? 1 : 2);
    c.add(s.add.text(leftEdge + PAGE_WIDTH / 2, bottom - 9, String(number), SMALL).setOrigin(0.5));
    const canTurn = side === 'right' ? spread < this.spreads() - 1 : spread > 0;
    if (canTurn) c.add(this.createCorner(outer, bottom, dir, side === 'right' ? 1 : -1));
    return page;
  }

  /**
   * A page's bottom outer corner, folded up: tap it (or anywhere near it) to
   * turn the page that way. `dir` is which way is outward (-1 left, 1 right).
   */
  private createCorner(outerX: number, bottom: number, dir: number, turnBy: 1 | -1): Phaser.GameObjects.Container {
    const s = this.scene;
    const corner = s.add.container(outerX, bottom);
    // The fold: the paper's back showing as a triangle in the corner, with a crease along it.
    const fold = s.add.graphics();
    fold.fillStyle(COLORS.paperEdge).fillTriangle(0, 0, -dir * CORNER, 0, 0, -CORNER);
    fold.lineStyle(1, COLORS.counterEdge).lineBetween(-dir * CORNER, 0, 0, -CORNER);
    const hit = s.add.zone(-dir * 18, -18, 40, 40).setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.turn(turnBy));
    // Still, except a slight lift while the pointer is over it.
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => fold.setScale(1.2));
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => fold.setScale(1));
    corner.add([fold, hit]);
    return corner;
  }

  /** One item: its picture, name, a line about it, how many you have, and its price to buy one. */
  private createCard(page: Phaser.GameObjects.Container, design: DesignId, x: number, y: number): Page['cards'][number] {
    const s = this.scene;
    const def = FURNITURE[design];
    const midX = x + CARD.width / 2;
    page.add(s.add.rectangle(midX, y + CARD.height / 2, CARD.width, CARD.height, PALETTE.white).setStrokeStyle(2, COLORS.paperEdge));
    // The picture standing on the picture box's bottom, at the same scale as every other.
    page.add(addArt(s, midX, y + 10 + ART_BOX, def.art).setOrigin(0.5, 1).setScale(ART_SCALE));
    const name = s.add.text(midX, y + ART_BOX + 20, def.name, { ...NAME, align: 'center', wordWrap: { width: CARD.width - 8 } }).setOrigin(0.5, 0);
    // Right under the name, however many lines it took.
    const blurb = s.add.text(midX, name.y + name.height + 1, def.blurb, { ...SMALL, align: 'center', wordWrap: { width: CARD.width - 10 } }).setOrigin(0.5, 0);
    // The price (the leaf, as on the ground, and the amount) and the count along the bottom.
    const button = new Button(s, x + 40, y + CARD.height - 18, 64, 22, String(def.price), COLORS.serve, () => {
      if (this.shop.canBuy(design)) this.shop.buy(design);
    }).setLeadingIcon(addArt(s, 0, 0, 'leaf'));
    const owned = s.add.text(x + CARD.width - 8, y + CARD.height - 18, '', SMALL).setOrigin(1, 0.5);
    page.add([name, blurb, button, owned]);
    return { design, button, owned };
  }
}
