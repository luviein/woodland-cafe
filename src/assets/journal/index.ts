import fieldJournal from './fieldJournal.png';
import fieldJournalIcon from './fieldJournalIcon.png';
import discoveryBadge from './discoveryBadge.png';
import goldenBadge from './goldenBadge.png';
import collectorBadge from './collectorBadge.png';
import journalCropsBookmark from './journalCropsBookmark.png';
import journalMilestonesBookmark from './journalMilestonesBookmark.png';
import masterCollectorRibbon from './masterCollectorRibbon.png';
import masterCollectorWorldRibbon from './masterCollectorWorldRibbon.png';
import goldenCollectionBadge from './source/golden-collection-badge.png';
import christmasCollectionBadge from './source/christmas-collection-badge.png';

/** Approved PNG files, not code-drawn sprites. Originals are kept in source/. */
export const JOURNAL_IMAGES = {
  fieldJournal, fieldJournalIcon, discoveryBadge, goldenBadge, collectorBadge,
  journalCropsBookmark, journalMilestonesBookmark, masterCollectorRibbon, masterCollectorWorldRibbon,
  goldenCollectionBadge, christmasCollectionBadge,
} as const;
export type JournalImageName = keyof typeof JOURNAL_IMAGES;
/** Texture frames skip surrounding padding; the supplied PNG bytes stay untouched. */
export const JOURNAL_IMAGE_FRAMES: Partial<Record<JournalImageName, { x: number; y: number; width: number; height: number }>> = {
  goldenCollectionBadge: { x: 214, y: 117, width: 877, height: 962 },
  christmasCollectionBadge: { x: 242, y: 140, width: 828, height: 937 },
};
/** Keep the artwork in full-resolution PNGs; size only their display. */
export const JOURNAL_DISPLAY_WIDTHS: Partial<Record<JournalImageName, number>> = {
  goldenCollectionBadge: 32, christmasCollectionBadge: 32,
};
export const journalImageKey = (name: JournalImageName): string => `journal:${name}`;
