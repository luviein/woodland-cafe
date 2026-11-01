// The player's sound settings (GAME_DESIGN.md §8.4): pure rules here, kept
// in the browser by audio/audio.ts. Settings, not progress, so they live
// apart from the save and survive a New game.

export interface SoundSettings {
  /** 0..1, multiplied into every sound. */
  volume: number;
  muted: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { volume: 0.6, muted: false };

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

/** What the volume control says: "Off" (muted) or e.g. "60%". */
export function volumeLabel(settings: SoundSettings): string {
  return settings.muted ? 'Off' : `${Math.round(settings.volume * 100)}%`;
}
