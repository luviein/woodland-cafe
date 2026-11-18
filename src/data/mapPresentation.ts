/** Hit areas measured against the approved island illustration at 640×360. */
export const MAP_PLACES = {
  museum: { x: 319, y: 84, width: 102, height: 64, sign: { dy: -43, width: 108, height: 28 } },
  cafe: { x: 319, y: 224, width: 112, height: 80, sign: { dy: -60, width: 92, height: 28 } },
  garden: { x: 501, y: 243, width: 134, height: 62, sign: { dy: -49, width: 94, height: 28 } },
  forest: { x: 121, y: 179, width: 138, height: 112, sign: { dy: -43, width: 90, height: 28 } },
  marketplace: { x: 505, y: 132, width: 132, height: 48, sign: { dy: -45, width: 128, height: 28 } },
} as const;

export const MAP_HUD = {
  speaker: { x: 19, y: 340, size: 24 },
  notes: { x: 47, y: 340, size: 24 },
  inventory: { x: 75, y: 340, size: 24 },
} as const;
