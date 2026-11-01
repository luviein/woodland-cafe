import { PALETTE } from '../art/palette';
import { css } from './theme';

// The short "Sound off" / "Sound on" note when M is pressed. M works in
// every scene, so the note is a little piece of HTML over the game canvas
// rather than part of any one Phaser scene.

const SHOW_MS = 1200;

let note: HTMLDivElement | null = null;
let hideTimer: number | undefined;

export function showSoundNote(text: string): void {
  if (!note) {
    note = document.createElement('div');
    Object.assign(note.style, {
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '6px 12px',
      font: 'bold 16px monospace',
      color: css(PALETTE.cream),
      background: css(PALETTE.darkBrown),
      border: `2px solid ${css(PALETTE.cream)}`,
      pointerEvents: 'none', // never in the way of a tap
      transition: 'opacity 200ms',
    });
    document.body.appendChild(note);
  }
  note.textContent = text;
  note.style.opacity = '1';
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (note) note.style.opacity = '0';
  }, SHOW_MS);
}
