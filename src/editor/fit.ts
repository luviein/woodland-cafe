import type { TipId, TutorialStep } from '../data/texts/rules';

// The text editor's fit check (GAME_DESIGN.md §9.1): would a line fit where the
// game shows it? Each place has a text width and a number of lines it can
// hold. These mirror the game's layout (ui/StoryBox.ts and where each scene
// puts Grandma's box, ui/SpeechBubble.ts, ui/NotesPanel.ts): if one of those
// changes size, change it here too.

export interface Fit {
  /** Where the line is shown, for the warning. */
  where: string;
  /** Text width in pixels. */
  width: number;
  maxLines: number;
  /** CSS font the game draws it in, for measuring. */
  font: string;
}

const SMALL = '12px monospace'; // Grandma's box, her notes (TEXT.label)
const BODY = '14px monospace'; // the speech bubble (TEXT.body)

/** Grandma's box text width is the box width minus her portrait and padding (StoryBox). */
const box = (where: string, boxWidth: number, maxLines: number): Fit => ({
  where,
  width: boxWidth - 50,
  maxLines,
  font: SMALL,
});

export const FITS = {
  floor: box("Grandma's box under the cafe", 543, 2),
  prep: box("Grandma's box at the prep station", 216, 4),
  summary: box("Grandma's box on the day summary", 512, 2),
  map: box("Grandma's box on the map", 543, 2),
  decorate: box("Grandma's box in Decorate", 455, 2),
  outdoors: box("Grandma's box in the Forest and Marketplace", 543, 2),
  /** One topic's page in Grandma's notes, all its lines together (with a blank line between). */
  notes: { where: "a page of Grandma's notes", width: 348, maxLines: 13, font: SMALL },
  /** One customer line in the speech bubble (an order can be two or three of these). */
  bubble: { where: 'the speech bubble', width: 372, maxLines: 2, font: BODY },
} satisfies Record<string, Fit>;

/** Where each tutorial step's and tip's lines are shown. */
export const STEP_FIT: Record<TutorialStep | TipId, Fit> = {
  intro: FITS.floor,
  takeOrder: FITS.floor,
  prep: FITS.prep,
  clean: FITS.floor,
  freePlay: FITS.floor,
  summary: FITS.summary,
  map: FITS.map,
  explore: FITS.map,
  farewell: FITS.map,
  decorate: FITS.decorate,
  marketplace: FITS.outdoors,
  forest: FITS.outdoors,
};

/**
 * How many lines `text` wraps to at `width`, word by word like the game.
 * `measure` gives a string's width in pixels (the editor uses a canvas with
 * the game's font; tests pass a simple one). A word too long for a line
 * breaks onto its own lines.
 */
export function wrappedLines(text: string, width: number, measure: (s: string) => number): number {
  let lines = 1;
  let current = '';
  for (const word of text.trim().split(/\s+/)) {
    const tryLine = current ? `${current} ${word}` : word;
    if (measure(tryLine) <= width) {
      current = tryLine;
    } else if (!current) {
      lines += Math.ceil(measure(word) / width) - 1; // a lone long word
      current = '';
    } else {
      lines++;
      current = word;
    }
  }
  return lines;
}
