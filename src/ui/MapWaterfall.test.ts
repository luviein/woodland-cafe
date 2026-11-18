import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { MAP_WATERFALL, MAP_WATERFALL_ANIMATION, MAP_WATERFALL_KEY } from '../assets/worldMap';

vi.mock('phaser', () => ({ default: { Textures: { FilterMode: { NEAREST: 0 } } } }));
vi.mock('../layout/arrangeable', () => ({ arrangeable: vi.fn() }));

import { addMapWaterfall } from './MapWaterfall';

function fixture(existingAnimation = false) {
  const setFilter = vi.fn();
  const play = vi.fn();
  const sprite = vi.fn(() => ({ play }));
  const create = vi.fn();
  const scene = {
    textures: { get: vi.fn(() => ({ setFilter })) },
    anims: { exists: vi.fn(() => existingAnimation), create }, add: { sprite },
  } as unknown as Phaser.Scene;
  return { scene, setFilter, play, sprite, create };
}

describe('approved map waterfall animation', () => {
  it('loops all six frames at exactly 140 ms each, using nearest-neighbour filtering', () => {
    const test = fixture();
    addMapWaterfall(test.scene);
    const config = test.create.mock.calls[0][0];
    expect(config.frames).toEqual([0, 1, 2, 3, 4, 5].map(frame => ({ key: MAP_WATERFALL_KEY, frame })));
    expect(1000 / config.frameRate).toBe(140);
    expect(config.repeat).toBe(-1);
    expect(test.setFilter).toHaveBeenCalledWith(0);
    expect(test.play).toHaveBeenCalledWith(MAP_WATERFALL_ANIMATION);
  });

  it('reuses the registered animation on a second map visit and keeps the native footprint', () => {
    const test = fixture(true);
    addMapWaterfall(test.scene);
    expect(test.create).not.toHaveBeenCalled();
    expect(test.sprite).toHaveBeenCalledWith(MAP_WATERFALL.display.x, MAP_WATERFALL.display.y, MAP_WATERFALL_KEY, 0);
    expect(test.play).toHaveBeenCalledTimes(1);
    expect(MAP_WATERFALL.display.width).toBe(Math.round(MAP_WATERFALL.mapCrop.width * 640 / 1671));
    expect(MAP_WATERFALL.display.height).toBe(Math.round(MAP_WATERFALL.mapCrop.height * 360 / 941));
  });
});
