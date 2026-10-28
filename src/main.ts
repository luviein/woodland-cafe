import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from './config/display';
import { enableIntegerScaling } from './integerScale';
import { FloorScene } from './scenes/FloorScene';
import { PrepScene } from './scenes/PrepScene';

const game = new Phaser.Game({
  type: Phaser.AUTO, // WebGL when available, Canvas otherwise
  parent: 'game',
  backgroundColor: '#2b2420',
  // Nearest-neighbour texture filtering + rounded positions = crisp pixel art.
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  // The first scene in the list starts automatically.
  scene: [FloorScene, PrepScene],
});

// The Scale Manager's parent size is only known once the game has booted.
game.events.once(Phaser.Core.Events.READY, () => enableIntegerScaling(game));
