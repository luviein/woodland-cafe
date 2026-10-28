/**
 * Every layer order the customer would accept for a recipe.
 *
 * Fixed layers (bread) stay where they are. Each run of other layers between
 * them can be shuffled freely. Example with bread fixed:
 *   bread > tuna > tomato > bread
 *   -> [bread > tuna > tomato > bread, bread > tomato > tuna > bread]
 *
 * Why list every ordering instead of writing a smarter comparison? Recipes
 * have at most a few fillings, so there are only a handful of orderings, and
 * "try each one, keep the best score" reuses layerDistance unchanged. Simple
 * beats clever when the input is this small.
 */
export function acceptedOrderings<T>(layers: readonly T[], fixed: readonly T[]): T[][] {
  // Split into segments: each fixed layer on its own, and each run of
  // non-fixed layers grouped together. bread,tuna,tomato,bread ->
  // [[bread], [tuna, tomato], [bread]]
  const segments: { items: T[]; shuffle: boolean }[] = [];
  for (const layer of layers) {
    const isFixed = fixed.includes(layer);
    const last = segments.at(-1);
    if (!isFixed && last && last.shuffle) {
      last.items.push(layer);
    } else {
      segments.push({ items: [layer], shuffle: !isFixed });
    }
  }

  // Combine: every ordering of segment 1, followed by every ordering of
  // segment 2, and so on.
  let results: T[][] = [[]];
  for (const segment of segments) {
    const options = segment.shuffle ? uniquePermutations(segment.items) : [segment.items];
    results = results.flatMap((prefix) => options.map((option) => [...prefix, ...option]));
  }
  return results;
}

/** All orderings of items, without duplicates (jam, jam has just one). */
function uniquePermutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const results: T[][] = [];
  const seen = new Set<T>();
  items.forEach((item, i) => {
    // Skip an item we already put first, so duplicates don't repeat orderings.
    if (seen.has(item)) return;
    seen.add(item);
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of uniquePermutations(rest)) results.push([item, ...perm]);
  });
  return results;
}
