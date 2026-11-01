import { describe, expect, it } from 'vitest';
import GRANDMA from '../data/texts/grandma.json';
import { TIP_IDS, TUTORIAL_STEPS, type GrandmaTexts } from '../data/texts/rules';
import { STEP_FIT, wrappedLines } from './fit';

// A stand-in for measuring: 12px monospace is about 7.2px a character.
const mono = (s: string) => s.length * 7.2;

describe('wrapping like the game', () => {
  it('keeps words together and counts the lines', () => {
    expect(wrappedLines('one two three', 100, mono)).toBe(1);
    expect(wrappedLines('one two three four five six', 72, mono)).toBe(3); // 10 characters a line
  });

  it('a word longer than a line takes extra lines', () => {
    expect(wrappedLines('a'.repeat(25), 72, mono)).toBe(3);
  });
});

describe("Grandma's current lines", () => {
  it('all fit their boxes', () => {
    const t = GRANDMA as GrandmaTexts;
    for (const key of [...TUTORIAL_STEPS, ...TIP_IDS]) {
      const lines = key in t.tutorial ? t.tutorial[key as keyof GrandmaTexts['tutorial']] : t.tips[key as keyof GrandmaTexts['tips']];
      const fit = STEP_FIT[key];
      for (const line of lines) expect(wrappedLines(line.text, fit.width, mono), `${key}: ${line.text}`).toBeLessThanOrEqual(fit.maxLines);
    }
  });
});
