import { FINISH_IDS, finishProduct, finishProductId, type FinishId } from '../data/roomFinishProducts';
import type { RoomSurface } from '../data/roomFinishes';
import { spendLeaves, type GameState } from './gameState';

export function ownsFinish(state: Pick<GameState, 'ownedFinishes'>, surface: RoomSurface, style: number): boolean {
  const id = finishProductId(surface, style);
  return style === 0 || (id !== undefined && state.ownedFinishes.includes(id));
}

export function canBuyFinish(state: GameState, id: FinishId): boolean {
  return !state.ownedFinishes.includes(id) && state.leaves >= finishProduct(id).price;
}

export function buyFinish(state: GameState, id: FinishId): GameState {
  if (!canBuyFinish(state, id)) throw new Error(`Cannot buy finish '${id}'`);
  const paid = spendLeaves(state, finishProduct(id).price);
  return { ...paid, ownedFinishes: FINISH_IDS.filter(item => item === id || paid.ownedFinishes.includes(item)) };
}

/** Existing painted finishes survive the change from free brushes to purchases. */
export function appliedFinishIds(room: readonly string[], finishes: readonly string[]): FinishId[] {
  const applied = new Set<FinishId>();
  room.forEach((row, y) => [...row].forEach((char, x) => {
    if (char !== 'W' && !'.PO123456789'.includes(char)) return;
    const id = finishProductId(char === 'W' ? 'wall' : 'floor', Number(finishes[y][x]));
    if (id) applied.add(id);
  }));
  return FINISH_IDS.filter(id => applied.has(id));
}

/** A locked finish cannot be applied via a stale UI or a hand-edited save. */
export function ownedFinishGrid(room: readonly string[], finishes: readonly string[], ownedFinishes: readonly FinishId[]): string[] {
  return finishes.map((row, y) => [...row].map((char, x) => {
    const surface = room[y][x] === 'W' ? 'wall' : 'floor';
    return ownsFinish({ ownedFinishes }, surface, Number(char)) ? char : '0';
  }).join(''));
}
