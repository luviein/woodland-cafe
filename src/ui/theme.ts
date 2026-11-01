import type Phaser from 'phaser';
import { PALETTE } from '../art/palette';

// The look of the game in one place, so visual changes start here instead of
// being hunted down across every scene. Milestone 10 moves every colour onto
// the palette (GAME_DESIGN.md §8.1): the UI colours first; the rest as each
// area gets its art.

export const COLORS = {
  wall: PALETTE.brown,
  counter: PALETTE.wood,
  counterEdge: PALETTE.darkBrown,
  paper: PALETTE.cream,
  paperEdge: PALETTE.sand,
  ink: PALETTE.darkBrown,
  plate: PALETTE.white,
  plateEdge: PALETTE.silver,
  serve: PALETTE.green,
  reset: PALETTE.rust,
  book: PALETTE.blue,
  disabled: PALETTE.grey,
  // Customer status label colours, so mood reads at a glance.
  statusCalm: PALETTE.cream,
  statusImpatient: PALETTE.orange,
  statusUpset: PALETTE.red,
  overlay: PALETTE.black,
  // World map and outdoors (the scenery itself is pixel art)
  water: PALETTE.blue,
  waterLight: PALETTE.sky,
  foam: PALETTE.white,
  sand: PALETTE.sand,
  grass: PALETTE.lime,
  grassDark: PALETTE.green,
  treeTrunk: PALETTE.brown,
  signpost: PALETTE.wood,
  /** The signpost of the place the player is at. */
  signpostHere: PALETTE.green,
} as const;

/**
 * Patience bar colour (floor and prep station): green while patient, orange
 * past half, red in the last quarter. `fraction` is patience left, 0..1.
 */
export function patienceColor(fraction: number): number {
  if (fraction > 0.5) return COLORS.serve;
  if (fraction > 0.25) return COLORS.statusImpatient;
  return COLORS.statusUpset;
}

/** Phaser text colours are CSS strings, not numbers like shape colours. */
export const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

const FONT = 'monospace';

export const TEXT = {
  body: { fontFamily: FONT, fontSize: '14px', color: css(COLORS.ink) },
  heading: { fontFamily: FONT, fontSize: '16px', color: css(COLORS.ink), fontStyle: 'bold' },
  button: { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold' },
  label: { fontFamily: FONT, fontSize: '12px', color: css(COLORS.paper) },
} satisfies Record<string, Phaser.Types.GameObjects.Text.TextStyle>;
