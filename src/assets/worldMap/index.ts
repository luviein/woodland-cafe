import island from './source/island.png';

/** The approved source stays unchanged; this frame reuses blank wallet parchment for live text. */
export const MAP_IMAGE = island;
export const MAP_IMAGE_KEY = 'worldMap:island';
export const MAP_WALLET_PAPER = { name: 'walletPaper', x: 174, y: 30, width: 12, height: 40 } as const;
