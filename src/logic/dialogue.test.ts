import { describe, expect, it } from 'vitest';
import {
  DOUBLE_ORDER_LINES,
  GAVE_UP_LINES,
  INGREDIENT_LINES,
  MODIFIER_LINES,
  REACTION_LINES,
  RECIPE_LINES,
} from '../data/dialogue';
import { ORDER_CONFIG, type OrderConfig } from '../data/orderConfig';
import { RECIPE_IDS } from '../data/recipes';
import { buildGaveUp, buildReaction, buildSpeech } from './dialogue';
import { seededRng } from './random';
import type { Order } from './types';

const DIRECT: OrderConfig = { ...ORDER_CONFIG, hintRatio: 0 };
const HINTS: OrderConfig = { ...ORDER_CONFIG, hintRatio: 1 };

const order = (recipeId: Order['recipeId'], extra: Partial<Order> = {}): Order => ({
  recipeId,
  modifiers: [],
  quantity: 1,
  ...extra,
});

describe('buildSpeech: direct style', () => {
  it('a plain order is one direct recipe line', () => {
    const speech = buildSpeech(order('jamBread'), seededRng(1), DIRECT);
    expect(speech).toHaveLength(1);
    expect(RECIPE_LINES.jamBread.direct).toContain(speech[0]);
  });

  it('every recipe produces a non-empty speech', () => {
    for (const id of RECIPE_IDS) {
      const speech = buildSpeech(order(id), seededRng(2), DIRECT);
      expect(speech.length, id).toBeGreaterThan(0);
    }
  });

  it('adds one line per modifier, after the recipe line', () => {
    const speech = buildSpeech(
      order('jamBread', { modifiers: ['toasted', 'toGo'] }),
      seededRng(3),
      DIRECT,
    );
    expect(speech).toHaveLength(3);
    expect(MODIFIER_LINES.toasted.direct).toContain(speech[1]);
    expect(MODIFIER_LINES.toGo.direct).toContain(speech[2]);
  });

  it('starts with a double-order line when quantity is 2', () => {
    const speech = buildSpeech(order('jamBread', { quantity: 2 }), seededRng(4), DIRECT);
    expect(DOUBLE_ORDER_LINES.direct).toContain(speech[0]);
    expect(RECIPE_LINES.jamBread.direct).toContain(speech[1]);
  });

  it('is repeatable with the same seed', () => {
    const o = order('mushroomSandwich', { modifiers: ['toasted'] });
    expect(buildSpeech(o, seededRng(9), DIRECT)).toEqual(buildSpeech(o, seededRng(9), DIRECT));
  });
});

describe('buildSpeech: hint style', () => {
  it("uses the recipe's hint lines when it has them", () => {
    const speech = buildSpeech(order('jamBread'), seededRng(5), HINTS);
    expect(speech).toHaveLength(1);
    expect(RECIPE_LINES.jamBread.hint).toContain(speech[0]);
  });

  it('builds the hint from ingredient hints when the recipe has none', () => {
    // Double Mushroom Bread has no recipe hints yet; bread and mushroom do.
    const speech = buildSpeech(order('doubleMushroomBread'), seededRng(6), HINTS);
    expect(speech).toHaveLength(2);
    expect(INGREDIENT_LINES.bread.hint).toContain(speech[0]);
    expect(INGREDIENT_LINES.mushroom.hint).toContain(speech[1]);
  });

  it('falls back to a direct line when an ingredient has no hint either', () => {
    // Tuna has no hint lines yet, so a hint for Tuna Sandwich can't be built.
    const speech = buildSpeech(order('tunaSandwich'), seededRng(7), HINTS);
    expect(speech).toHaveLength(1);
    expect(RECIPE_LINES.tunaSandwich.direct).toContain(speech[0]);
  });

  it('uses modifier hint lines when available', () => {
    const speech = buildSpeech(order('plainBread', { modifiers: ['toasted'] }), seededRng(8), HINTS);
    expect(MODIFIER_LINES.toasted.hint).toContain(speech[1]);
  });
});

describe('buildSpeech: hint ratio', () => {
  it('roughly matches the configured ratio over many orders', () => {
    const rng = seededRng(10);
    const half: OrderConfig = { ...ORDER_CONFIG, hintRatio: 0.5 };
    let hints = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const [line] = buildSpeech(order('jamBread'), rng, half);
      if (RECIPE_LINES.jamBread.hint.includes(line)) hints++;
    }
    // 50% +/- 5%: loose enough to never flake, tight enough to catch a bug.
    expect(hints / runs).toBeGreaterThan(0.45);
    expect(hints / runs).toBeLessThan(0.55);
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
