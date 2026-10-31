import Phaser from 'phaser';
import type { IngredientId } from '../data/ingredients';
import { drawLayerStack } from './DishView';
import { COLORS } from './theme';

const WIDTH = 56;
const HEIGHT = 36;
/** The small copy of the dish that pops up on top: narrower, thinner layers. */
const TOP_LAYER_WIDTH = 44;
const TOP_LAYER_HEIGHT = 6;
/** Room above the toaster for a popped-up dish of up to 6 layers. */
const TOP_ROOM = 6 * TOP_LAYER_HEIGHT + 10;

/**
 * The Toaster on the prep counter (placeholder shapes until real art).
 * Only draws: the prep scene decides when it toasts, shakes and pops, from
 * logic/toasting.ts. (x, y) is the centre of the toaster's body.
 */
export class ToasterView extends Phaser.GameObjects.Container {
  /** Body and slots; shaken while toasting (the dish on top stays still). */
  private readonly shell: Phaser.GameObjects.Container;
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly top: Phaser.GameObjects.Container;
  private shake: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    // The dish on top is added first, so it's drawn behind the body: when it
    // pops up from inside, the body hides its bottom like real toast.
    this.top = scene.add.container(0, 0);
    this.shell = scene.add.container(0, 0, [
      scene.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.toaster).setStrokeStyle(2, COLORS.ink),
      scene.add.rectangle(0, HEIGHT / 2 - 4, WIDTH - 4, 6, COLORS.toasterShade),
      // Two slots on top, and the lever on the side.
      scene.add.rectangle(-12, -HEIGHT / 2 + 2, 18, 4, COLORS.ink),
      scene.add.rectangle(12, -HEIGHT / 2 + 2, 18, 4, COLORS.ink),
      scene.add.rectangle(-WIDTH / 2 - 3, -4, 6, 4, COLORS.ink),
    ]);
    this.progress = scene.add.graphics();
    this.add([this.top, this.shell, this.progress]);
    scene.add.existing(this);
  }

  /** Where a dragged dish counts as dropped into the toaster: the body and the space above it. */
  dropArea(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - WIDTH / 2 - 8, this.y - HEIGHT / 2 - TOP_ROOM, WIDTH + 16, HEIGHT + TOP_ROOM);
  }

  /** Where the popped-up dish can be grabbed (a bit bigger than it, for fingers). */
  topArea(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - WIDTH / 2, this.y - HEIGHT / 2 - TOP_ROOM, WIDTH, TOP_ROOM + 8);
  }

  /** The dish went in: it disappears into the slots and the toaster starts shaking. */
  startToasting(): void {
    this.top.removeAll(true);
    this.shake?.remove();
    // Just 1px: enough to read as a rattle without blurring the shapes.
    this.shake = this.scene.tweens.add({ targets: this.shell, x: 1, duration: 50, yoyo: true, repeat: -1 });
  }

  /** 0..1, as a thin bar across the front. */
  setProgress(fraction: number): void {
    this.progress.clear();
    if (fraction <= 0) return;
    this.progress.fillStyle(COLORS.statusImpatient).fillRect(-WIDTH / 2 + 4, HEIGHT / 2 - 5, Math.floor((WIDTH - 8) * fraction), 2);
  }

  /** Done: stop shaking and pop the toasted dish up on top. */
  popUp(dish: readonly IngredientId[]): void {
    this.shake?.remove();
    this.shake = null;
    this.shell.x = 0;
    this.setProgress(0);
    this.showOnTop(dish);
    this.top.y = HEIGHT / 2; // start inside the toaster...
    this.scene.tweens.add({ targets: this.top, y: 0, duration: 180, ease: 'Back.easeOut' }); // ...and spring up
  }

  /** The dish sitting on top (or nothing, once it's been taken). */
  showOnTop(dish: readonly IngredientId[]): void {
    drawLayerStack(this.top, dish, true, TOP_LAYER_WIDTH, TOP_LAYER_HEIGHT, -HEIGHT / 2 - TOP_LAYER_HEIGHT / 2);
  }
}
