import type { ArtName } from '../art/spriteArt';
import type { Point } from '../logic/layout';
import { layoutPoint } from '../layout/positions';
import type { OutdoorLocationId } from './outdoorAreas';
import type { UpgradeId } from './upgrades';

// The Marketplace stalls and what each sells (GAME_DESIGN.md §5.6). What's
// on sale comes from the other data files (ingredient and upgrade prices);
// this file only says which stall sells what kind of thing, and where it is.

/** A day of the year, e.g. { month: 12, day: 1 } for 1 December. */
export interface MonthDay {
  month: number;
  day: number;
}

export interface ShopDef {
  name: string;
  location: OutdoorLocationId;
  /** Top-middle of the stall's counter, in pixels (movable in Arrange mode, GAME_DESIGN.md §9.3). */
  readonly stall: Point;
  /** One line under the title, saying what the stall is for. */
  blurb: string;
  /** Its sprite, when it isn't the plain market stall. */
  art?: ArtName;
  /** From the counter's top down to the stall's base, in pixels, when it isn't the plain stall's. */
  counterHeight?: number;
  /** Only there between these days (inclusive), by the player's own date; always there without one. */
  season?: { from: MonthDay; to: MonthDay };
}

/** The plain stall's counter: its bottom 16 rows (art/sprites/outdoor.ts). */
export const STALL_COUNTER_HEIGHT = 16;

export const SHOPS = {
  pantry: {
    name: 'Pantry',
    location: 'marketplace',
    get stall() {
      return layoutPoint('marketplace', 'stall.pantry', { x: 100, y: 120 });
    },
    blurb: 'Stock up on ingredients you own.',
  },
  specialty: {
    name: 'Specialty',
    location: 'marketplace',
    get stall() {
      return layoutPoint('marketplace', 'stall.specialty', { x: 210, y: 110 });
    },
    blurb: 'New ingredients for new recipes.',
  },
  tools: {
    name: 'Tools',
    location: 'marketplace',
    get stall() {
      return layoutPoint('marketplace', 'stall.tools', { x: 320, y: 120 });
    },
    blurb: 'Kitchen upgrades.',
  },
  carpenter: {
    name: 'Carpenter',
    location: 'marketplace',
    get stall() {
      return layoutPoint('marketplace', 'stall.carpenter', { x: 430, y: 110 });
    },
    blurb: 'Furniture. Place it via Cafe > Decorate.',
  },
  noticeBoard: {
    name: 'Notice Board',
    location: 'marketplace',
    get stall() {
      return layoutPoint('marketplace', 'stall.noticeBoard', { x: 540, y: 120 });
    },
    blurb: 'Hire help. Wages are paid at the end of each day.',
  },
  // The Christmas edition's stall, in the open below the others (GAME_DESIGN.md §5.10).
  christmas: {
    name: 'Christmas',
    location: 'marketplace',
    get stall() {
      return layoutPoint('marketplace', 'stall.christmas', { x: 320, y: 231 });
    },
    blurb: 'The Christmas catalogue.',
    art: 'christmasStall',
    counterHeight: 19,
    season: { from: { month: 12, day: 1 }, to: { month: 12, day: 31 } },
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
