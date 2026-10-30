// How ingredient stock is topped up during service. See GAME_DESIGN.md §3.6.
//
// A `type` of plain numbers (like FloorConfig) so the dev console can list
// and change it.
export type StockConfig = {
  /**
   * A layer with no stock left is bought on the spot at this many times its
   * unit price. Above 1, so stocking up (shop, foraging) is worth it.
   */
  rushPriceMultiplier: number;
};

export const STOCK_CONFIG: StockConfig = {
  rushPriceMultiplier: 2,
};
