import { BASE_HEIGHT } from '../config/display';
import { layoutPoint } from '../layout/positions';

// Where the corner buttons are (HudScene), shared so other screens can keep
// clear of them, and so Grandma's arrow can point at the ? button. Movable
// in Arrange mode (GAME_DESIGN.md §9.3), so read them when they're needed.

const SIZE = 22;

/** The speaker button's centre: the bottom-left corner, clear of every screen's own buttons. */
export function speakerButton(): { x: number; y: number; size: number } {
  return { ...layoutPoint('hud', 'speaker', { x: 16, y: BASE_HEIGHT - 16 }), size: SIZE };
}

/** Grandma's notes button, just right of the speaker. */
export function notesButton(): { x: number; y: number; size: number } {
  const speaker = speakerButton();
  return { ...layoutPoint('hud', 'notes', { x: speaker.x + speaker.size + 4, y: speaker.y }), size: SIZE };
}

/**
 * Story boxes along the bottom start here: right of both buttons while
 * they're in the bottom-left corner, else at the screen's own margin.
 */
export function bottomBoxLeft(): number {
  const right = Math.max(...[speakerButton(), notesButton()].filter((b) => b.y > BASE_HEIGHT - 70 && b.x < 160).map((b) => b.x + b.size / 2 + 8), 8);
  return right;
}
