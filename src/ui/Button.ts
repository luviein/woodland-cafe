import Phaser from 'phaser';
import { COLORS, TEXT } from './theme';

/**
 * A rectangle + label that works the same with mouse and touch.
 *
 * It fires on release (pointerup), and only if the press also started on this
 * button. So sliding a finger off before letting go cancels the click, and a
 * drag that ends here by accident doesn't trigger it. No hover states, since
 * touch screens don't have hover.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly color: number;
  private pressed = false;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: number,
    private readonly onClick: () => void,
  ) {
    super(scene, x, y);
    this.color = color;

    this.bg = scene.add.rectangle(0, 0, width, height, color).setStrokeStyle(2, COLORS.ink);
    this.label = scene.add.text(0, 0, text, TEXT.button).setOrigin(0.5);
    this.add([this.bg, this.label]);

    // A Container has no size by default, so give it one for the hit area.
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (this.enabled) this.setPressed(true);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setPressed(false));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const wasPressed = this.pressed;
      this.setPressed(false);
      if (this.enabled && wasPressed) this.onClick();
    });

    scene.add.existing(this);
  }

  /**
   * Activate the button as if it were clicked (used by keyboard shortcuts),
   * with a short pressed flash so the player sees which button the key hit.
   * Going through the button means a key obeys the same rules as a click:
   * if the button is disabled, its shortcut does nothing too.
   */
  press(): void {
    if (!this.enabled) return;
    this.setPressed(true);
    this.scene.time.delayedCall(80, () => this.setPressed(false));
    this.onClick();
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.bg.setFillStyle(enabled ? this.color : COLORS.disabled);
    if (!enabled) this.setPressed(false);
    return this;
  }

  private setPressed(pressed: boolean): void {
    if (this.pressed === pressed) return;
    this.pressed = pressed;
    // Move the label/background down 2px instead of scaling: scaling by a
    // fraction would blur pixel art, while whole-pixel moves stay crisp.
    const offset = pressed ? 2 : 0;
    this.bg.y = offset;
    this.label.y = offset;
    const base = this.enabled ? this.color : COLORS.disabled;
    this.bg.setFillStyle(pressed ? Phaser.Display.Color.ValueToColor(base).darken(15).color : base);
  }
}
