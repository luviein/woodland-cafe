// The cafe floor as a tile grid, one character per 16x16 tile. Edit this to
// change or expand the cafe; no code changes needed. logic/layout.ts turns it
// into tables, seats and walkable tiles, and its tests check it's valid.
//
// Key:
//   W  wall               .  floor
//   D  door (customers enter and leave here)
//   C  counter            O  order spot: where customers stand at the counter
//   T  table              S  seat (must touch exactly one table)
//   P  counter spot (floor): where the player stands to take orders, right
//      across the counter from O. The player also starts the day here.
//   1-9  counter queue (floor): where customers wait BEHIND the order spot O.
//        1 is next in line, then 2, 3... (whoever is at O is being served)
//
// Text rows are used instead of JSON arrays because you can SEE the room
// while editing it. Every row must be the same width.
export const CAFE_LAYOUT: readonly string[] = [
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'W..................P...W',
  'W..............CCCCCCC.W',
  'W..................O...W',
  'W....................1.W',
  'W...STS...STS........2.W',
  'W....................3.W',
  'W....................4.W',
  'W...STS...STS........5.W',
  'W......................W',
  'W......................W',
  'W......................W',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWDWWWWW',
];
