import { expect, it } from 'vitest';
import { SEED_SHOP_ART } from './sprites/seedShop';
import { holes, strayPixels } from './checks';

it('keeps every seed-shop row enclosed, including all four corners', () => {
  const frame = SEED_SHOP_ART.seedShopBoard.frames[0];
  for (const [top, bottom] of [[110,147], [151,188], [191,230], [233,273]]) {
    // Flood from outside the actual rendered rim. A missing edge pixel lets
    // the outside reach the content, even when the sprite itself has no holes.
    const rim = frame[top][256];
    const visited = new Set<string>(), queue = [[61, top - 1]];
    while (queue.length) {
      const [x,y] = queue.pop()!, key = `${x},${y}`;
      if (x < 61 || x > 455 || y < top - 1 || y > bottom + 1 || visited.has(key) || frame[y][x] === rim) continue;
      visited.add(key);
      queue.push([x-1,y], [x+1,y], [x,y-1], [x,y+1]);
    }
    expect(visited.size).toBeGreaterThan(0);
    for (let y = top + 5; y <= bottom - 5; y++) for (let x = 70; x <= 446; x++) {
      expect(visited.has(`${x},${y}`), `outside reached row interior at ${x},${y}`).toBe(false);
    }
  }
});

it.each(['Mushroom', 'Tomato', 'Chilli'] as const)('%s shop packet has an unbroken, consistent outer contour', crop => {
  const sprite = SEED_SHOP_ART[`seedShopPacket${crop}`], frame = sprite.frames[0];
  expect(holes(frame)).toBe(0);
  expect(strayPixels(frame)).toBe(0);
  frame.forEach((row,y) => [...row].forEach((char,x) => {
    if (char === '.') return;
    const edge = [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => (frame[y+dy]?.[x+dx] ?? '.') === '.');
    if (edge) expect(sprite.legend[char as keyof typeof sprite.legend], `off-colour rim at ${x},${y}`).toBe('#493026');
  }));
});
