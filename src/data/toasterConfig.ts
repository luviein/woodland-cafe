// The Toaster at the prep station. See GAME_DESIGN.md §3.4 "Toasting".
//
// A `type` of plain numbers (like FloorConfig) so the dev console can list
// and change it.
export type ToasterConfig = {
  /** Seconds the dish spends in the toaster before it pops up. */
  toastSeconds: number;
};

export const TOASTER_CONFIG: ToasterConfig = {
  toastSeconds: 2,
};
