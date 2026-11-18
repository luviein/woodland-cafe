import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../logic/gameState';

const harness = vi.hoisted(() => ({
  game: vi.fn(), begin: vi.fn(), set: vi.fn(), start: vi.fn(), text: vi.fn(),
  timers: [] as (() => void)[], buttons: [] as { label: string; action: () => void }[],
}));

vi.mock('phaser', () => {
  const object = () => ({
    setOrigin() { return this; }, setInteractive() { return this; },
    setStrokeStyle() { return this; }, setDepth() { return this; }, destroy() {},
  });
  return { default: {
    Scene: class {
      scene = { start: harness.start };
      events = { once: vi.fn(), off: vi.fn() };
      input = { keyboard: { on: vi.fn(), off: vi.fn() } };
      time = { delayedCall: (_delay: number, action: () => void) => harness.timers.push(action) };
      tweens = { add: vi.fn() };
      add = {
        rectangle: object, container: object,
        text: (_x: number, _y: number, text: string) => { harness.text(text); return object(); },
      };
    },
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Input: { Keyboard: { Events: { ANY_KEY_DOWN: 'keydown' } } },
  } };
});
vi.mock('../ui/Button', () => ({ Button: class {
  constructor(_scene: unknown, _x: number, _y: number, _width: number, _height: number, label: string, _color: number, action: () => void) {
    harness.buttons.push({ label, action });
  }
} }));
vi.mock('../ui/IllustratedMapWallet', () => ({ IllustratedMapWallet: class {} }));
vi.mock('../ui/StoryBox', () => ({ StoryBox: class {} }));
vi.mock('../ui/sprites', () => ({ createMascotSprite: vi.fn() }));
vi.mock('../layout/arrangeable', () => ({ arrangeable: vi.fn(), arrangeablePanel: vi.fn(), sizeBox: vi.fn() }));
vi.mock('./gameStore', () => ({
  getGameState: harness.game, beginCafeDay: harness.begin, setGameState: harness.set,
  tutorialEvent: vi.fn(), watchGameState: vi.fn(),
}));

import { WorldMapScene } from './WorldMapScene';
import { LOCATIONS, type LocationDef } from '../data/locations';

const flush = () => { while (harness.timers.length) harness.timers.shift()!(); };
const click = (label: string) => harness.buttons.filter(button => button.label === label).at(-1)!.action();

beforeEach(() => {
  vi.clearAllMocks(); harness.timers.length = 0; harness.buttons.length = 0;
  harness.game.mockReturnValue({ ...createNewGame(), tutorial: 'done' });
});

describe('illustrated map travel', () => {
  it('routes each non-cafe destination without advancing the day or changing the save', () => {
    const scene = new WorldMapScene();
    scene['go']('forest');
    expect(harness.start).toHaveBeenLastCalledWith('OutdoorScene', { location: 'forest' });
    scene['go']('marketplace');
    expect(harness.start).toHaveBeenLastCalledWith('OutdoorScene', { location: 'marketplace' });
    scene['go']('museum');
    expect(harness.start).toHaveBeenLastCalledWith('MuseumScene', { location: 'museum' });
    scene['go']('garden');
    expect(harness.start).toHaveBeenLastCalledWith('GardenScene', { from: 'map' });
    expect(harness.begin).not.toHaveBeenCalled();
    expect(harness.set).not.toHaveBeenCalled();
  });

  it('honours locked places and tutorial travel restrictions', () => {
    const scene = new WorldMapScene();
    const forest: LocationDef = LOCATIONS.forest;
    forest.locked = true;
    try { scene['go']('forest'); } finally { forest.locked = false; }
    expect(harness.text).toHaveBeenLastCalledWith('Locked');
    harness.game.mockReturnValue({ ...createNewGame(), tutorial: 'map' });
    scene['go']('marketplace');
    expect(harness.text).toHaveBeenLastCalledWith("Finish Grandma's tour first");
    expect(harness.start).not.toHaveBeenCalled();
    expect(harness.set).not.toHaveBeenCalled();
  });

  it('only starts the next day after confirmation, and ignores repeat activation', () => {
    const scene = new WorldMapScene();
    const before = harness.game();
    scene['go']('cafe');
    scene['go']('forest');
    expect(harness.start).not.toHaveBeenCalled();
    expect(harness.set).not.toHaveBeenCalled();
    click('Open cafe'); click('Open cafe');
    expect(harness.begin).toHaveBeenCalledTimes(1);
    expect(harness.set).toHaveBeenCalledTimes(1);
    expect(harness.set.mock.calls[0][1].day).toBe(before.day + 1);
    expect(harness.start).toHaveBeenCalledTimes(1);
    expect(harness.start).toHaveBeenCalledWith('FloorScene', { location: 'cafe' });
  });

  it('cancelling or decorating leaves the next cafe day unopened', () => {
    const scene = new WorldMapScene();
    scene['go']('cafe'); click('Not yet'); flush();
    expect(harness.start).not.toHaveBeenCalled();
    scene['go']('cafe'); click('Decorate');
    expect(harness.start).toHaveBeenCalledWith('DecorateScene');
    expect(harness.begin).not.toHaveBeenCalled();
    expect(harness.set).not.toHaveBeenCalled();
  });
});
