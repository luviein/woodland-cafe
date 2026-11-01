import { BASE_HEIGHT } from '../config/display';

// Where the corner buttons are (HudScene), shared so other screens can keep
// clear of them, and so Grandma's arrow can point at the ? button.

/** The speaker button's centre: the bottom-left corner, clear of every screen's own buttons. */
export const SPEAKER_BUTTON = { x: 16, y: BASE_HEIGHT - 16, size: 22 };
/** Grandma's notes button, just right of the speaker. */
export const NOTES_BUTTON = { x: SPEAKER_BUTTON.x + SPEAKER_BUTTON.size + 4, y: SPEAKER_BUTTON.y, size: 22 };
/** Story boxes along the bottom start here, right of both buttons. */
export const BOTTOM_BOX_LEFT = NOTES_BUTTON.x + NOTES_BUTTON.size / 2 + 8;
