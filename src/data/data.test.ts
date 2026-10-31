import { describe, expect, it } from 'vitest';
import { acceptedOrderings } from '../logic/acceptedOrderings';
import { recipeMatchesFilter } from '../logic/orders';
import { SCORING_CONFIG } from './scoring';
import { GAVE_UP_LINES, INGREDIENT_LINES, MODIFIER_LINES, REACTION_LINES, RECIPE_LINES } from './dialogue';
import { INGREDIENT_IDS, INGREDIENTS, STARTER_INGREDIENTS } from './ingredients';
import { LOCATION_IDS, LOCATIONS, MAP_PATHS } from './locations';
import { FORAGE_SPOTS } from './forageSpots';
import { OUTDOOR_AREAS, OUTDOOR_ENTRY, OUTDOOR_WALK_AREA, isOutdoor } from './outdoorAreas';
import { SHOP_IDS, SHOPS } from './shops';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { MODIFIER_IDS, MODIFIERS } from './modifiers';
import { RECIPE_PRICES } from './prices';
import { RECIPE_IDS, RECIPES } from './recipes';
import { STOCK_CONFIG } from './stockConfig';
import { TIP_CONFIG } from './tipConfig';

// TypeScript already checks that ids line up. These tests catch the mistakes
// the compiler can't: empty lists, zero counts, rules that match nothing.
// They act as a safety net when editing data files by hand.

describe('ingredients', () => {
  it('starters are bread, mushroom and jam', () => {
    expect(STARTER_INGREDIENTS).toEqual(['bread', 'mushroom', 'jam']);
  });

  it('purchasable ingredients have an unlock price', () => {
    for (const id of INGREDIENT_IDS) {
      if (!INGREDIENTS[id].starter) expect(INGREDIENTS[id].unlockPrice, id).toBeGreaterThan(0);
    }
  });

  it('every ingredient has a whole, positive unit price', () => {
    for (const id of INGREDIENT_IDS) {
      expect(Number.isInteger(INGREDIENTS[id].unitPrice), id).toBe(true);
      expect(INGREDIENTS[id].unitPrice, id).toBeGreaterThan(0);
    }
  });

  it('only starters come with stock', () => {
    for (const id of INGREDIENT_IDS) {
      if (!INGREDIENTS[id].starter) expect(INGREDIENTS[id].startingStock, id).toBe(0);
    }
  });
});

describe('recipes', () => {
  it('every recipe has at least one layer', () => {
    for (const id of RECIPE_IDS) {
      expect(RECIPES[id].layers.length, id).toBeGreaterThan(0);
    }
  });

  it('every recipe starts with bread on the bottom', () => {
    for (const id of RECIPE_IDS) {
      expect(RECIPES[id].layers[0], id).toBe('bread');
    }
  });

  it('"sandwich" tag matches recipes with bread on the bottom and top', () => {
    for (const id of RECIPE_IDS) {
      const { layers, tags } = RECIPES[id];
      const isSandwich = (tags as readonly string[]).includes('sandwich');
      const breadBothEnds = layers.length >= 3 && layers.at(-1) === 'bread';
      expect(isSandwich, id).toBe(breadBothEnds);
    }
  });

  it('no dish is perfect for two different recipes', () => {
    // Fillings can be in any order, so compare every accepted ordering, not
    // just the listed one: bread > chilli > tuna would clash with Spicy Tuna Bread.
    const owner = new Map<string, string>();
    for (const id of RECIPE_IDS) {
      for (const layers of acceptedOrderings(RECIPES[id].layers, SCORING_CONFIG.fixedIngredients)) {
        const key = layers.join('>');
        expect(owner.get(key), `${id} clashes with ${owner.get(key)}`).toBeUndefined();
        owner.set(key, id);
      }
    }
  });
});

describe('modifiers', () => {
  it('every modifier applies to at least one recipe', () => {
    for (const id of MODIFIER_IDS) {
      const matches = RECIPE_IDS.filter((r) => recipeMatchesFilter(RECIPES[r], MODIFIERS[id].appliesTo));
      expect(matches.length, id).toBeGreaterThan(0);
    }
  });
});

