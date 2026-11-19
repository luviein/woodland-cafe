import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { STARTER_INGREDIENTS } from '../data/ingredients';
import { NOTES, TIP_IDS, TIPS, TUTORIAL, TUTORIAL_RECIPE, TUTORIAL_STEPS } from '../data/tutorial';
import { loadGame, saveGame } from './save';
import { createNewGame, exploredAll, seeTip, skipTutorial } from './gameState';
import {
  advanceTutorial,
  floorGuide,
  isGuidedStart,
  needsMultiDishGuide,
  tourLock,
  tutorialOrder,
  type TutorialEvent,
  type TutorialState,
} from './tutorial';

describe('the tutorial', () => {
  it('a new game starts at the intro', () => {
    expect(createNewGame().tutorial).toBe('intro');
  });

  it('goes through every step in order, each finished by its own event', () => {
    const events: TutorialEvent[] = ['next', 'orderTaken', 'served', 'wiped', 'next', 'exitCafe', 'next', 'explored', 'next'];
    const visited: TutorialState[] = ['intro'];
    for (const event of events) visited.push(advanceTutorial(visited[visited.length - 1], event));
    expect(visited).toEqual([...TUTORIAL_STEPS, 'done']);
  });

  it('ignores events a step is not waiting for', () => {
    expect(advanceTutorial('takeOrder', 'next')).toBe('takeOrder');
    expect(advanceTutorial('prep', 'wiped')).toBe('prep');
    expect(advanceTutorial('done', 'next')).toBe('done');
  });

  it('can be skipped from anywhere', () => {
    for (const step of TUTORIAL_STEPS) expect(advanceTutorial(step, 'skip')).toBe('done');
  });

  it('guides (paused clock, one patient customer) only from the intro to the first wipe', () => {
    expect(TUTORIAL_STEPS.filter(isGuidedStart)).toEqual(['intro', 'takeOrder', 'prep', 'clean']);
    expect(isGuidedStart('done')).toBe(false);
  });

  it('holds the floor during the intro, then lets one customer in until the first wipe', () => {
    expect(floorGuide('intro')).toBe('hold');
    expect(floorGuide('takeOrder')).toBe('one');
    expect(floorGuide('clean')).toBe('one');
    expect(floorGuide('freePlay')).toBeNull();
    expect(floorGuide('done')).toBeNull();
    expect(tutorialOrder()).toEqual({ recipeId: 'jamBread', modifiers: [], quantity: 1 });
  });

  it('every step has something to say', () => {
    for (const step of TUTORIAL_STEPS) expect(TUTORIAL[step].lines.length).toBeGreaterThan(0);
  });

  it('the guided order can be made from the starter ingredients', () => {
    expect(RECIPES[TUTORIAL_RECIPE].layers.every((id) => STARTER_INGREDIENTS.includes(id))).toBe(true);
  });
});

describe('places during the tutorial', () => {
  it('the Forest and Marketplace open after the map tour', () => {
    expect(tourLock('map', 'forest')).toBe("Finish Grandma's tour first");
    expect(tourLock('map', 'marketplace')).toBe("Finish Grandma's tour first");
    expect(tourLock('explore', 'forest')).toBeNull();
    expect(tourLock('farewell', 'marketplace')).toBeNull();
  });

  it('the Cafe opens only once the whole tutorial is over', () => {
    expect(tourLock('map', 'cafe')).toBe("Finish Grandma's tour first");
    expect(tourLock('explore', 'cafe')).toBe('Look around the Forest and Marketplace first');
    expect(tourLock('farewell', 'cafe')).toBe('Listen to Grandma first');
    expect(tourLock('done', 'cafe')).toBeNull();
  });
});

describe('one-off tips', () => {
  it('are unseen on a new game, and once seen stay seen', () => {
    const fresh = createNewGame();
    expect(fresh.tipsSeen).toEqual([]);
    const seen = seeTip(fresh, 'decorate');
    expect(seen.tipsSeen).toEqual(['decorate']);
    expect(seeTip(seen, 'decorate')).toBe(seen);
  });

  it('are all skipped along with the tutorial', () => {
    expect(skipTutorial(createNewGame())).toMatchObject({ tutorial: 'done', tipsSeen: [...TIP_IDS] });
  });

  it('guides the first multi-dish order only, including older saves and solo double orders', () => {
    const fresh = createNewGame();
    expect(needsMultiDishGuide(fresh, 1)).toBe(false);
    expect(needsMultiDishGuide(fresh, 2)).toBe(true);
    expect(needsMultiDishGuide(fresh, 4)).toBe(true);
    expect(needsMultiDishGuide(seeTip(fresh, 'multiDish'), 4)).toBe(false);
    expect(needsMultiDishGuide(skipTutorial(fresh), 4)).toBe(false);
    const legacy = JSON.parse(saveGame({ ...fresh, tutorial: 'done', tipsSeen: ['forest', 'marketplace', 'decorate'] }));
    legacy.version = 22;
    const loaded = loadGame(JSON.stringify(legacy));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(needsMultiDishGuide(loaded.state, 2)).toBe(true);
  });
});

describe('the map tour', () => {
  it('every pointsAt list has one target (or none) per line', () => {
    for (const def of [...Object.values(TUTORIAL), ...Object.values(TIPS)]) {
      if (def.pointsAt) expect(def.pointsAt).toHaveLength(def.lines.length);
    }
  });

  it('the explore step is done once both place guides are seen', () => {
    const one = seeTip(createNewGame(), 'marketplace');
    expect(exploredAll(one)).toBe(false);
    expect(exploredAll(seeTip(one, 'forest'))).toBe(true);
  });
});

describe("Grandma's notes", () => {
  it('every topic has a title and something to read', () => {
    for (const note of NOTES) {
      expect(note.title.length).toBeGreaterThan(0);
      expect(note.lines.length).toBeGreaterThan(0);
    }
  });
});
