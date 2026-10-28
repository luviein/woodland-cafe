// Equipment bought at the Marketplace. Most upgrades unlock a modifier (see
// modifiers.ts, which points back here); the Serving Tray instead allows
// double orders. Only the Toaster gets fully built (milestone 6); the rest are
// placeholder entries so the data is in its final shape.

export interface UpgradeDef {
  name: string;
  /** Price in Leaves. Placeholder values until milestone 6. */
  price: number;
  /** True if owning this lets customers order two of the same order. */
  allowsDoubleOrders?: boolean;
}

export const UPGRADES = {
  toaster: { name: 'Toaster', price: 30 },
  butterChurn: { name: 'Butter Churn', price: 40 },
  cuttingBoard: { name: 'Cutting Board', price: 25 },
  grillPan: { name: 'Grill Pan', price: 50 },
  sandwichPress: { name: 'Sandwich Press', price: 60 },
  seasoningShaker: { name: 'Seasoning Shaker', price: 20 },
  wrappingPaper: { name: 'Wrapping Paper', price: 15 },
  servingTray: { name: 'Serving Tray', price: 80, allowsDoubleOrders: true },
} satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
