/**
 * Counts the fewest "mistakes" that turn one layer list into another, where a
 * mistake is one of:
 *   - a missing layer         (bread > jam      vs bread > jam > bread)
 *   - an extra layer          (bread > jam > jam > bread)
 *   - a replaced layer        (bread > mushroom > bread)
 *   - two neighbours swapped  (bread > bread > jam)
 *
 * This is a known algorithm: "optimal string alignment" distance (Levenshtein
 * edit distance plus adjacent swaps). Plain Levenshtein would count a swap as
 * 2 mistakes, which felt too harsh for a slip of the paw.
 *
 * How it works (dynamic programming): d[i][j] = mistakes needed to turn the
 * first i layers of `a` into the first j layers of `b`. Each cell is built
 * from smaller answers already in the table, so the whole thing is
 * O(a.length * b.length). Tiny for dishes of a few layers.
 */
export function layerDistance<T>(a: readonly T[], b: readonly T[]): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  // Turning i layers into nothing = i deletions, and nothing into j = j insertions.
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const replaceCost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // layer in a is missing from b
        d[i][j - 1] + 1, // layer in b is extra
        d[i - 1][j - 1] + replaceCost, // same layer, or one replaced
      );
      // Two neighbours swapped: a = ..XY, b = ..YX
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}
