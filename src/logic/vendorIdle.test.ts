import { describe, expect, it } from 'vitest';
import { vendorIdlePose } from './vendorIdle';

describe('stall vendor idle', () => {
  it('breathes by one whole pixel and blinks briefly before reopening', () => {
    expect(vendorIdlePose(0)).toEqual({ frame: 0, lift: 0 });
    expect(vendorIdlePose(1400).lift).toBe(-1);
    expect(vendorIdlePose(2700).lift).toBe(0);
    expect(vendorIdlePose(3800).frame).toBe(1);
    expect(vendorIdlePose(3940).frame).toBe(0);
    expect(vendorIdlePose(8400).frame).toBe(1);
  });
});
