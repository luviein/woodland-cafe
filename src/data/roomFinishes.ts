import type { ArtName } from '../art/spriteArt';

export const FLOOR_FINISHES = ['Original', 'Honey wood', 'Dark wood', 'Herringbone', 'Terracotta', 'Cream checks', 'Red checks', 'Green checks'] as const;
export const WALL_FINISHES = ['Original', 'Cream floral', 'Festive cream', 'Red floral', 'Green trees'] as const;
export type RoomSurface = 'floor' | 'wall';

export function finishArt(surface: RoomSurface, style: number): ArtName {
  return style === 0 ? surface : `room${surface === 'floor' ? 'Floor' : 'Wall'}${style}` as ArtName;
}

export function defaultFinishes(room: readonly string[]): string[] {
  return room.map(row => '0'.repeat(row.length));
}

export function validFinishes(value: unknown, room: readonly string[]): value is string[] {
  return Array.isArray(value) && value.length === room.length && value.every((row, y) =>
    typeof row === 'string' && row.length === room[y].length && /^[0-7]+$/.test(row) &&
    [...row].every((char, x) => room[y][x] !== 'W' || Number(char) < WALL_FINISHES.length),
  );
}
