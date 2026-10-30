import type Phaser from 'phaser';

// Placeholder look of the game in one place. When real art and a pixel font
// arrive (milestone 10), most visual changes start here instead of being
// hunted down across every scene.

export const COLORS = {
  wall: 0x4a3a33,
  counter: 0xa0704a,
  counterEdge: 0x7a5236,
  paper: 0xf4e9d8,
  paperEdge: 0xc9b79c,
  ink: 0x3b2a20,
  plate: 0xeae4da,
  plateEdge: 0xb8ad9e,
  serve: 0x6f9e5a,
  reset: 0xb0705a,
  book: 0x5a7a9c,
  disabled: 0x8a817a,
  // Cafe floor tiles
  floorA: 0xc9a77c,
  floorB: 0xbf9c70,
  wallTile: 0x5c4339,
  doorTile: 0x8fb573,
  counterTop: 0x7a5236,
  tableTop: 0x9c6b45,
  seatTile: 0x6e4a2f,
  orderSpot: 0xe0c48f,
  player: 0x5a7a9c,
  apron: 0xf4e9d8,
  mess: 0x5b3b22,
  messLight: 0x8a6440,
  // Customer status label colours, so mood reads at a glance.
  statusCalm: 0xf4e9d8,
  statusImpatient: 0xf0a040,
  statusUpset: 0xe0503c,
  /** Customer fur colours; each customer gets one, picked by id. */
  customerFur: [0x9c6b45, 0xc98a4b, 0x8a817a, 0xd9b38c, 0x6e4a2f],
  overlay: 0x000000,
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
