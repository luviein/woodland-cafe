import collectionWords from '../../data/texts/cropCollection.json';
import words from '../../data/texts/fieldJournal.json';
import { COLLECTION_ITEMS, type CollectionId } from '../../logic/cropCollection';
import { cropRecord, formatCropWeight } from '../../logic/cropWeights';
import { cropName } from '../../logic/garden';
import type { GameState } from '../../logic/gameState';
import { cropQuantity } from '../cropQuantity';
import type { JournalCropCardData } from './JournalCropCard';

/** Presentation only: use existing helpers without changing records, stock or progress. */
export function journalCropCards(state: GameState, icons: ReadonlyMap<CollectionId, string>): JournalCropCardData[] {
  return COLLECTION_ITEMS.map(item => {
    const recorded = state.cropCollection.includes(item.id);
    return {
      id: item.id, recorded, icon: icons.get(item.id) ?? '',
      name: cropName(item.crop, item.variant),
      description: recorded ? collectionWords.descriptions[item.id]
        : item.variant === 'golden' ? words.goldenClue : words.christmasClue,
      quantity: collectionWords.have.replace('{amount}', cropQuantity(state.garden.harvests[item.variant][item.crop])),
      best: recorded ? collectionWords.record.replace('{weight}', formatCropWeight(cropRecord(state, item.id))) : '',
    };
  });
}
