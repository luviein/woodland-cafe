// How tips work. See GAME_DESIGN.md §4 (Patience & Tips).
//
// A served customer pays the dish price plus a tip. The tip starts as a share
// of the price, shrinks with how long they waited, and is cut further for a
// "close" dish (a wrong modifier counts as a mistake there, see scoreDish).
// A wrong dish pays nothing at all.
export interface TipTier {
  /** Applies when the patience left (0..1) is MORE than this. */
  above: number;
  /** Share of the full tip given in this tier (1 = all of it). */
  share: number;
}

export interface TipConfig {
  /** The full tip as a share of the dish price: 1 = the price again, 0.5 = half. */
  fullTipShare: number;
  /**
   * Checked top to bottom; the first tier the patience left is above wins.
   * Below every tier: no tip. Exactly on a boundary counts as the lower tier.
   */
  tiers: readonly TipTier[];
  /** Tip multiplier for a "close" dish. */
  closeMultiplier: number;
}

export const TIP_CONFIG: TipConfig = {
  // A whole price: with prices this small, a half-price tip rounds away to
  // nothing in the lower tiers.
  fullTipShare: 1,
  tiers: [
    { above: 0.75, share: 1 }, // full tip
    { above: 0.5, share: 0.6 }, // reduced
    { above: 0.25, share: 0.3 }, // small
    // 25% or less: no tip
  ],
  closeMultiplier: 0.5,
};
