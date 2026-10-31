import type Phaser from 'phaser';
import { DAY_CONFIG } from '../data/dayConfig';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { FORAGE_CONFIG } from '../data/forageSpots';
import { LEAF_CONFIG } from '../data/leafConfig';
import { LOCATIONS } from '../data/locations';
import { STOCK_CONFIG } from '../data/stockConfig';
import { TOASTER_CONFIG } from '../data/toasterConfig';
import { getGameState, setGameState } from '../scenes/gameStore';
import type { LocationRequest, WorldMapRequest } from '../scenes/WorldMapScene';
import { createDevCommands, runCommand } from './commands';
import { devActions } from './devActions';
import { devSettings } from './devSettings';

/**
 * A small text box over the game for typing test commands. Plain HTML, not
 * Phaser: a real <input> gives typing, cursor, copy/paste and mobile
 * keyboards for free, which would be a lot of work to rebuild on a canvas.
 *
 * Open/close with the ` (backtick) key or the ">_" button (bottom-left).
 * Up/Down arrows recall previous commands. Only loaded in dev builds.
 */
export function mountDevConsole(game: Phaser.Game): void {
  // Game-wide commands, registered once (scene-specific ones are registered
  // by their scene while it runs).
  devActions.game = { get: () => getGameState(game), set: (state) => setGameState(game, state) };
  devActions.goto = (place) => {
    // Overlays included (prep, summary): a clean jump, like a fresh visit.
    for (const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key);
    if (place === 'map') {
      const request: WorldMapRequest = { current: 'cafe' };
      game.scene.start('WorldMapScene', request);
    } else {
      const request: LocationRequest = { location: place };
      game.scene.start(LOCATIONS[place].scene!, request);
    }
  };
  // These are the live objects the game reads every frame, so 'set' changes
  // take effect immediately.
  const commands = createDevCommands(devSettings, [FLOOR_CONFIG, DAY_CONFIG, STOCK_CONFIG, LEAF_CONFIG, FORAGE_CONFIG, TOASTER_CONFIG], devActions);
  const history: string[] = [];
  let historyIndex = 0;

  const font = '12px monospace';

  const button = document.createElement('button');
  button.textContent = '>_';
  button.title = 'Dev console (`)';
  Object.assign(button.style, {
    position: 'fixed',
    left: '8px',
    bottom: '8px',
    zIndex: '10',
    font,
    padding: '4px 8px',
    opacity: '0.6',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    left: '8px',
    bottom: '40px',
    zIndex: '10',
    width: 'min(480px, calc(100vw - 16px))',
    background: 'rgba(20, 16, 14, 0.92)',
    color: '#f4e9d8',
    font,
    padding: '8px',
    borderRadius: '4px',
    display: 'none',
  });

  const output = document.createElement('pre');
  output.textContent = "Dev console. Type 'help' for commands.";
  Object.assign(output.style, {
    margin: '0 0 6px',
    maxHeight: '160px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
  });

  const input = document.createElement('input');
  input.placeholder = 'e.g. speed 5';
  input.autocomplete = 'off';
  input.spellcheck = false;
  Object.assign(input.style, {
    width: '100%',
    boxSizing: 'border-box',
    font,
    background: '#000',
    color: '#f4e9d8',
    border: '1px solid #5c4339',
    padding: '4px',
  });

  panel.append(output, input);
  document.body.append(panel, button);

  const isOpen = (): boolean => panel.style.display !== 'none';
  const open = (): void => {
    panel.style.display = 'block';
    input.focus();
  };
  const close = (): void => {
    panel.style.display = 'none';
    input.blur(); // give the keyboard back to the game
  };
  const toggle = (): void => (isOpen() ? close() : open());

  const print = (line: string): void => {
    output.textContent += `\n${line}`;
    output.scrollTop = output.scrollHeight;
  };

  button.addEventListener('click', toggle);

  // Backtick opens the console from anywhere in the game.
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' && document.activeElement !== input) {
      e.preventDefault(); // don't type the backtick into the box we're opening
      open();
    }
  });

  // The game listens for keys on `window`. Stopping these events here means
  // typing "1" or Enter in the console never adds bread or serves a dish.
  input.addEventListener('keyup', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();

    if (e.key === '`' || e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter') {
      const line = input.value.trim();
      input.value = '';
      if (!line) return;
      history.push(line);
      historyIndex = history.length;
      print(`> ${line}`);
      const result = runCommand(commands, line);
      if (result) print(result);
    } else if (e.key === 'ArrowUp' && historyIndex > 0) {
      e.preventDefault();
      input.value = history[--historyIndex];
    } else if (e.key === 'ArrowDown' && historyIndex < history.length) {
      e.preventDefault();
      historyIndex++;
      input.value = history[historyIndex] ?? '';
    }
  });
}
