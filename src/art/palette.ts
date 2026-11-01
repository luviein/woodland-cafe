// The game's only colours (GAME_DESIGN.md §8.1): the Endesga 32 palette from
// Lospec. Every sprite, code-drawn or hand-drawn, uses just these, which is
// what makes the art look like one world. Names describe the colour, not
// what it's used for, so one colour can serve many things.

export const PALETTE = {
  rust: 0xbe4a2f,
  clay: 0xd77643,
  cream: 0xead4aa,
  sand: 0xe4a672,
  wood: 0xb86f50,
  brown: 0x733e39,
  /** The outline colour: softer than black. */
  darkBrown: 0x3e2731,
  wine: 0xa22633,
  red: 0xe43b44,
  orange: 0xf77622,
  gold: 0xfeae34,
  yellow: 0xfee761,
  lime: 0x63c74d,
  green: 0x3e8948,
  forest: 0x265c42,
  deepTeal: 0x193c3e,
  blue: 0x124e89,
  sky: 0x0099db,
  cyan: 0x2ce8f5,
  white: 0xffffff,
  silver: 0xc0cbdc,
  grey: 0x8b9bb4,
  slate: 0x5a6988,
  darkSlate: 0x3a4466,
  night: 0x262b44,
  black: 0x181425,
  cherry: 0xff0044,
  plum: 0x68386c,
  magenta: 0xb55088,
  pink: 0xf6757a,
  peach: 0xe8b796,
  tan: 0xc28569,
} as const;

export type PaletteName = keyof typeof PALETTE;
