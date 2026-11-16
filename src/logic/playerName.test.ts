import { expect, it } from 'vitest';
import { normalisePlayerName } from './playerName';
import { createNewGame } from './gameState';
import { loadGame, saveGame } from './save';

it('normalises spaces and checks Unicode name length and unsafe control characters', () => {
  expect(normalisePlayerName('  Maple   Moss  ')).toBe('Maple Moss');
  expect(normalisePlayerName('🍃'.repeat(16))).toBe('🍃'.repeat(16));
  for (const value of ['', '   ', 'a'.repeat(17), 'Maple\nMoss', 'Maple\u202eMoss'])
    expect(normalisePlayerName(value)).toBeNull();
});

it('round-trips names, preserves unnamed legacy progress and rejects malformed saved names', () => {
  const state = { ...createNewGame(), playerName: 'Maple Moss', leaves: 487, day: 8 };
  expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
  const legacy = JSON.parse(saveGame(state));
  legacy.version = 21; delete legacy.state.playerName;
  expect(loadGame(JSON.stringify(legacy))).toEqual({ ok: true, state: { ...state, playerName: '' } });
  for (const name of [null, 12, 'a'.repeat(17), '  Maple', 'Maple\u0000']) {
    legacy.state.playerName = name;
    expect(loadGame(JSON.stringify(legacy)).ok).toBe(false);
  }
});
