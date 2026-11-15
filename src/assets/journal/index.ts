import fieldJournal from './fieldJournal.png';
import fieldJournalIcon from './fieldJournalIcon.png';
import discoveryBadge from './discoveryBadge.png';
import goldenBadge from './goldenBadge.png';
import collectorBadge from './collectorBadge.png';
import journalCropsBookmark from './journalCropsBookmark.png';
import journalMilestonesBookmark from './journalMilestonesBookmark.png';
import masterCollectorRibbon from './masterCollectorRibbon.png';
import masterCollectorWorldRibbon from './masterCollectorWorldRibbon.png';
import goldenCollectorRibbon from './goldenCollectorRibbon.png';
import christmasDevoteeRibbon from './christmasDevoteeRibbon.png';

/** Approved PNG files, not code-drawn sprites. Originals are kept in source/. */
export const JOURNAL_IMAGES = {
  fieldJournal, fieldJournalIcon, discoveryBadge, goldenBadge, collectorBadge,
  journalCropsBookmark, journalMilestonesBookmark, masterCollectorRibbon, masterCollectorWorldRibbon,
  goldenCollectorRibbon, christmasDevoteeRibbon,
} as const;
export type JournalImageName = keyof typeof JOURNAL_IMAGES;
/** Keep the lettering in full-resolution PNGs; size only their display. */
export const JOURNAL_DISPLAY_WIDTHS: Partial<Record<JournalImageName, number>> = {
  goldenCollectorRibbon: 192, christmasDevoteeRibbon: 192,
};
export const journalImageKey = (name: JournalImageName): string => `journal:${name}`;
