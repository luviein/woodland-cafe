import { FLOOR_FINISHES, WALL_FINISHES, finishArt, type RoomSurface } from './roomFinishes';

export const FLOOR_FINISH_IDS = ['floorFinish1', 'floorFinish2', 'floorFinish3', 'floorFinish4', 'floorFinish5', 'floorFinish6', 'floorFinish7'] as const;
export const WALL_FINISH_IDS = ['wallFinish1', 'wallFinish2', 'wallFinish3', 'wallFinish4'] as const;
export const FINISH_IDS = [...WALL_FINISH_IDS, ...FLOOR_FINISH_IDS] as const;
export type FinishId = typeof FINISH_IDS[number];

export function isFinishItem(id: string): id is FinishId {
  return (FINISH_IDS as readonly string[]).includes(id);
}

export function finishProductId(surface: RoomSurface, style: number): FinishId | undefined {
  return (surface === 'wall' ? WALL_FINISH_IDS : FLOOR_FINISH_IDS)[style - 1];
}

export function finishProduct(id: FinishId) {
  const surface: RoomSurface = id.startsWith('wall') ? 'wall' : 'floor';
  const style = Number(id.at(-1));
  const name = (surface === 'wall' ? WALL_FINISHES : FLOOR_FINISHES)[style];
  return { name: `${name} ${surface === 'wall' ? 'wallpaper' : 'flooring'}`, price: 25, art: finishArt(surface, style), blurb: 'Buy once. Paint any number of tiles from Decorate.', unique: true };
}
