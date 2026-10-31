import { describe, expect, it } from 'vitest';
import {
  canToast,
  startToasting,
  stepToasting,
  takeFromToaster,
  toastModifiers,
  toastingProgress,
  untoasted,
} from './toasting';

const CONFIG = { toastSeconds: 2 };

describe('toasting a dish', () => {
  it('goes plate -> toasting -> ready -> plate, toasted', () => {
    let toast = startToasting(untoasted(), CONFIG);
    expect(toast.place).toBe('toasting');
    toast = stepToasting(toast, 1.5);
    expect(toast.place).toBe('toasting');
    expect(toastingProgress(toast, CONFIG)).toBeCloseTo(0.75);
    toast = stepToasting(toast, 0.5);
    expect(toast).toEqual({ place: 'ready', secondsLeft: 0, toasted: true });
    toast = takeFromToaster(toast);
    expect(toast.place).toBe('plate');
    expect(toastModifiers(toast)).toEqual(['toasted']);
  });

  it('only takes a non-empty, untoasted dish from the plate', () => {
    expect(canToast(untoasted(), 2)).toBe(true);
    expect(canToast(untoasted(), 0)).toBe(false);
    const toasting = startToasting(untoasted(), CONFIG);
    expect(canToast(toasting, 2)).toBe(false);
    const done = takeFromToaster(stepToasting(toasting, 5));
    expect(canToast(done, 3)).toBe(false); // already toasted, even with a layer added after
  });

  it("can't be taken out before it pops up", () => {
    const toasting = startToasting(untoasted(), CONFIG);
    expect(takeFromToaster(toasting)).toBe(toasting);
  });

  it('time only matters while toasting', () => {
    expect(stepToasting(untoasted(), 10)).toEqual(untoasted());
    expect(toastingProgress(untoasted(), CONFIG)).toBe(0);
  });

  it('an untoasted plate has no modifiers', () => {
    expect(toastModifiers(untoasted())).toEqual([]);
  });
});
