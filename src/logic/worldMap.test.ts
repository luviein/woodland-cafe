import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../data/locations';
import { chooseLocation } from './worldMap';

describe('chooseLocation', () => {
  it('every place can be entered for now', () => {
    expect(chooseLocation('cafe')).toBe('enter');
    expect(chooseLocation('garden')).toBe('enter');
    expect(chooseLocation('forest')).toBe('enter');
    expect(chooseLocation('marketplace')).toBe('enter');
  });

  it('locked and not-yet-built places say so', () => {
    const custom = { ...LOCATIONS.forest, locked: true };
    expect(chooseLocation('forest', { ...LOCATIONS, forest: custom })).toBe('locked');
    expect(chooseLocation('forest', { ...LOCATIONS, forest: { ...custom, locked: false, scene: null } })).toBe('notBuilt');
  });
});
