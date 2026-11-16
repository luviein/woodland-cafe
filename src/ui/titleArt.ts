import type { PlayerTitle } from '../logic/playerTitles';
import type { JournalImageName } from '../assets/journal';

export const TITLE_RIBBONS = {
  goldenCollector: 'goldenCollectionBadge', christmasDevotee2026: 'christmasCollectionBadge', masterCollector: 'masterCollectorRibbon',
} as const satisfies Record<PlayerTitle, JournalImageName>;
export const WORLD_TITLE_RIBBONS = {
  goldenCollector: 'goldenCollectionBadge', christmasDevotee2026: 'christmasCollectionBadge', masterCollector: 'masterCollectorWorldRibbon',
} as const satisfies Record<PlayerTitle, JournalImageName>;

/** Standalone badges stay compact; legacy ribbon sizing remains compatible. */
export const titleDisplayWidth = (title: PlayerTitle, surface: 'world' | 'preview' | 'journal'): number =>
  title === 'masterCollector' ? (surface === 'world' ? 112 : surface === 'preview' ? 128 : 160)
    : surface === 'world' ? 20 : surface === 'preview' ? 28 : 48;
