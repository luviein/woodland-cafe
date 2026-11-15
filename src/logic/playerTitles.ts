import type { GameState } from './gameState';
import type { DesignId } from '../data/furniture';

export const TITLE_IDS = ['goldenCollector', 'christmasDevotee2026', 'masterCollector'] as const;
export type PlayerTitle = typeof TITLE_IDS[number];
export const GOLDEN_RECORDS = ['golden.mushroom', 'golden.tomato', 'golden.chilli'] as const;
export const CHRISTMAS_RECORDS = ['christmas.mushroom', 'christmas.tomato', 'christmas.chilli'] as const;
// Freeze this edition's requirements: later catalogue additions must not move its goalposts.
export const CHRISTMAS_2026_FURNITURE = ['christmasTree', 'snowman', 'tableAndCandle', 'chairWithBow',
  'giftBoxes', 'poinsettia', 'snowGlobe', 'pineGarland', 'fairyLights', 'stockings', 'baubles',
  'wreath', 'lantern', 'treePicture', 'snowflakeRug', 'treeRug', 'floralRug', 'tartanRug'] as const satisfies readonly DesignId[];

export function titleProgress(state: GameState, title: PlayerTitle): { current: number; target: number } {
  if (title === 'masterCollector') return { current: state.journal.unlockedTitles.includes(title) ? 1 : 0, target: 1 };
  const records = title === 'goldenCollector' ? GOLDEN_RECORDS : CHRISTMAS_RECORDS;
  const crops = records.filter(id => state.cropCollection.includes(id)).length;
  if (title === 'goldenCollector') return { current: crops, target: records.length };
  const furniture = CHRISTMAS_2026_FURNITURE.filter(id => state.furniture.stored[id] > 0 || state.furniture.placed.some(piece => piece.design === id)).length;
  return { current: crops + furniture, target: records.length + CHRISTMAS_2026_FURNITURE.length };
}

export function titleUnlocked(state: GameState, title: PlayerTitle): boolean {
  const progress = titleProgress(state, title);
  return state.journal.unlockedTitles.includes(title) || progress.current >= progress.target;
}

/** Opening the wardrobe remembers qualifying collections without spending anything. */
export function recordPlayerTitles(state: GameState): GameState {
  const unlockedTitles = TITLE_IDS.filter(title => titleUnlocked(state, title));
  return unlockedTitles.length === state.journal.unlockedTitles.length ? state
    : { ...state, journal: { ...state.journal, unlockedTitles } };
}
