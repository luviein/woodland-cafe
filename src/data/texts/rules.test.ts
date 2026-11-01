import { describe, expect, it } from 'vitest';
import CUSTOMERS from './customers.json';
import GRANDMA from './grandma.json';
import { customerProblems, grandmaProblems, type CustomerTexts, type GrandmaTexts } from './rules';

// structuredClone: a copy to break, leaving the real texts alone.
const grandma = (): GrandmaTexts => structuredClone(GRANDMA) as GrandmaTexts;
const customers = (): CustomerTexts => structuredClone(CUSTOMERS) as CustomerTexts;

describe("the game's texts", () => {
  it("Grandma's are fine as they are", () => {
    expect(grandmaProblems(grandma())).toEqual([]);
  });

  it("the customers' are fine as they are", () => {
    expect(customerProblems(customers())).toEqual([]);
  });
});

describe('the rules catch', () => {
  it('a step with no lines, an empty line, and an arrow that step has no target for', () => {
    const t = grandma();
    t.tutorial.intro = [];
    t.tutorial.prep[0].text = '  ';
    t.tutorial.clean[0].arrow = 'pantry';
    expect(grandmaProblems(t)).toEqual([
      'Tutorial "intro": needs at least one line',
      'Tutorial "prep", line 1: is empty',
      `Tutorial "clean", line 1: the arrow can't point at "pantry" here`,
    ]);
  });

  it('a notes topic without a title or lines', () => {
    const t = grandma();
    t.notes[0] = { title: '', lines: [] };
    expect(grandmaProblems(t)).toEqual(['Notes topic 1: needs a title', 'Notes topic 1: needs at least one line']);
  });

  it('an order with no hints, and a line used for two orders', () => {
    const t = customers();
    t.recipes.jamBread.hint = [];
    t.recipes.plainBread.direct.push(t.recipes.mushroomBread.direct[0]);
    expect(customerProblems(t)).toEqual([
      'Order "jamBread": needs at least one hint line',
      `"${t.recipes.mushroomBread.direct[0]}" is used for both "plainBread" and "mushroomBread"`,
    ]);
  });

  it('a mood with no reactions, and no gave-up lines', () => {
    const t = customers();
    t.reactions.wrong = [];
    t.gaveUp = [];
    expect(customerProblems(t)).toEqual(['Reactions "wrong": need at least one line', 'Gave up: needs at least one line']);
  });
});
