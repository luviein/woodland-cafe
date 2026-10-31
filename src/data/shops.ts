import type { Point } from '../logic/layout';
import type { OutdoorLocationId } from './outdoorAreas';
import type { UpgradeId } from './upgrades';

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
    stall: { x: 100, y: 120 },
    blurb: 'Stock up on ingredients you own.',
  },
  specialty: {
    name: 'Specialty',
    location: 'marketplace',
    stall: { x: 210, y: 110 },
    blurb: 'New ingredients for new recipes.',
  },
  tools: {
    name: 'Tools',
    location: 'marketplace',
    stall: { x: 320, y: 120 },
    blurb: 'Kitchen upgrades.',
  },
  carpenter: {
    name: 'Carpenter',
    location: 'marketplace',
    stall: { x: 430, y: 110 },
    blurb: 'Furniture. Place it via Cafe > Decorate.',
  },
  noticeBoard: {
    name: 'Notice Board',
    location: 'marketplace',
    stall: { x: 540, y: 120 },
    blurb: 'Hire help. Wages are paid at the end of each day.',
  },
} satisfies Record<string, ShopDef>;

export type ShopId = keyof typeof SHOPS;

export const SHOP_IDS = Object.keys(SHOPS) as ShopId[];

/** The stock buttons in the Pantry: how many units each tap buys. */
export const STOCK_BUY_AMOUNTS = [1, 10] as const;

/**
 * Upgrades the Tools stall sells, in this order. Only ones that are built
 * (their modifier works at the prep station) go here; the rest wait.
 */
export const TOOLS_ON_SALE: readonly UpgradeId[] = ['toaster'];
