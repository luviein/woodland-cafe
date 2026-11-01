import { describe, expect, it } from 'vitest';
import { SOUND_NAMES, SOUNDS, soundLength } from './sounds';
import { DEFAULT_SOUND_SETTINGS, parseSoundSettings, volumeLabel } from './soundSettings';

describe('sound recipes', () => {
  it.each(SOUND_NAMES)('%s is short, audible and not too loud', (name) => {
    const recipe = SOUNDS[name];
    expect(recipe.length).toBeGreaterThan(0);
    for (const part of recipe) {
      expect(part.start).toBeGreaterThanOrEqual(0);
      expect(part.duration).toBeGreaterThan(0.01); // longer than the fade in and out
      expect(part.freq).toBeGreaterThanOrEqual(60);
      expect(part.freq).toBeLessThanOrEqual(8000);
      expect(part.volume).toBeGreaterThan(0);
      expect(part.volume).toBeLessThanOrEqual(0.5);
    }
    // Effects, not music: nothing should hang around.
    expect(soundLength(recipe)).toBeLessThanOrEqual(1);
  });
});

describe('sound settings', () => {
  it('start at 60%, unmuted', () => {
    expect(parseSoundSettings(null)).toEqual({ volume: 0.6, muted: false });
  });

  it('read back what was stored, and fall back on anything odd', () => {
    expect(parseSoundSettings('{"volume":0.3,"muted":true}')).toEqual({ volume: 0.3, muted: true });
    expect(parseSoundSettings('{"volume":7}')).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(parseSoundSettings('not json')).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it('the control says Off when muted, else the percentage', () => {
    expect(volumeLabel({ volume: 0.6, muted: false })).toBe('60%');
    expect(volumeLabel({ volume: 0.35, muted: false })).toBe('35%');
    expect(volumeLabel({ volume: 0.6, muted: true })).toBe('Off');
  });
});