describe('dialogue', () => {
  it('every recipe, ingredient and modifier has at least one direct line', () => {
    const all = { ...RECIPE_LINES, ...INGREDIENT_LINES, ...MODIFIER_LINES };
    for (const [id, lines] of Object.entries(all)) {
      expect(lines.direct.length, id).toBeGreaterThan(0);
    }
  });

  it('no line is blank', () => {
    const all = [RECIPE_LINES, INGREDIENT_LINES, MODIFIER_LINES].flatMap((group) =>
      Object.values(group).flatMap((l) => [...l.direct, ...l.hint]),
    );
    all.push(...Object.values(REACTION_LINES).flat(), ...GAVE_UP_LINES);
    for (const line of all) expect(line.trim()).not.toBe('');
  });

  it('every score has reaction lines', () => {
    for (const [score, lines] of Object.entries(REACTION_LINES)) {
      expect(lines.length, score).toBeGreaterThan(0);
    }
  });
});

describe('prices and tips', () => {
  it('every recipe costs a positive whole number of Leaves', () => {
    for (const id of RECIPE_IDS) {
      expect(Number.isInteger(RECIPE_PRICES[id]), id).toBe(true);
      expect(RECIPE_PRICES[id], id).toBeGreaterThan(0);
    }
  });

  it('every right dish earns something, even with every layer rush-bought', () => {
    for (const id of RECIPE_IDS) {
      const rushCost = RECIPES[id].layers.reduce(
        (sum, layer) => sum + INGREDIENTS[layer].unitPrice * STOCK_CONFIG.rushPriceMultiplier,
        0,
      );
      expect(RECIPE_PRICES[id], id).toBeGreaterThan(rushCost);
    }
  });

  it('tip tiers go from most to least patient, with shrinking shares', () => {
    const { tiers } = TIP_CONFIG;
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].above).toBeLessThan(tiers[i - 1].above);
      expect(tiers[i].share).toBeLessThan(tiers[i - 1].share);
    }
  });
});

describe('locations', () => {
  it('every landmark is on the map', () => {
    for (const id of LOCATION_IDS) {
      const { x, y } = LOCATIONS[id].position;
      expect(x > 0 && x < BASE_WIDTH && y > 0 && y < BASE_HEIGHT, id).toBe(true);
    }
  });

  it('outdoor places open the outdoor scene, which has their scenery', () => {
    for (const id of LOCATION_IDS) {
      if (LOCATIONS[id].scene === 'OutdoorScene') expect(isOutdoor(id), id).toBe(true);
    }
  });

  it('outdoor scenery and the entry point are inside the screen', () => {
    for (const area of Object.values(OUTDOOR_AREAS)) {
      for (const { x, y } of [...area.trees, OUTDOOR_ENTRY]) {
        expect(x > 0 && x < BASE_WIDTH && y > 0 && y < BASE_HEIGHT).toBe(true);
      }
    }
  });

  it('shop stalls are in the walk area, with room in front to stand', () => {
    const a = OUTDOOR_WALK_AREA;
    for (const id of SHOP_IDS) {
      const { x, y } = SHOPS[id].stall;
      expect(x >= a.x && x <= a.x + a.width && y >= a.y && y + 30 <= a.y + a.height, id).toBe(true);
    }
  });

  it('forage spots have unique ids, a positive amount, and sit inside the walk area', () => {
    const ids = FORAGE_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spot of FORAGE_SPOTS) {
      expect(spot.amount, spot.id).toBeGreaterThan(0);
      const { x, y } = spot.position;
      const a = OUTDOOR_WALK_AREA;
      expect(x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height, spot.id).toBe(true);
    }
  });

  it('the cafe is open and opens the cafe floor', () => {
    expect(LOCATIONS.cafe).toMatchObject({ scene: 'FloorScene', locked: false });
  });

  it('paths join two different places, each pair once', () => {
    const seen = new Set<string>();
    for (const [a, b] of MAP_PATHS) {
      expect(a).not.toBe(b);
      const key = [a, b].sort().join('-');
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });
});
