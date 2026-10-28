// The cafe floor as a tile grid, one character per 16x16 tile. Edit this to
// change or expand the cafe; no code changes needed. logic/layout.ts turns it
// into tables, seats and walkable tiles, and its tests check it's valid.
//
// Key:
//   W  wall               .  floor
//   D  door (customers enter and leave here)
//   C  counter            O  order spot: where customers stand at the counter
//   T  table              S  seat (must touch exactly one table)
//   P  player start (floor)
//
// Text rows are used instead of JSON arrays because you can SEE the room
// while editing it. Every row must be the same width.
export const CAFE_LAYOUT: readonly string[] = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'W..............P.......W',
  'W..............CCCCCCC.W',
  'W..................O...W',
  'W......................W',
  'W...STS...STS..........W',
  'W......................W',
  'W......................W',
  'W...STS...STS..........W',
  'W......................W',
  'W......................W',
  'W......................W',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWDWWWWW',
];
