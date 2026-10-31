// Equipment bought at the Marketplace. Most upgrades unlock a modifier (see
// modifiers.ts, which points back here); the Serving Tray instead allows
// double orders. Only the Toaster gets fully built (milestone 6); the rest are
// placeholder entries so the data is in its final shape.

export interface UpgradeDef {
  name: string;
  /** Price in Leaves at the Tools stall. */
  price: number;
  /** What it does, in a few words, for the Tools stall (e.g. "toasted orders"). */
  effect: string;
  /** True if owning this lets customers order two of the same order. */
  allowsDoubleOrders?: boolean;
}

export const UPGRADES = {
  toaster: { name: 'Toaster', price: 30, effect: 'toasted orders' },
  butterChurn: { name: 'Butter Churn', price: 40, effect: 'buttered orders' },
  cuttingBoard: { name: 'Cutting Board', price: 25, effect: 'cut in half' },
  grillPan: { name: 'Grill Pan', price: 50, effect: 'grilled orders' },
  sandwichPress: { name: 'Sandwich Press', price: 60, effect: 'pressed sandwiches' },
  seasoningShaker: { name: 'Seasoning Shaker', price: 20, effect: 'seasoned orders' },
  wrappingPaper: { name: 'Wrapping Paper', price: 15, effect: 'orders to go' },
  servingTray: { name: 'Serving Tray', price: 80, effect: 'double orders', allowsDoubleOrders: true },
} satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
