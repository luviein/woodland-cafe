import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';

/**
 * STEP 1 PLACEHOLDER: proves the scaffold works (crisp pixels, scaling,
 * click/touch input). The real prep station replaces this in a later step.
 */
export class PrepScene extends Phaser.Scene {
  constructor() {
    super('PrepScene');
  }

  create(): void {
    this.drawTileGrid();

    this.add.text(TILE_SIZE, TILE_SIZE, 'Woodland Cafe: scaffold check', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f4e9d8',
    });

    const scaleText = this.add.text(TILE_SIZE, TILE_SIZE * 2.5, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c9b79c',
    });
    const showScale = (): void => {
      const factor = this.scale.displaySize.width / BASE_WIDTH;
      // Show 2 decimals so a non-integer scale (e.g. 1.37) is easy to spot.
      scaleText.setText(`scale: x${factor.toFixed(2)}`);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, showScale);
    showScale();

    // One 3x3-tile square that changes colour when clicked or tapped.
    const colors = [0xd9734e, 0x8fb573, 0xe0b84c, 0x7a9cc6];
    let colorIndex = 0;
    const box = this.add
      .rectangle(BASE_WIDTH / 2, BASE_HEIGHT / 2, TILE_SIZE * 3, TILE_SIZE * 3, colors[0])
      .setInteractive({ useHandCursor: true });

    // 'pointerup' (not 'pointerdown' or hover) is the same for mouse and
    // touch, and lets the player cancel by sliding off before releasing.
    box.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      colorIndex = (colorIndex + 1) % colors.length;
      box.setFillStyle(colors[colorIndex]);
    });

    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT / 2 + TILE_SIZE * 3, 'click / tap me', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f4e9d8',
      })
      .setOrigin(0.5, 0);
  }

  /** Faint 16x16 grid so you can see tiles stay square and sharp when scaled. */
  private drawTileGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x3a312b);
    for (let x = 0; x <= BASE_WIDTH; x += TILE_SIZE) {
      grid.lineBetween(x + 0.5, 0, x + 0.5, BASE_HEIGHT);
    }
    for (let y = 0; y <= BASE_HEIGHT; y += TILE_SIZE) {
      grid.lineBetween(0, y + 0.5, BASE_WIDTH, y + 0.5);
    }
  }
}
