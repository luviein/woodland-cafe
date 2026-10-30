// How long a cafe day lasts. See GAME_DESIGN.md §5.1.
//
// A `type` of plain numbers (like FloorConfig) so the dev console can list
// and change it.
export type DayConfig = {
  /** Real seconds from opening to closing time (at normal floor speed). */
  dayLengthSeconds: number;
  /** Game-clock hour the cafe opens (24h). */
  openHour: number;
  /** Game-clock hour the doors close: no new customers after this. */
  closeHour: number;
  /**
   * The clock moves in steps of this many game minutes (8:00, 8:10...), so
   * the display doesn't flicker every frame and reads like a cafe clock.
   */
  clockStepMinutes: number;
};

export const DAY_CONFIG: DayConfig = {
  dayLengthSeconds: 180,
  openHour: 8,
  closeHour: 17,
  clockStepMinutes: 10,
};
