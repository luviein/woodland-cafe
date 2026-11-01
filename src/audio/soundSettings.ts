// The player's sound settings (GAME_DESIGN.md §8.4): pure rules here, kept
// in the browser by audio/audio.ts. Settings, not progress, so they live
// apart from the save and survive a New game.

export interface SoundSettings {
  /** 0..1, multiplied into every sound. */
  volume: number;
  muted: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { volume: 0.6, muted: false };

/** The volume button's steps after Off. */
export const VOLUME_STEPS = [0.3, 0.6, 1] as const;

/** Reads stored settings; anything missing or odd falls back to the defaults. */
export function parseSoundSettings(text: string | null): SoundSettings {
  if (!text) return DEFAULT_SOUND_SETTINGS;
  try {
    const data = JSON.parse(text) as Partial<SoundSettings>;
    const volume = typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1 ? data.volume : DEFAULT_SOUND_SETTINGS.volume;
    const muted = typeof data.muted === 'boolean' ? data.muted : DEFAULT_SOUND_SETTINGS.muted;
    return { volume, muted };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

/** The title screen's button: Off -> 30% -> 60% -> 100% -> Off. */
export function cycleVolume(settings: SoundSettings): SoundSettings {
  if (settings.muted) return { muted: false, volume: VOLUME_STEPS[0] };
  const next = VOLUME_STEPS.find((step) => step > settings.volume + 0.001);
  return next === undefined ? { ...settings, muted: true } : { ...settings, volume: next };
}

/** What the button says: "Off" or e.g. "60%". */
export function volumeLabel(settings: SoundSettings): string {
  return settings.muted ? 'Off' : `${Math.round(settings.volume * 100)}%`;
}
