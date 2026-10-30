// All randomness goes through an Rng function instead of calling Math.random()
// directly. Tests (and later, a "daily seed") can pass a predictable Rng and
// get the same results every run.

/** Returns a number in [0, 1), like Math.random. */
export type Rng = () => number;

/**
 * Seeded generator (mulberry32): same seed -> same sequence of numbers.
 * Tiny and fast; fine for games, not for anything security-related.
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [min, max). */
export function between(min: number, max: number, rng: Rng): number {
  return min + rng() * (max - min);
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) {
    throw new Error('pickOne: cannot pick from an empty list');
  }
  return items[Math.floor(rng() * items.length)];
}

/** Returns a shuffled copy (Fisher-Yates); the input is left untouched. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
