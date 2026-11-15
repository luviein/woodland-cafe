import { expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { CHRISTMAS_2026_FURNITURE, CHRISTMAS_RECORDS, GOLDEN_RECORDS, recordPlayerTitles, titleProgress, titleUnlocked } from './playerTitles';
import { equipPlayerTitle } from './journal';
import { loadGame, saveGame } from './save';
import { clothingIn } from '../data/clothing';
import { toggleClothing } from './clothingShop';
import { canBuyChristmasItem } from './christmasShop';

it('unlocks Golden independently and requires both Christmas crops and all festive furniture', () => {
  const fresh = createNewGame();
  const golden = { ...fresh, cropCollection: [...GOLDEN_RECORDS] };
  expect(titleUnlocked(golden, 'goldenCollector')).toBe(true);
  expect(titleUnlocked(golden, 'christmasDevotee2026')).toBe(false);
  const crops = { ...fresh, cropCollection: [...CHRISTMAS_RECORDS] };
  expect(titleProgress(crops, 'christmasDevotee2026')).toEqual({ current: 3, target: 21 });
  expect(equipPlayerTitle(crops, 'christmasDevotee2026')).toBe(crops);
  const stored = { ...fresh.furniture.stored };
  for (const id of CHRISTMAS_2026_FURNITURE) stored[id] = 1;
  const complete = { ...crops, furniture: { ...fresh.furniture, stored } };
  expect(titleUnlocked(complete, 'christmasDevotee2026')).toBe(true);
  const missing = { ...complete, furniture: { ...complete.furniture, stored: { ...stored, treeRug: 0 } } };
  expect(titleUnlocked(missing, 'christmasDevotee2026')).toBe(false);
  const placed = { ...missing, furniture: { ...missing.furniture, placed: [{ design: 'treeRug' as const, x: 1, y: 1 }] } };
  expect(titleUnlocked(placed, 'christmasDevotee2026')).toBe(true);
  expect(titleUnlocked({ ...complete, cropCollection: CHRISTMAS_RECORDS.slice(1) }, 'christmasDevotee2026')).toBe(false);
});

it('remembers earned titles, switches one equipped title and persists without awarding currency', () => {
  const original = { ...createNewGame(), cropCollection: [...GOLDEN_RECORDS], leaves: 52 };
  const unlocked = recordPlayerTitles(original);
  expect(original.journal.unlockedTitles).toEqual([]);
  expect(unlocked.journal.unlockedTitles).toEqual(['goldenCollector']);
  const earned = { ...unlocked, cropCollection: [] };
  const equipped = equipPlayerTitle(earned, 'goldenCollector');
  expect(equipped.leaves).toBe(52);
  expect(equipped.journal.equippedTitle).toBe('goldenCollector');
  expect(loadGame(saveGame(equipped))).toEqual({ ok: true, state: equipped });
  expect(equipPlayerTitle(equipped, null).journal.equippedTitle).toBeNull();
  expect(recordPlayerTitles(unlocked)).toBe(unlocked);
});

it('preserves earned legacy titles and receipts while retiring antlers without losing ownership', () => {
  const fresh = createNewGame();
  const legacy = { ...fresh, leaves: 23, ownedClothing: [...fresh.ownedClothing, 'antlers'],
    outfit: { ...fresh.outfit, hat: 'antlers' },
    journal: { claimed: ['foundingCollection'], equippedTitle: 'masterCollector' } };
  const loaded = loadGame(JSON.stringify({ version: 20, state: legacy }));
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) return;
  expect(loaded.state.journal.unlockedTitles).toEqual(['masterCollector']);
  expect(loaded.state.journal.equippedTitle).toBe('masterCollector');
  expect(loaded.state.leaves).toBe(23);
  expect(loaded.state.museum).toEqual(fresh.museum);
  expect(loaded.state.ownedClothing).toContain('antlers');
  expect(loaded.state.outfit.hat).toBeNull();
  expect(clothingIn('hat')).not.toContain('antlers');
  expect(toggleClothing(loaded.state, 'antlers')).toBe(loaded.state);
  expect(canBuyChristmasItem({ ...fresh, christmasTickets: 999 }, 'antlers')).toBe(false);
});
