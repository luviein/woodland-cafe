import type { Point } from '../logic/layout';
import type { OutdoorLocationId } from './outdoorAreas';

// The Marketplace stalls and what each sells (GAME_DESIGN.md §5.6). What's
// on sale comes from the other data files (ingredient and upgrade prices);
// this file only says which stall sells what kind of thing, and where it is.

export interface ShopDef {
  name: string;
  location: OutdoorLocationId;
  /** Top-middle of the stall's counter, in pixels (drawn by drawStall in ui/sprites.ts). */
  stall: Point;
  /** One line under the title, saying what the stall is for. */
  blurb: string;
}

export const SHOPS = {
  pantry: {
    name: 'Pantry',
    location: 'marketplace',
    stall: { x: 160, y: 120 },
    blurb: 'Stock up on ingredients you own.',
  },
  specialty: {
    name: 'Specialty',
    location: 'marketplace',
    stall: { x: 320, y: 110 },
    blurb: 'New ingredients for new recipes.',
  },
  tools: {
    name: 'Tools',
    location: 'marketplace',
    stall: { x: 480, y: 120 },
    blurb: 'Kitchen upgrades.',
  },
} satisfies Record<string, ShopDef>;

export type ShopId = keyof typeof SHOPS;

export const SHOP_IDS = Object.keys(SHOPS) as ShopId[];

/** The stock buttons in the Pantry: how many units each tap buys. */
export const STOCK_BUY_AMOUNTS = [1, 10] as const;
