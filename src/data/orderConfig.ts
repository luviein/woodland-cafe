// Tuning knobs for order generation. Kept as plain data so later milestones
// (day cycle) can swap in harder values as days go on.
export interface OrderConfig {
  /** 0 = speech is always direct, 1 = always hints. Milestone 1 uses 0. */
  hintRatio: number;
  /** Chance (0-1) that each eligible, unlocked modifier gets added to an order. */
  modifierChance: number;
  /** Upper limit on modifiers per order, so orders stay readable. */
  maxModifiers: number;
  /** Chance (0-1) of a double order once the Serving Tray is owned. */
  doubleOrderChance: number;
}

export const ORDER_CONFIG: OrderConfig = {
  hintRatio: 0,
  modifierChance: 0.4,
  maxModifiers: 2,
  doubleOrderChance: 0.25,
};
