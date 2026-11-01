import Phaser from 'phaser';
import { addArt } from './art';

// Little bits of life (GAME_DESIGN.md §8.3). Each effect makes its own
// objects, animates them with tweens and destroys them when done, so a
// scene just calls it and forgets about it.

/**
 * Leaves bursting up and out from (x, y) and fluttering away: being paid.
 * One leaf per Leaf earned, up to `max`, so a bigger payment looks bigger.
 */
export function popLeaves(scene: Phaser.Scene, x: number, y: number, count: number, scale = 1, max = 8): void {
  const leaves = Math.min(count, max);
  for (let i = 0; i < leaves; i++) {
    // Spread evenly across an upward fan, with a little randomness.
    const angle = Phaser.Math.DegToRad(-150 + (120 * (i + 0.5)) / leaves + Phaser.Math.Between(-8, 8));
    const distance = Phaser.Math.Between(18, 30) * scale;
    const leaf = addArt(scene, x, y, 'leaf').setScale(scale).setDepth(45).setAngle(Phaser.Math.Between(0, 360));
    scene.tweens.add({
      targets: leaf,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      angle: leaf.angle + Phaser.Math.Between(-180, 180),
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () =>
        // Then drift down a little while fading, like a leaf in the air.
        scene.tweens.add({
          targets: leaf,
          y: leaf.y + 16 * scale,
          alpha: 0,
          duration: 1100,
          ease: 'Sine.easeIn',
          onComplete: () => leaf.destroy(),
        }),
    });
  }
}

/** A puff of dust at (x, y): a cloud, then breaking up and fading. A table was just wiped. */
export function puffOfDust(scene: Phaser.Scene, x: number, y: number): void {
  const puff = addArt(scene, x, y, 'puff').setDepth(19);
  scene.time.delayedCall(140, () => puff.setFrame(1));
  scene.tweens.add({ targets: puff, y: y - 4, alpha: 0, delay: 140, duration: 300, onComplete: () => puff.destroy() });
}
