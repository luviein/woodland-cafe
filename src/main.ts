import { GardenScene } from './scenes/GardenScene';
import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from './config/display';
import { enableIntegerScaling } from './integerScale';
import { DecorateScene } from './scenes/DecorateScene';
import { DaySummaryScene } from './scenes/DaySummaryScene';
import { FloorScene } from './scenes/FloorScene';
import { initGameState } from './scenes/gameStore';
import { PrepScene } from './scenes/PrepScene';
import { OutdoorScene } from './scenes/OutdoorScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { TitleScene } from './scenes/TitleScene';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { PALETTE } from './art/palette';
import { css } from './ui/theme';
import { getSoundSettings, setSoundSettings } from './audio/audio';
import { showSoundNote } from './ui/soundNote';

const game = new Phaser.Game({
  type: Phaser.AUTO, // WebGL when available, Canvas otherwise
  parent: 'game',
  backgroundColor: css(PALETTE.black),
  // Nearest-neighbour texture filtering + rounded positions = crisp pixel art.
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  // The first scene in the list starts automatically: Boot gets the art
  // ready, then opens the title screen, which continues the save or starts
  // a new game. HudScene (the volume control) is last so it's drawn over
  // everything; Boot launches it and it never stops. Prep and the summary
  // are launched by the floor as overlays (when an order is taken, when the
  // day ends); later scenes in the list draw on top. The world map and the
  // outdoor places replace the floor between days.
  scene: [BootScene, TitleScene, FloorScene, PrepScene, DaySummaryScene, WorldMapScene, OutdoorScene, DecorateScene, GardenScene, HudScene],
});

// The registry exists as soon as the game is constructed, before any
// scene's create() runs, so the state is ready for every scene.
initGameState(game);

// M mutes and unmutes in every scene (GAME_DESIGN.md §8.4). A plain window
// listener rather than one per scene, so no scene can forget it. Not while
// typing in a text box (the dev console), where "m" is just a letter.
window.addEventListener('keydown', (event) => {
  if (event.repeat || (event.key !== 'm' && event.key !== 'M')) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const muted = !getSoundSettings().muted;
  setSoundSettings({ ...getSoundSettings(), muted });
  showSoundNote(muted ? 'Sound off' : 'Sound on');
});

// The Scale Manager's parent size is only known once the game has booted.
game.events.once(Phaser.Core.Events.READY, () => enableIntegerScaling(game));

// Dev console for test commands. import.meta.env.DEV is true only under
// `npm run dev`, and the dynamic import() means production builds don't
// even include the console's code.
if (import.meta.env.DEV) {
  void import('./debug/DevConsole').then((m) => m.mountDevConsole(game));
}
