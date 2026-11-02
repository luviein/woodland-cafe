import { describe, expect, it } from 'vitest';
import { CAFE_ROOM } from '../data/cafeRoom';
import { isRoomSaveInput, paintRoom, roomProblems } from './roomPainter';

describe('room painter', () => {
  it('accepts the current room and its starter furniture', () => {
    expect(roomProblems(CAFE_ROOM)).toEqual([]);
  });

  it('moves unique markers and paints ordinary tiles without mutating the source', () => {
    const original = [...CAFE_ROOM];
    const moved = paintRoom(CAFE_ROOM, { x: 17, y: 3 }, 'O');
    expect(moved[3][17]).toBe('O');
    expect(moved[3][19]).toBe('.');
    expect(moved.join('').split('O')).toHaveLength(2);
    expect(CAFE_ROOM).toEqual(original);
    const walls = paintRoom(paintRoom(CAFE_ROOM, { x: 2, y: 2 }, 'W'), { x: 3, y: 2 }, 'W');
    expect(walls[2].slice(2, 4)).toBe('WW');
    expect(paintRoom(CAFE_ROOM, { x: -1, y: 4 }, 'W')).toEqual(CAFE_ROOM);
  });

  it('blocks missing mandatory spots and gaps in queue numbering', () => {
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 18, y: 11 }, '.'))[0]).toContain('door');
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 21, y: 5 }, '.'))[0]).toContain('gap');
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 19, y: 1 }, '.'))[0]).toContain('counter spot');
  });

  it('requires a counter between the player and order positions', () => {
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 19, y: 2 }, '.'))).toContain('P and O must face each other across one counter tile.');
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 18, y: 3 }, 'O'))).toContain('P and O must face each other across one counter tile.');
  });

  it('blocks disconnected walkways', () => {
    let rows = [...CAFE_ROOM];
    for (let y = 1; y < 11; y++) rows = paintRoom(rows, { x: 13, y }, 'W');
    expect(roomProblems(rows)).toContain('All walkable tiles must connect to the door.');
  });

  it('protects starter and saved furniture, including wall and counter pieces', () => {
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 4, y: 5 }, 'W')).join(' ')).toContain('Starter furniture');
    const placed = [{ design: 'table' as const, x: 2, y: 3 }];
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 2, y: 3 }, 'W'), placed).join(' ')).toContain('Saved furniture');
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 1, y: 0 }, '.'), [{ design: 'wreath', x: 1, y: 0 }]).join(' ')).toContain('Saved furniture');
    expect(roomProblems(paintRoom(CAFE_ROOM, { x: 15, y: 2 }, '.'), [{ design: 'snowGlobe', x: 15, y: 2 }])).toEqual([]);
  });

  it('rejects resizing and furniture characters in the room data', () => {
    expect(roomProblems(CAFE_ROOM.slice(1))[0]).toContain('24 columns');
    const rows = [...CAFE_ROOM]; rows[1] = rows[1].replace('.', 'T');
    expect(roomProblems(rows)[0]).toContain('Use only');
  });

  it('validates request shapes and rejects invalid furniture data', () => {
    const request = { rows: [...CAFE_ROOM], base: [...CAFE_ROOM], placed: [] };
    expect(isRoomSaveInput(request)).toBe(true);
    expect(isRoomSaveInput({ ...request, placed: [{ design: 'unknown', x: 1, y: 1 }] })).toBe(false);
    expect(isRoomSaveInput({ ...request, placed: [{ design: 'table', x: 1.5, y: 1 }] })).toBe(false);
    expect(isRoomSaveInput({ ...request, base: [] })).toBe(false);
    expect(isRoomSaveInput(null)).toBe(false);
  });
});
