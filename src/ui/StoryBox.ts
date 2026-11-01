import Phaser from 'phaser';
import type { TutorialStepDef } from '../data/tutorial';
import type { Point } from '../logic/layout';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT, css } from './theme';

/** Where the box goes on its screen, in pixels. */
export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoryBoxOptions {
  rect: BoxRect;
  step: TutorialStepDef;
  /** Where the bouncing arrow points while line `index` is showing (its tip), or null for no arrow. */
  arrow?: (index: number) => Point | null;
  /** Next pressed on the last line of a step that waits for Next. */
  onFinished: () => void;
  /** Skip tutorial, confirmed. */
  onSkip: () => void;
}

const PORTRAIT_SCALE = 2;
const PAD = 6;
/** Wide enough for "Keep going". */
const NEXT = { width: 96, height: 20 };

/**
 * Grandma Badger talking (GAME_DESIGN.md §5.9): her portrait, one line at a
 * time, Next, and Skip tutorial (which asks first). A step that waits for
 * an action keeps its last line up, without Next, until the scene moves the
 * tutorial on and closes the box. Everything is in screen pixels, in one
 * container at (0, 0), so destroying the box tidies up the arrow too.
 */
export class StoryBox extends Phaser.GameObjects.Container {
  private readonly options: StoryBoxOptions;
  private readonly text: Phaser.GameObjects.Text;
  private readonly nextButton: Button;
  private readonly skip: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Image;
  private arrowBob: Phaser.Tweens.Tween | null = null;
  private line = 0;
  /** True while "Skip the tutorial?" is asking. */
  private confirming = false;

  constructor(scene: Phaser.Scene, options: StoryBoxOptions) {
    super(scene, 0, 0);
    this.options = options;
    const { x, y, width, height } = options.rect;

    // Interactive only to swallow taps, so tapping the box never walks the player there.
    const panel = scene.add
      .rectangle(x, y, width, height, COLORS.paper)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.ink)
      .setInteractive();
    const portrait = addArt(scene, x + PAD, y + PAD, 'badger').setOrigin(0).setScale(PORTRAIT_SCALE);
    const textLeft = x + PAD * 2 + 16 * PORTRAIT_SCALE;
    this.text = scene.add.text(textLeft, y + PAD, '', {
      ...TEXT.label,
      color: css(COLORS.ink),
      wordWrap: { width: x + width - PAD - textLeft, useAdvancedWrap: true },
      lineSpacing: 2,
    });
    this.nextButton = new Button(
      scene,
      x + width - PAD - NEXT.width / 2,
      y + height - PAD - NEXT.height / 2,
      NEXT.width,
      NEXT.height,
      'Next',
      COLORS.serve,
      () => this.onNext(),
    );
    // A quiet text link, so it isn't pressed by mistake instead of Next.
    this.skip = scene.add
      .text(textLeft, y + height - PAD, 'Skip tutorial', { ...TEXT.label, color: css(COLORS.disabled) })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onSkipTapped());

    this.arrow = addArt(scene, 0, 0, 'pointerArrow').setOrigin(0.5, 1).setScale(2).setVisible(false);

    this.add([panel, portrait, this.text, this.nextButton, this.skip, this.arrow]);
    this.setDepth(90); // over the scene, under its own pop-up panels (100)
    scene.add.existing(this);
    this.showLine();
  }

  /** The tutorial moved on while this box was up (e.g. by the player's action): tidy up. */
  override destroy(fromScene?: boolean): void {
    this.arrowBob?.remove();
    super.destroy(fromScene);
  }

  private showLine(): void {
    const { lines, waitsFor } = this.options.step;
    const last = this.line === lines.length - 1;
    this.text.setText(lines[this.line]);
    this.nextButton.setText(last && waitsFor === 'next' ? 'OK' : 'Next');
    // On an action step's last line, the player does the thing instead.
    this.nextButton.setVisible(!(last && waitsFor === 'action'));
    this.skip.setText('Skip tutorial');

    // A fresh bounce for each target: up 5px and back, over and over.
    const target = this.options.arrow?.(this.line) ?? null;
    this.arrowBob?.remove();
    this.arrowBob = null;
    this.arrow.setVisible(target !== null);
    if (target) {
      this.arrow.setPosition(target.x, target.y);
      this.arrowBob = this.scene.tweens.add({ targets: this.arrow, y: target.y - 5, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private onNext(): void {
    if (this.confirming) {
      // "Keep going": back to where Grandma was.
      this.confirming = false;
      this.showLine();
      return;
    }
    if (this.line < this.options.step.lines.length - 1) {
      this.line += 1;
      this.showLine();
    } else {
      this.options.onFinished();
    }
  }

  private onSkipTapped(): void {
    if (this.confirming) {
      this.options.onSkip();
      return;
    }
    // Ask first, in the box itself: tap "Yes, skip" again, or Next to keep going.
    this.confirming = true;
    this.text.setText('Skip the tutorial? Grandma will let you get on with it.');
    this.nextButton.setText('Keep going').setVisible(true);
    this.skip.setText('Yes, skip');
    this.arrow.setVisible(false);
  }
}
