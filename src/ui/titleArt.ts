import type { PlayerTitle } from '../logic/playerTitles';
import type { JournalImageName } from '../assets/journal';

export const TITLE_RIBBONS = {
  goldenCollector: 'goldenCollectorRibbon', christmasDevotee2026: 'christmasDevoteeRibbon', masterCollector: 'masterCollectorRibbon',
} as const satisfies Record<PlayerTitle, JournalImageName>;
export const WORLD_TITLE_RIBBONS = {
  goldenCollector: 'goldenCollectorWorldRibbon', christmasDevotee2026: 'christmasDevoteeWorldRibbon', masterCollector: 'masterCollectorWorldRibbon',
} as const satisfies Record<PlayerTitle, JournalImageName>;
