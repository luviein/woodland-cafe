import type { ArtName } from '../art/spriteArt';

export const FLOOR_FINISHES = ['Original', 'Honey wood', 'Dark wood', 'Herringbone', 'Terracotta', 'Cream checks', 'Red checks', 'Green checks'] as const;
export const WALL_FINISHES = ['Original', 'Cream floral', 'Festive cream', 'Red floral', 'Green trees'] as const;
export type RoomSurface = 'floor' | 'wall';

export function finishArt(surface: RoomSurface, style: number): ArtName {
  return style === 0 ? surface : `room${surface === 'floor' ? 'Floor' : 'Wall'}${style}` as ArtName;
}

/** Side strips advance down the room; back walls retain their window frame. */
export function wallFinishTile(style: number, x: number, y: number, width: number, window: boolean, height = 12): { art: ArtName; frame: number } {
  if ((x === 0 || x === width - 1) && (y === 0 || y === height - 1)) {
    return { art: ('roomWallCorner' + style) as ArtName, frame: (y === 0 ? 0 : 2) + (x === 0 ? 0 : 1) };
  }
  if (y > 0 && (x === 0 || x === width - 1)) {
    return { art: ('roomSideWall' + style) as ArtName, frame: style === 0 ? (x === 0 ? 0 : 1) : style === 2 ? (y - 1) % 4 + (x === 0 ? 0 : 4) : (y - 1) % 2 + (x === 0 ? 0 : 2) };
  }
  if (y === height - 1) return { art: ('roomBottomWall' + style) as ArtName, frame: 0 };
  return { art: finishArt('wall', style), frame: window ? 1 : 0 };
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
