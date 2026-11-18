import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createNewGame } from '../../logic/gameState';
import { COLLECTION_ITEMS } from '../../logic/cropCollection';
import collectionWords from '../../data/texts/cropCollection.json';
import words from '../../data/texts/fieldJournal.json';
import { JournalCropCard } from './JournalCropCard';
import { journalCropCards } from './journalCropData';

const icons = new Map(COLLECTION_ITEMS.map(item => [item.id, `/existing/${item.id}.png`]));

describe('React journal crop entries', () => {
  it('uses the same card for all six entries with live zero quantities and unchanged PNG sources', () => {
    const state = createNewGame();
    const snapshot = structuredClone(state);
    const cards = journalCropCards(state, icons);
    expect(cards).toHaveLength(6);
    for (const entry of cards) {
      const html = renderToStaticMarkup(createElement(JournalCropCard, { entry }));
      expect(html).toContain(`src="/existing/${entry.id}.png"`);
      expect(html).toContain('Have: 0');
      expect(html).toContain(entry.name);
      expect(html).toContain(entry.description);
      expect(entry.best).toBe('');
    }
    expect(state).toEqual(snapshot);
  });

  it('shows discovered descriptions, current inventory and the retained best weight without writing state', () => {
    const initial = createNewGame();
    const state = { ...initial, cropCollection: ['golden.tomato'] as const,
      cropRecords: { ...initial.cropRecords, 'golden.tomato': 3250 },
      garden: { ...initial.garden, harvests: { ...initial.garden.harvests, golden: { ...initial.garden.harvests.golden, tomato: 12 } } } };
    const snapshot = structuredClone(state);
    const entry = journalCropCards({ ...state, cropCollection: [...state.cropCollection] }, icons).find(card => card.id === 'golden.tomato')!;
    expect(entry.description).toBe(collectionWords.descriptions['golden.tomato']);
    expect(entry.quantity).toBe('Have: 12');
    expect(entry.best).toContain('3.25');
    const html = renderToStaticMarkup(createElement(JournalCropCard, { entry }));
    expect(html).toContain('Have: 12');
    expect(html).toContain(entry.best);
    expect(state).toEqual(snapshot);
  });

  it('preserves existing discovery clues and compact quantity formatting for long stocks', () => {
    const state = createNewGame();
    const next = { ...state, garden: { ...state.garden, harvests: { ...state.garden.harvests,
      christmas: { ...state.garden.harvests.christmas, chilli: 1000000 } } } };
    const cards = journalCropCards(next, icons);
    expect(cards.find(card => card.id === 'golden.chilli')!.description).toBe(words.goldenClue);
    const christmas = cards.find(card => card.id === 'christmas.chilli')!;
    expect(christmas.description).toBe(words.christmasClue);
    expect(renderToStaticMarkup(createElement(JournalCropCard, { entry: christmas }))).toContain('Have: 1M');
  });
});
