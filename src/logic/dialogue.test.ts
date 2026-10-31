import { describe, expect, it } from 'vitest';
import { DOUBLE_ORDER_LINES, GAVE_UP_LINES, MODIFIER_LINES, REACTION_LINES, RECIPE_LINES } from '../data/dialogue';
import { RECIPE_IDS } from '../data/recipes';
import { buildGaveUp, buildReaction, buildSpeech, hintRatioForDay } from './dialogue';
import { seededRng } from './random';
import type { Order } from './types';

const DIRECT = 0;
const HINTS = 1;

const order = (recipeId: Order['recipeId'], extra: Partial<Order> = {}): Order => ({
  recipeId,
  modifiers: [],
  quantity: 1,
  ...extra,
});

describe('buildSpeech: direct style', () => {
  it('a plain order is one direct recipe line', () => {
    const speech = buildSpeech(order('jamBread'), DIRECT, seededRng(1));
    expect(speech).toHaveLength(1);
    expect(RECIPE_LINES.jamBread.direct).toContain(speech[0]);
  });

  it('every recipe produces a non-empty speech', () => {
    for (const id of RECIPE_IDS) {
      const speech = buildSpeech(order(id), DIRECT, seededRng(2));
      expect(speech.length, id).toBeGreaterThan(0);
    }
  });

  it('adds one line per modifier, after the recipe line', () => {
    const speech = buildSpeech(order('jamBread', { modifiers: ['toasted', 'toGo'] }), DIRECT, seededRng(3));
    expect(speech).toHaveLength(3);
    expect(MODIFIER_LINES.toasted.direct).toContain(speech[1]);
    expect(MODIFIER_LINES.toGo.direct).toContain(speech[2]);
  });

  it('starts with a double-order line when quantity is 2', () => {
    const speech = buildSpeech(order('jamBread', { quantity: 2 }), DIRECT, seededRng(4));
    expect(DOUBLE_ORDER_LINES.direct).toContain(speech[0]);
    expect(RECIPE_LINES.jamBread.direct).toContain(speech[1]);
  });

  it('is repeatable with the same seed', () => {
    const o = order('mushroomSandwich', { modifiers: ['toasted'] });
    expect(buildSpeech(o, DIRECT, seededRng(9))).toEqual(buildSpeech(o, DIRECT, seededRng(9)));
  });
});

describe('buildSpeech: hint style', () => {
  it("uses the recipe's hint lines when it has them", () => {
    const speech = buildSpeech(order('jamBread'), HINTS, seededRng(5));
    expect(speech).toHaveLength(1);
    expect(RECIPE_LINES.jamBread.hint).toContain(speech[0]);
  });

  it('every recipe hints with one line of its own', () => {
    for (const id of RECIPE_IDS) {
      const speech = buildSpeech(order(id), HINTS, seededRng(6));
      expect(speech, id).toHaveLength(1);
      expect(RECIPE_LINES[id].hint, id).toContain(speech[0]);
    }
  });

  it('falls back to a direct line for a placeholder modifier with no hints yet', () => {
    const speech = buildSpeech(order('jamBread', { modifiers: ['toGo'] }), HINTS, seededRng(7));
    expect(MODIFIER_LINES.toGo.direct).toContain(speech[1]);
  });

  it('uses modifier hint lines when available', () => {
    const speech = buildSpeech(order('plainBread', { modifiers: ['toasted'] }), HINTS, seededRng(8));
    expect(MODIFIER_LINES.toasted.hint).toContain(speech[1]);
  });
});

describe('buildSpeech: hint ratio', () => {
  it('roughly matches the configured ratio over many orders', () => {
    const rng = seededRng(10);
    let hints = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const [line] = buildSpeech(order('jamBread'), 0.5, rng);
      if (RECIPE_LINES.jamBread.hint.includes(line)) hints++;
    }
    // 50% +/- 5%: loose enough to never flake, tight enough to catch a bug.
    expect(hints / runs).toBeGreaterThan(0.45);
    expect(hints / runs).toBeLessThan(0.55);
  });
});

describe('hintRatioForDay', () => {
  const CONFIG = { hintRatioStart: 0, hintRatioPerDay: 0.1, hintRatioMax: 0.5 };

  it('starts with no hints on day 1, then adds a step each day', () => {
    expect(hintRatioForDay(1, CONFIG)).toBe(0);
    expect(hintRatioForDay(2, CONFIG)).toBeCloseTo(0.1);
    expect(hintRatioForDay(4, CONFIG)).toBeCloseTo(0.3);
  });

  it('stops at the cap', () => {
    expect(hintRatioForDay(6, CONFIG)).toBeCloseTo(0.5);
    expect(hintRatioForDay(40, CONFIG)).toBe(0.5);
  });
});

describe('buildReaction', () => {
  it('picks a line matching the score', () => {
    const rng = seededRng(11);
    for (const score of ['perfect', 'close', 'wrong'] as const) {
      expect(REACTION_LINES[score]).toContain(buildReaction(score, rng));
    }
  });

  it('happy, indifferent and angry lines never overlap', () => {
    // Reactions are the only feedback, so one line must not mean two moods.
    const all = [...REACTION_LINES.perfect, ...REACTION_LINES.close, ...REACTION_LINES.wrong];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('buildGaveUp', () => {
  it('picks a gave-up line, never a normal reaction', () => {
    const line = buildGaveUp(seededRng(3));
    expect(GAVE_UP_LINES).toContain(line);
    expect(Object.values(REACTION_LINES).flat()).not.toContain(line);
  });
});
