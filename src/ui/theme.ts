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
  customer: 0x9c6b45,
  customerDark: 0x6e4a2f,
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
  overlay: 0x000000,
} as const;

/** Phaser text colours are CSS strings, not numbers like shape colours. */
const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

const FONT = 'monospace';

export const TEXT = {
  body: { fontFamily: FONT, fontSize: '14px', color: css(COLORS.ink) },
  heading: { fontFamily: FONT, fontSize: '16px', color: css(COLORS.ink), fontStyle: 'bold' },
  button: { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold' },
  label: { fontFamily: FONT, fontSize: '12px', color: css(COLORS.paper) },
} satisfies Record<string, Phaser.Types.GameObjects.Text.TextStyle>;
