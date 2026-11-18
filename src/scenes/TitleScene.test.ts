import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../logic/gameState';

// Exercise menu transactions with isolated scene controls, not browser storage.
const harness = vi.hoisted(() => ({
  save: vi.fn(), startNew: vi.fn(), continue: vi.fn(), setState: vi.fn(),
  prompt: vi.fn(), sceneStart: vi.fn(),
  timers: [] as (() => void)[],
  panels: [] as { actions: Record<string, () => void>; destroyed: boolean }[],
}));

vi.mock('phaser', () => ({ default: {
  Scene: class {
    time = { delayedCall: (_delay: number, action: () => void) => harness.timers.push(action) };
    scene = { start: harness.sceneStart };
  },
} }));
vi.mock('../ui/Button', () => ({ Button: class {} }));
vi.mock('../ui/LeafText', () => ({ LeafText: class {} }));
vi.mock('../ui/PlayerNamePrompt', () => ({ promptPlayerName: harness.prompt }));
vi.mock('./gameStore', () => ({
  readSave: harness.save, startNewGame: harness.startNew, continueGame: harness.continue, setGameState: harness.setState,
}));
vi.mock('../ui/TitleMenuPanel', () => ({ TitleMenuPanel: class {
  actions: Record<string, () => void> = {};
  destroyed = false;
  constructor() { harness.panels.push(this); }
  point() { return { x: 0, y: 0 }; }
  add() {}
  text() { return { setFontSize() {} }; }
  button(name: string, _x: number, _y: number, _label: string, action: () => void) { this.actions[name] = action; }
  finishLayout() {}
  destroy() { this.destroyed = true; }
} }));

import { TitleScene } from './TitleScene';

const flush = () => { while (harness.timers.length) harness.timers.shift()!(); };
const latest = () => harness.panels[harness.panels.length - 1];

beforeEach(() => {
  vi.clearAllMocks();
  harness.panels.length = 0;
  harness.timers.length = 0;
});

describe('illustrated title save choices', () => {
  it('continues a valid named save without replacing it, after the click has finished', () => {
    const saved = { ...createNewGame(), playerName: 'Maple', leaves: 123 };
    harness.save.mockReturnValue({ ok: true, state: saved });
    const scene = new TitleScene();
    scene['showStartMenu']();
    expect(Object.keys(latest().actions)).toEqual(['continue', 'newGame', 'back']);
    latest().actions.continue();
    expect(harness.continue).not.toHaveBeenCalled();
    flush();
    expect(latest().destroyed).toBe(true);
    expect(harness.continue).toHaveBeenCalledWith(scene, saved);
    expect(harness.sceneStart).toHaveBeenCalledWith('WorldMapScene', { current: 'cafe' });
    expect(harness.startNew).not.toHaveBeenCalled();
  });

  it('keeps existing progress when either replacement or naming is cancelled', () => {
    harness.save.mockReturnValue({ ok: true, state: { ...createNewGame(), playerName: 'Maple' } });
    const scene = new TitleScene();
    scene['showStartMenu']();
    latest().actions.newGame(); flush();
    latest().actions.keep(); flush();
    expect(harness.prompt).not.toHaveBeenCalled();
    scene['showStartMenu']();
    latest().actions.newGame(); flush();
    latest().actions.newGame(); flush();
    expect(harness.startNew).not.toHaveBeenCalled();
    harness.prompt.mock.calls[0][2]();
    expect(harness.startNew).not.toHaveBeenCalled();
    expect(harness.sceneStart).not.toHaveBeenCalled();
  });

  it('never continues or silently replaces an unreadable save', () => {
    harness.save.mockReturnValue({ ok: false, reason: 'Unreadable save' });
    const scene = new TitleScene();
    scene['showStartMenu']();
    expect(latest().actions.continue).toBeUndefined();
    latest().actions.newGame(); flush();
    expect(harness.startNew).not.toHaveBeenCalled();
    expect(harness.prompt).not.toHaveBeenCalled();
    latest().actions.newGame(); flush();
    harness.prompt.mock.calls[0][1]('Maple');
    expect(harness.startNew).toHaveBeenCalledWith(scene, 'Maple');
    expect(harness.sceneStart).toHaveBeenCalledWith('FloorScene');
    expect(harness.continue).not.toHaveBeenCalled();
  });

  it('requires a name for a new game and ignores duplicate panel close clicks', () => {
    harness.save.mockReturnValue(null);
    const scene = new TitleScene();
    scene['showStartMenu']();
    const panel = latest();
    panel.actions.newGame();
    panel.actions.newGame();
    expect(harness.prompt).not.toHaveBeenCalled();
    flush();
    expect(harness.prompt).toHaveBeenCalledTimes(1);
    expect(harness.startNew).not.toHaveBeenCalled();
    harness.prompt.mock.calls[0][1]('Hazel');
    expect(harness.startNew).toHaveBeenCalledTimes(1);
    expect(harness.startNew).toHaveBeenCalledWith(scene, 'Hazel');
  });
});
