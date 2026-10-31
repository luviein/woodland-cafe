// How often customers hint at their order instead of naming it
// (GAME_DESIGN.md §3.5). Rises day by day: day 1 is all direct, so new
// players learn the recipes first.
//
// A `type` of plain numbers (like FloorConfig) so the dev console can list
// and change it.
export type HintConfig = {
  /** Chance (0-1) that each part of an order is a hint, on day 1. */
  hintRatioStart: number;
  /** Added each day after that. */
  hintRatioPerDay: number;
  /** It never goes above this, so some orders are always easy. */
  hintRatioMax: number;
};

export const HINT_CONFIG: HintConfig = {
  hintRatioStart: 0,
  hintRatioPerDay: 0.1,
  hintRatioMax: 0.5,
};
