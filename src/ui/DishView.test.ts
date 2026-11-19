import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { layerArt } from './art';

vi.mock('phaser', () => ({ default: { GameObjects: { Container: class {} } } }));

import { addLayerArt, drawLayerStack } from './DishView';

function fixture() {
  const object = (..._args: unknown[]) => ({ setOrigin() { return this; }, setScale() { return this; } });
  const image = vi.fn(object), tileSprite = vi.fn(object);
  const scene = {
    textures: { getFrame: (key: string, frame: number) => ({
      width: ['art:breadBottomLayer', 'art:mushroomLayer', 'art:jamLayer'].includes(key) ? frame === 1 ? 32 : 12 : 4,
      height: ['art:breadBottomLayer', 'art:mushroomLayer', 'art:jamLayer'].includes(key) ? 8 : 6,
    }) },
    add: { image, tileSprite, container: vi.fn((_x: number, _y: number, children: unknown[]) => children) },
  } as unknown as Phaser.Scene;
  return { scene, image, tileSprite };
}

describe('approved dish layers', () => {
  it('uses supplied bread only for an untoasted bottom slice, preserving top and toasted bread', () => {
    expect(layerArt('bread', false, true)).toBe('breadBottomLayer');
    expect(layerArt('bread', false, false)).toBe('breadLayer');
    expect(layerArt('bread', true, true)).toBe('breadToastedLayer');
    expect(layerArt('bread', true, false)).toBe('breadToastedLayer');
  });

  it('repeats the detailed PNG centre at its actual height instead of cropping it to six pixels', () => {
    const test = fixture();
    addLayerArt(test.scene, 'mushroom', false, 0, 0, 112, 2);
    expect(test.tileSprite).toHaveBeenCalledWith(-32, 0, 32, 8, 'art:mushroomLayer', 1);
    expect(test.image.mock.calls.map(call => call.slice(2))).toEqual([['art:mushroomLayer', 0], ['art:mushroomLayer', 2]]);
  });

  it('keeps the original six-pixel art and cap geometry for other ingredients', () => {
    const test = fixture();
    addLayerArt(test.scene, 'tomato', false, 0, 0, 112, 2);
    expect(test.tileSprite).toHaveBeenCalledWith(-48, 0, 48, 6, 'art:tomatoLayer', 1);
  });

  it('selects bottom bread consistently for plate, toaster and drag stack rendering', () => {
    const test = fixture();
    const into = { scene: test.scene, removeAll: vi.fn(), add: vi.fn() } as unknown as Phaser.GameObjects.Container;
    drawLayerStack(into, ['bread', 'mushroom', 'bread'], false);
    expect(test.tileSprite.mock.calls.map(call => call[4])).toEqual(['art:breadBottomLayer', 'art:mushroomLayer', 'art:breadLayer']);
    expect(into.add).toHaveBeenCalledTimes(3);
  });
});
