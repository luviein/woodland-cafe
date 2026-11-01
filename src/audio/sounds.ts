// Every sound effect as a tiny recipe (GAME_DESIGN.md §8.4): no audio files,
// just notes the browser synthesizes with Web Audio. Plain data, so tests
// can check them and tuning a sound is editing numbers here.

/** One tone or noise burst. Times are in seconds from the sound's start. */
export interface SoundPart {
  /** A tone's wave shape, or 'noise' for a hiss (wiping, clicks). */
  wave: 'sine' | 'triangle' | 'square' | 'noise';
  /** Pitch in Hz (for noise: the centre of the band that's kept). */
  freq: number;
  /** Glide to this pitch by the end (tones only), e.g. a rising "pop". */
  slideTo?: number;
  start: number;
  duration: number;
  /** 0..1 before the master volume. Square waves are loud: keep them low. */
  volume: number;
}

export type SoundRecipe = readonly SoundPart[];

/** A run of equal notes, one after another: for little tunes and arpeggios. */
function notes(wave: SoundPart['wave'], freqs: readonly number[], step: number, volume: number, ring = step * 1.6): SoundPart[] {
  return freqs.map((freq, i) => ({ wave, freq, start: i * step, duration: ring, volume }));
}

// Pitches used below (Hz): C5 523, E5 659, G5 784, A5 880, B5 988, C6 1047,
// D6 1175, E6 1319, G6 1568.

export const SOUNDS = {
  tap: [{ wave: 'triangle', freq: 880, start: 0, duration: 0.05, volume: 0.25 }],
  add: [{ wave: 'triangle', freq: 440, slideTo: 560, start: 0, duration: 0.07, volume: 0.35 }],
  order: notes('sine', [784, 659], 0.13, 0.35, 0.25),
  serve: [
    { wave: 'sine', freq: 1047, start: 0, duration: 0.45, volume: 0.35 },
    { wave: 'sine', freq: 2094, start: 0, duration: 0.2, volume: 0.08 },
  ],
  servePerfect: [
    ...notes('sine', [784, 988, 1175, 1568], 0.07, 0.3),
    { wave: 'sine', freq: 3136, start: 0.28, duration: 0.3, volume: 0.06 },
  ],
  wrong: [{ wave: 'square', freq: 220, slideTo: 150, start: 0, duration: 0.3, volume: 0.1 }],
  upset: notes('square', [330, 262], 0.12, 0.08, 0.14),
  toastIn: [
    { wave: 'noise', freq: 2500, start: 0, duration: 0.03, volume: 0.3 },
    { wave: 'triangle', freq: 180, start: 0, duration: 0.08, volume: 0.3 },
  ],
  toastPop: [
    { wave: 'noise', freq: 3000, start: 0, duration: 0.025, volume: 0.3 },
    { wave: 'sine', freq: 400, slideTo: 900, start: 0.01, duration: 0.1, volume: 0.3 },
  ],
  wipe: [
    { wave: 'noise', freq: 3500, start: 0, duration: 0.09, volume: 0.25 },
    { wave: 'noise', freq: 4500, start: 0.1, duration: 0.09, volume: 0.2 },
  ],
  leaf: notes('sine', [880, 1319], 0.06, 0.25, 0.1),
  gather: notes('triangle', [523, 659, 784], 0.08, 0.3),
  buy: notes('triangle', [988, 1319], 0.08, 0.3, 0.18),
  dayEnd: notes('triangle', [523, 659, 784, 1047], 0.14, 0.3, 0.3),
} satisfies Record<string, SoundRecipe>;

export type SoundName = keyof typeof SOUNDS;

export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];

export function isSoundName(name: string): name is SoundName {
  return name in SOUNDS;
}

/** How long a sound lasts, in seconds (when its last part ends). */
export function soundLength(recipe: SoundRecipe): number {
  return Math.max(0, ...recipe.map((p) => p.start + p.duration));
}
