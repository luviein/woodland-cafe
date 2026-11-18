/** Hit areas measured against the approved island illustration at 640×360. */
export const MAP_PLACES = {
  museum: { x: 319, y: 84, width: 102, height: 64, sign: { dy: -43, width: 108, height: 28 } },
  cafe: { x: 319, y: 224, width: 112, height: 80, sign: { dy: -60, width: 92, height: 28 } },
  garden: { x: 502, y: 243, width: 134, height: 62, sign: { dy: -48, width: 96, height: 28 } },
  forest: { x: 121, y: 179, width: 138, height: 112, sign: { dy: -43, width: 90, height: 28 } },
  marketplace: { x: 506, y: 132, width: 132, height: 48, sign: { dy: -43, width: 128, height: 28 } },
} as const;

export const MAP_HUD = {
  speaker: { x: 20, y: 339, size: 24 },
  notes: { x: 49, y: 339, size: 24 },
  inventory: { x: 80, y: 339, size: 24 },
} as const;

/** Open-sea anchors leave room for the ripple's full width and small drift. */
export const MAP_RIPPLES = [
  { x: 132, y: 33 }, { x: 579, y: 32 },
  { x: 35, y: 65 }, { x: 613, y: 72 },
  { x: 25, y: 264 }, { x: 608, y: 302 },
  { x: 136, y: 333 }, { x: 411, y: 345 },
] as const;
