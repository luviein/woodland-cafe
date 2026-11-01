import { SOUNDS, soundLength, type SoundName, type SoundPart } from './sounds';
import { parseSoundSettings, type SoundSettings } from './soundSettings';

// Plays the code-made sounds (audio/sounds.ts) through the browser's Web
// Audio API, and keeps the sound settings. One module-level AudioContext for
// the whole game: browsers allow only a few, and start them "suspended"
// until the player has tapped or pressed something, so it's created on the
// first sound (which always follows a tap or key) and resumed if needed.

const SETTINGS_KEY = 'woodland-cafe-sound';
/** A short fade in and out on every part, so tones start and stop without a click. */
const FADE = 0.005;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let settings: SoundSettings = loadSettings();
const listeners = new Set<(settings: SoundSettings) => void>();

function loadSettings(): SoundSettings {
  try {
    return parseSoundSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return parseSoundSettings(null); // storage blocked (e.g. private mode): defaults
  }
}

export function getSoundSettings(): SoundSettings {
  return settings;
}

/** Changes the settings: stores them, applies the volume, and tells listeners (e.g. the title button). */
export function setSoundSettings(next: SoundSettings): void {
  settings = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Not stored: they still apply for this visit.
  }
  if (master) master.gain.value = next.muted ? 0 : next.volume;
  for (const listener of listeners) listener(next);
}

/** Calls `listener` whenever the settings change; returns a function that stops it. */
export function onSoundSettings(listener: (settings: SoundSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The shared context, made on first use. Null where Web Audio isn't available. */
function audio(): { context: AudioContext; master: GainNode } | null {
  if (!context) {
    if (typeof AudioContext === 'undefined') return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = settings.muted ? 0 : settings.volume;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return { context, master: master! };
}

/** One second of random samples: white noise, filtered per part into a hiss or a click. */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Plays a sound effect now. Silent when muted (or without Web Audio); never throws. */
export function playSound(name: SoundName): void {
  if (settings.muted) return;
  const out = audio();
  if (!out) return;
  const now = out.context.currentTime;
  for (const part of SOUNDS[name]) playPart(out.context, out.master, part, now);
}

function playPart(ctx: AudioContext, destination: AudioNode, part: SoundPart, now: number): void {
  const start = now + part.start;
  const end = start + part.duration;
  // Loudness: a quick fade in, then an exponential fall (how plucked and
  // struck things sound), reaching silence at the end.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(part.volume, start + FADE);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(destination);

  let source: AudioScheduledSourceNode;
  if (part.wave === 'noise') {
    const hiss = ctx.createBufferSource();
    hiss.buffer = noiseBuffer(ctx);
    // A band-pass filter keeps only the noise around `freq`: low = a thud, high = a swish.
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = part.freq;
    hiss.connect(band).connect(gain);
    source = hiss;
  } else {
    const tone = ctx.createOscillator();
    tone.type = part.wave;
    tone.frequency.setValueAtTime(part.freq, start);
    if (part.slideTo) tone.frequency.exponentialRampToValueAtTime(part.slideTo, end);
    tone.connect(gain);
    source = tone;
  }
  source.start(start);
  source.stop(end + FADE);
}

/** How long a sound lasts, in seconds (for the dev console). */
export function soundSeconds(name: SoundName): number {
  return soundLength(SOUNDS[name]);
}
