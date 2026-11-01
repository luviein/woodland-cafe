import Phaser from 'phaser';
import type { TutorialStepDef } from '../data/tutorial';
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

/** Where the arrow's tip goes. It points down at it, or up from below with `up` (for things near the top edge or under the box). */
export interface ArrowTarget {
  x: number;
  y: number;
  up?: boolean;
}

export interface StoryBoxOptions {
  rect: BoxRect;
  step: TutorialStepDef;
  /** Where the bouncing arrow points while line `index` is showing (its tip), or null for no arrow. */
  arrow?: (index: number) => ArrowTarget | null;
  /** Drawing depth; 90 (over the scene, under its pop-up panels) if not given. */
  depth?: number;
  /** Called each time a line shows (e.g. so the scene can unlock things at the waiting line). */
  onLine?: () => void;
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
 * an action keeps its waiting line up, without Next, until the player does
 * it: the scene then calls actionDone(), which shows any lines after it. Everything is in screen pixels, in one
 * container at (0, 0), so destroying the box tidies up the arrow too.
 */
export class StoryBox extends Phaser.GameObjects.Container {
  private readonly options: StoryBoxOptions;
  private readonly text: Phaser.GameObjects.Text;
  private readonly nextButton: Button;
  private readonly skip: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Image;
  private arrowBob: Phaser.Tweens.Tween | null = null;
  /** Where the arrow points now (null: hidden), so it only moves when that changes. */
  private arrowAt: ArrowTarget | null = null;
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
    // Skip goes just left of Next when the box is wide enough, else under
    // the portrait (a narrow, taller box): never on top of Next. Measured
    // with its longest text, "Skip tutorial".
    this.skip = scene.add
      .text(0, y + height - PAD, 'Skip tutorial', { ...TEXT.label, color: css(COLORS.disabled) })
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.onSkipTapped());
    const nextLeft = x + width - PAD - NEXT.width;
    if (nextLeft - 8 - this.skip.width >= textLeft) this.skip.setOrigin(1, 1).setX(nextLeft - 8);
    else this.skip.setOrigin(0, 1).setX(x + PAD);

    this.arrow = addArt(scene, 0, 0, 'pointerArrow').setOrigin(0.5, 1).setScale(2).setVisible(false);

    this.add([panel, portrait, this.text, this.nextButton, this.skip, this.arrow]);
    this.setDepth(options.depth ?? 90); // over the scene, under its own pop-up panels (100)
    scene.add.existing(this);
    this.showLine();
  }

  /** The tutorial moved on while this box was up (e.g. by the player's action): tidy up. */
  override destroy(fromScene?: boolean): void {
    this.arrowBob?.remove();
    super.destroy(fromScene);
  }

  private showLine(): void {
    const { lines, waitsAt } = this.options.step;
    const last = this.line === lines.length - 1;
    this.text.setText(lines[this.line]);
    this.nextButton.setText(last ? 'OK' : 'Next');
    // On the waiting line the player does the thing instead (actionDone).
    this.nextButton.setVisible(this.line !== waitsAt);
    this.skip.setText('Skip tutorial');

    this.refreshArrow();
    this.options.onLine?.();
  }

  /** True once Grandma has reached the line that waits for the player (or the step has none). */
  reachedWaitingLine(): boolean {
    const { waitsAt } = this.options.step;
    return waitsAt === null || this.line >= waitsAt;
  }

  /**
   * Points the arrow at the current line's target. Scenes call this every
   * frame, because a target can move or appear later (e.g. the customer
   * walking up to the counter); the arrow only jumps when the target changes.
   */
  refreshArrow(): void {
    const target = this.confirming ? null : (this.options.arrow?.(this.line) ?? null);
    if (target?.x === this.arrowAt?.x && target?.y === this.arrowAt?.y && target?.up === this.arrowAt?.up) return;
    this.arrowAt = target;
    // A fresh bounce for each target: up 5px and back, over and over.
    this.arrowBob?.remove();
    this.arrowBob = null;
    this.arrow.setVisible(target !== null);
    if (target) {
      // Pointing up: flipped, hanging from its tip, bouncing downward.
      this.arrow.setPosition(target.x, target.y).setFlipY(Boolean(target.up)).setOrigin(0.5, target.up ? 0 : 1);
      this.arrowBob = this.scene.tweens.add({ targets: this.arrow, y: target.y + (target.up ? 5 : -5), duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /**
   * The player did what the step waits for. If there are lines after the
   * waiting line, they show now (even if the player acted before reaching
   * it) and true is returned: the step ends with Next on the last of them.
   * False: nothing more to say, the step can end now.
   */
  actionDone(): boolean {
    const { waitsAt, lines } = this.options.step;
    if (waitsAt === null || waitsAt >= lines.length - 1) return false;
    if (this.line <= waitsAt) {
      this.line = waitsAt + 1;
      this.confirming = false;
      this.showLine();
    }
    return true;
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
    this.refreshArrow(); // hidden while asking
  }
}
