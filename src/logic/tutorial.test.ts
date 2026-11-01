import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { STARTER_INGREDIENTS } from '../data/ingredients';
import { TUTORIAL, TUTORIAL_RECIPE, TUTORIAL_STEPS } from '../data/tutorial';
import { createNewGame } from './gameState';
import {
  advanceTutorial,
  floorGuide,
  isGuidedStart,
  tutorialOrder,
  type TutorialEvent,
  type TutorialState,
} from './tutorial';

describe('the tutorial', () => {
  it('a new game starts at the intro', () => {
    expect(createNewGame().tutorial).toBe('intro');
  });

  it('goes through every step in order, each finished by its own event', () => {
    const events: TutorialEvent[] = ['next', 'orderTaken', 'served', 'wiped', 'next', 'exitCafe', 'next'];
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
