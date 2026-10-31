import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { Button } from './Button';
import { COLORS, TEXT, css } from './theme';

/** One button on a row, e.g. "+10". `onPress` is read at tap time, so it can change with each refresh. */
export interface ShopButtonView {
  label: string;
  enabled: boolean;
  onPress: () => void;
}

/** One thing for sale: a name, a detail line (stock, price...), and its buttons. */
export interface ShopRowView {
  name: string;
  detail: string;
  buttons: ShopButtonView[];
}

const WIDTH = 400;
const ROW_HEIGHT = 30;
const HEADER = 64;
const FOOTER = 44;
const BUTTON_WIDTH = 64; // fits "Let go" (Notice Board)
const BUTTON_GAP = 6;

/**
 * A stall's shop: title, blurb, a row per item and a Close button (or Esc).
 * It only draws; what the rows say and do comes from the scene, which calls
 * setRows() whenever the game state changes (a purchase, a leaf picked up).
 *
 * The panel is built once with a fixed number of rows and buttons, and
 * refreshes change only their text and greyed-out state. Rebuilding on each
 * purchase would destroy the very button being tapped, mid-tap.
 */
export class ShopPanel extends Phaser.GameObjects.Container {
  private rows: ShopRowView[];
  private readonly details: Phaser.GameObjects.Text[] = [];
  private readonly buttons: Button[][] = [];

  constructor(scene: Phaser.Scene, title: string, blurb: string, rows: ShopRowView[], onClose: () => void) {
    super(scene, 0, 0);
    this.rows = rows;
    const height = HEADER + Math.max(rows.length, 1) * ROW_HEIGHT + FOOTER;
    const left = (BASE_WIDTH - WIDTH) / 2;
    const top = Math.round((BASE_HEIGHT - height) / 2);

    // The dim layer takes taps, so nothing behind the panel can be pressed
    // and tapping beside it doesn't walk the player away.
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.5).setOrigin(0).setInteractive());
    this.add(scene.add.rectangle(BASE_WIDTH / 2, top + height / 2, WIDTH, height, COLORS.paper).setStrokeStyle(3, COLORS.ink));
    this.add(scene.add.text(BASE_WIDTH / 2, top + 12, title, TEXT.heading).setOrigin(0.5, 0));
    this.add(scene.add.text(BASE_WIDTH / 2, top + 34, blurb, { ...TEXT.body, color: css(COLORS.counterEdge) }).setOrigin(0.5, 0));

    if (rows.length === 0) {
      this.add(scene.add.text(BASE_WIDTH / 2, top + HEADER + 6, 'Nothing for sale yet.', TEXT.body).setOrigin(0.5, 0));
    }
    rows.forEach((row, i) => {
      const y = top + HEADER + i * ROW_HEIGHT + ROW_HEIGHT / 2;
      this.add(scene.add.text(left + 16, y, row.name, TEXT.heading).setOrigin(0, 0.5));
      const detail = scene.add.text(left + 116, y, '', TEXT.body).setOrigin(0, 0.5);
      this.details.push(detail);
      this.add(detail);
      // Buttons line up from the right edge, so rows with fewer still align.
      const count = row.buttons.length;
      this.buttons.push(
        row.buttons.map((_, j) => {
          const x = left + WIDTH - 16 - BUTTON_WIDTH / 2 - (count - 1 - j) * (BUTTON_WIDTH + BUTTON_GAP);
          const button = new Button(scene, x, y, BUTTON_WIDTH, 24, '', COLORS.serve, () =>
            this.rows[i].buttons[j].onPress(),
          );
          this.add(button);
          return button;
        }),
      );
    });

    const close = new Button(scene, BASE_WIDTH / 2, top + height - FOOTER / 2, 100, 26, 'Close', COLORS.reset, onClose);
    this.add(close);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.repeat) close.press();
    };
    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.once(Phaser.GameObjects.Events.DESTROY, () =>
      scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey),
    );

    this.setRows(rows);
    scene.add.existing(this);
  }

  /** New text and enabled states. Must have the same rows and buttons as when built. */
  setRows(rows: ShopRowView[]): void {
    if (rows.length !== this.buttons.length || rows.some((r, i) => r.buttons.length !== this.buttons[i].length)) {
      throw new Error('ShopPanel.setRows: the rows changed shape; build a new panel instead');
    }
    this.rows = rows;
    rows.forEach((row, i) => {
      this.details[i].setText(row.detail);
      row.buttons.forEach((b, j) => this.buttons[i][j].setText(b.label).setEnabled(b.enabled));
    });
  }
}
