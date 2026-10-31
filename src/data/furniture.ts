// Furniture the player can buy (Carpenter stall) and place in the cafe
// (GAME_DESIGN.md §5.7). Each piece is one tile; `char` is how it's written
// in a layout grid (data/cafeLayout.ts), so placed furniture can be turned
// back into rows that parseLayout() understands.

export interface FurnitureDef {
  name: string;
  /** Price in Leaves at the Carpenter stall. */
  price: number;
  /** Its letter in a layout grid: T = table, S = seat (a chair). */
  char: 'T' | 'S';
}

export const FURNITURE = {
  table: { name: 'Table', price: 30, char: 'T' },
  chair: { name: 'Chair', price: 10, char: 'S' },
} satisfies Record<string, FurnitureDef>;

export type FurnitureKind = keyof typeof FURNITURE;

export const FURNITURE_KINDS = Object.keys(FURNITURE) as FurnitureKind[];
