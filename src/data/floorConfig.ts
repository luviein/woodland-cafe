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
  /**
   * How long a customer stands at the counter. A stand-in for ordering:
   * milestone 3 replaces it with the real queue and the prep station.
   */
  orderSeconds: number;
  eatSecondsMin: number;
  eatSecondsMax: number;
  /** How long a customer waits in line for a seat before leaving upset. */
  seatWaitSeconds: number;
  /** Seconds to wipe ONE mess, once standing next to the table (two messes take twice as long). */
  cleanSeconds: number;
};

export const FLOOR_CONFIG: FloorConfig = {
  playerSpeed: 6,
  customerSpeed: 3,
  firstCustomerDelay: 1,
  spawnIntervalMin: 4,
  spawnIntervalMax: 8,
  orderSeconds: 1.5,
  eatSecondsMin: 6,
  eatSecondsMax: 10,
  seatWaitSeconds: 20,
  cleanSeconds: 1.5,
};
