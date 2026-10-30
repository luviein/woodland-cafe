import { describe, expect, it } from 'vitest';
import type { DayConfig } from '../data/dayConfig';
import { clockText, createDay, doorsOpen, isDayOver, stepDay } from './day';
import { createFloorState, type Customer } from './floor';

// 9 game hours in 90 real seconds: 1 real second = 6 game minutes.
const CONFIG: DayConfig = { dayLengthSeconds: 90, openHour: 8, closeHour: 17, clockStepMinutes: 10 };
const at = (seconds: number) => stepDay(createDay(), seconds);

describe('clockText', () => {
  it.each([
    [0, '8:00'],
    [1, '8:00'], // 6 minutes: still 8:00 in 10-minute steps
    [2, '8:10'], // 12 minutes
    [10, '9:00'],
    [45, '12:30'], // halfway
    [89.9, '16:50'], // never shows a time that hasn't happened yet
    [90, '17:00'],
    [500, '17:00'], // stops at closing time
  ])('after %fs -> %s', (seconds, text) => {
    expect(clockText(at(seconds), CONFIG)).toBe(text);
  });
});

describe('doorsOpen', () => {
  it('open until closing time, closed from then on', () => {
    expect(doorsOpen(at(0), CONFIG)).toBe(true);
    expect(doorsOpen(at(89.9), CONFIG)).toBe(true);
    expect(doorsOpen(at(90), CONFIG)).toBe(false);
  });
});

describe('isDayOver', () => {
  const someone = { id: 1 } as Customer; // only the count matters here
  const empty = createFloorState();
  const busy = { ...empty, customers: [someone] };

  it('not while the doors are open, even with nobody in', () => {
    expect(isDayOver(at(10), empty, CONFIG)).toBe(false);
  });

  it('not after closing while customers are still inside', () => {
    expect(isDayOver(at(100), busy, CONFIG)).toBe(false);
  });

  it('once closed and the last customer has left', () => {
    expect(isDayOver(at(100), empty, CONFIG)).toBe(true);
  });
});

describe('stepDay', () => {
  it('adds time without changing the day it was given', () => {
    const day = createDay();
    expect(stepDay(stepDay(day, 1), 2).elapsed).toBe(3);
    expect(day.elapsed).toBe(0);
  });
});
