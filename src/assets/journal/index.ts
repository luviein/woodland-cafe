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
import goldenCollectorWorldRibbon from './goldenCollectorWorldRibbon.png';
import christmasDevoteeRibbon from './christmasDevoteeRibbon.png';
import christmasDevoteeWorldRibbon from './christmasDevoteeWorldRibbon.png';

/** Approved PNG files, not code-drawn sprites. Originals are kept in source/. */
export const JOURNAL_IMAGES = {
  fieldJournal, fieldJournalIcon, discoveryBadge, goldenBadge, collectorBadge,
  journalCropsBookmark, journalMilestonesBookmark, masterCollectorRibbon, masterCollectorWorldRibbon,
  goldenCollectorRibbon, goldenCollectorWorldRibbon, christmasDevoteeRibbon, christmasDevoteeWorldRibbon,
} as const;
export type JournalImageName = keyof typeof JOURNAL_IMAGES;
export const journalImageKey = (name: JournalImageName): string => `journal:${name}`;
