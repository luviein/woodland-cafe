import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from './config/display';

/**
 * FIT mode on its own scales by any factor (e.g. 2.37x), which makes some
 * pixels wider than others. Phaser's "snap" option floors the displayed size to
 * a multiple of the base size, giving whole-number scaling with a border.
 *
 * Snap floors to 0 when the window is smaller than the base size (e.g. a phone
 * in portrait), which would hide the game. So we only turn snap on when the
 * window can fit at least one full copy, and fall back to plain FIT otherwise.
 */
export function enableIntegerScaling(game: Phaser.Game): void {
  const scale = game.scale;

  const update = (): void => {
    const { width, height } = scale.parentSize;
    const fitsAtX1 = width >= BASE_WIDTH && height >= BASE_HEIGHT;
    const snapW = fitsAtX1 ? BASE_WIDTH : 0;
    const snapH = fitsAtX1 ? BASE_HEIGHT : 0;

    // setSnap() refreshes the Scale Manager, which fires RESIZE again.
    // Only calling it when the value changes stops an infinite loop.
    const current = scale.displaySize.snapTo;
    if (current.x !== snapW || current.y !== snapH) {
      scale.setSnap(snapW, snapH);
    }
  };

  scale.on(Phaser.Scale.Events.RESIZE, update);
  update();
}
