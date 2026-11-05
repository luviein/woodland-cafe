import type { GardenAction } from '../logic/gardenWork';

/** Relative to the critter's centre line and container top; includes tall ears/antlers. */
export function harvestDisplayPose(critterHeight: number) {
  return { item: { x: 0, y: 24 - critterHeight - 8 } };
}

/** Shared visual poses keep the gallery preview identical to tending in the garden. */
export function gardenAnimationPose(action: GardenAction, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const frame = { plant: 0, water: 1, harvest: 2 }[action];
  return {
    frame,
    bodyY: Math.floor(p * 8) % 2,
    tool: { x: 14, y: 12 + Math.floor(p * 8) % 2 * 2 },
    particles: [0, 1, 2].map(i => {
      const phase = (p * 3 + i / 3) % 1;
      return { x: -8 + i * 6, y: action === 'harvest' ? -4 - Math.floor(phase * 12) : -14 + Math.floor(phase * 10) };
    }),
  };
}
