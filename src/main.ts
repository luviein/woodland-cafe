import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from './config/display';
import { enableIntegerScaling } from './integerScale';
import { DaySummaryScene } from './scenes/DaySummaryScene';
import { FloorScene } from './scenes/FloorScene';
import { initGameState } from './scenes/gameStore';
import { PrepScene } from './scenes/PrepScene';
import { OutdoorScene } from './scenes/OutdoorScene';
import { WorldMapScene } from './scenes/WorldMapScene';

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
  // The first scene in the list starts automatically. Prep and the summary
  // are launched by the floor as overlays (when an order is taken, when the
  // day ends); later scenes in the list draw on top. The world map and the
  // outdoor places replace the floor between days.
  scene: [FloorScene, PrepScene, DaySummaryScene, WorldMapScene, OutdoorScene],
});

// The registry exists as soon as the game is constructed, before any
// scene's create() runs, so the state is ready for every scene.
initGameState(game);

// The Scale Manager's parent size is only known once the game has booted.
game.events.once(Phaser.Core.Events.READY, () => enableIntegerScaling(game));

// Dev console for test commands. import.meta.env.DEV is true only under
// `npm run dev`, and the dynamic import() means production builds don't
// even include the console's code.
if (import.meta.env.DEV) {
  void import('./debug/DevConsole').then((m) => m.mountDevConsole(game));
}
