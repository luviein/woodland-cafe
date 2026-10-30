// Tuning for the cafe floor. Speeds are in tiles per second, times in seconds.
//
// Tip: under `npm run dev`, the dev console's `config` and `set` commands
// change these live while you play. Copy values you like back into this file.
//
// A `type` rather than an `interface` on purpose: TypeScript treats a type
// alias as "an object of numbers" (assignable to Record<string, number>),
// which lets the dev console list and edit every field generically.
export type FloorConfig = {
  playerSpeed: number;
  customerSpeed: number;
  /** Seconds before the first customer walks in. */
  firstCustomerDelay: number;
  /** A new customer arrives a random time in this range after the last one. */
  spawnIntervalMin: number;
  spawnIntervalMax: number;
  eatSecondsMin: number;
  eatSecondsMax: number;
  /**
   * Full patience, in seconds: how long a customer will wait from joining the
   * counter queue until served. Counts down at a fixed rate the whole time,
   * even while their order is being made. At 0 they leave upset, unpaid.
   */
  patienceSeconds: number;
  /** Seconds to wipe ONE mess, once standing next to the table (two messes take twice as long). */
  cleanSeconds: number;
};

export const FLOOR_CONFIG: FloorConfig = {
  playerSpeed: 6,
  customerSpeed: 3,
  firstCustomerDelay: 1,
  spawnIntervalMin: 4,
  spawnIntervalMax: 8,
  eatSecondsMin: 6,
  eatSecondsMax: 10,
  patienceSeconds: 50,
  cleanSeconds: 0.5,
};
