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
  // World map (placeholder shapes until the illustrated island, milestone 10)
  water: 0x4f86a8,
  waterLight: 0x6a9cbc,
  sand: 0xe3cf9a,
  grass: 0x7fae5a,
  grassDark: 0x6a9a4a,
  treeLeaf: 0x3f7a3a,
  treeTrunk: 0x6e4a2f,
  roof: 0xb0705a,
  awning: 0xd9b38c,
  signpost: 0x9c6b45,
  /** The signpost of the place the player is at. */
  signpostHere: 0x6f9e5a,
  // Forage spots
  dirt: 0x7a5a3a,
  mushroomStem: 0xeae4da,
  mushroomCap: 0xa0503a,
  bush: 0x4f8a3a,
  berry: 0xc0304a,
  // Prep station equipment: the Toaster is pixel art (art/sprites/kitchen.ts).
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
