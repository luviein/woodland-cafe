import { COLLECTION_IDS } from './cropCollection';
import type { GameState } from './gameState';

export const MILESTONE_IDS = ['firstDiscovery', 'goldenFind', 'foundingCollection'] as const;
// This founding set stays achievable when future events add more collections.
export const FOUNDING_COLLECTION_IDS = ['golden.mushroom', 'golden.tomato', 'golden.chilli',
  'christmas.mushroom', 'christmas.tomato', 'christmas.chilli'] as const;
export type MilestoneId = typeof MILESTONE_IDS[number];
export const MILESTONE_LEAVES: Readonly<Record<MilestoneId, number>> = {
  firstDiscovery: 25, goldenFind: 50, foundingCollection: 0,
};
export type PlayerTitle = 'masterCollector';
export interface JournalProgress {
  readonly claimed: readonly MilestoneId[];
  readonly equippedTitle: PlayerTitle | null;
}
export const emptyJournal = (): JournalProgress => ({ claimed: [], equippedTitle: null });

export function milestoneProgress(state: GameState, id: MilestoneId): { current: number; target: number } {
  const found = COLLECTION_IDS.filter(entry => state.cropCollection.includes(entry));
  if (id === 'firstDiscovery') return { current: Math.min(1, found.length), target: 1 };
  if (id === 'goldenFind') return { current: Math.min(1, found.filter(entry => entry.startsWith('golden.')).length), target: 1 };
  return { current: FOUNDING_COLLECTION_IDS.filter(entry => state.cropCollection.includes(entry)).length,
    target: FOUNDING_COLLECTION_IDS.length };
}

export function canClaimMilestone(state: GameState, id: MilestoneId): boolean {
  const progress = milestoneProgress(state, id);
  const leaves = MILESTONE_LEAVES[id];
  return !state.journal.claimed.includes(id) && progress.current >= progress.target
    && Number.isSafeInteger(state.leaves + leaves)
    && (id !== 'foundingCollection' || Number.isSafeInteger(state.museum.storedCases + 1));
}

/** Rewards and the receipt change together, so reopening cannot award twice. */
export function claimMilestone(state: GameState, id: MilestoneId): GameState {
  if (!canClaimMilestone(state, id)) return state;
  return { ...state,
    leaves: state.leaves + MILESTONE_LEAVES[id],
    museum: id === 'foundingCollection' ? { ...state.museum, storedCases: state.museum.storedCases + 1 } : state.museum,
    journal: { ...state.journal, claimed: MILESTONE_IDS.filter(entry => entry === id || state.journal.claimed.includes(entry)) },
  };
}

export function equipPlayerTitle(state: GameState, title: PlayerTitle | null): GameState {
  if (title !== null && !state.journal.claimed.includes('foundingCollection') || state.journal.equippedTitle === title) return state;
  return { ...state, journal: { ...state.journal, equippedTitle: title } };
}

export function validJournal(value: unknown): value is JournalProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return Array.isArray(raw.claimed) && raw.claimed.every(id => MILESTONE_IDS.includes(id))
    && new Set(raw.claimed).size === raw.claimed.length
    && (raw.equippedTitle === null || raw.equippedTitle === 'masterCollector' && raw.claimed.includes('foundingCollection'));
}

/** Preserve cafe rollback while committing only journal receipts and rewards. */
export function journalCheckpoint(checkpoint: GameState, before: GameState, after: GameState): GameState {
  return { ...checkpoint, journal: after.journal,
    leaves: checkpoint.leaves + (after.leaves - before.leaves),
    museum: { ...checkpoint.museum, storedCases: checkpoint.museum.storedCases + (after.museum.storedCases - before.museum.storedCases) },
  };
}
