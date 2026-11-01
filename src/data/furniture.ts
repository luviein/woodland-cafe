import type { ArtName } from '../art/spriteArt';

// Furniture the player can buy and place in the cafe (GAME_DESIGN.md §5.7,
// §5.10). Every piece is one tile. A DESIGN is one thing you can buy (the
// plain chair, the Chair with Bow); its KIND says how it works in the cafe:
// tables and chairs seat customers whatever their design, floor decorations
// just stand there, wall decorations hang on the back wall.

export type FurnitureKind = 'table' | 'chair' | 'floorDecor' | 'wallDecor';

/** Where a design is sold: the Carpenter stall, or a catalogue edition (§5.10). */
export type FurnitureShop = 'carpenter' | 'christmas';

export interface FurnitureDesign {
  name: string;
  kind: FurnitureKind;
  /** Price in Leaves. */
  price: number;
  shop: FurnitureShop;
  /** Its sprite. A chair's has three views: front, facing left, facing right (CHAIR_VIEWS). */
  art: ArtName;
  /** One line about it, for the catalogue. */
  blurb: string;
}

export const FURNITURE = {
  // The plain ones keep the ids 'table' and 'chair' (the kinds' old names),
  // so saves from before designs read straight in.
  table: { name: 'Table', kind: 'table', price: 30, shop: 'carpenter', art: 'table', blurb: 'A sturdy wooden table.' },
  chair: { name: 'Chair', kind: 'chair', price: 10, shop: 'carpenter', art: 'chair', blurb: 'A simple wooden chair.' },
  // The Christmas edition
  christmasTree: { name: 'Christmas Tree', kind: 'floorDecor', price: 80, shop: 'christmas', art: 'christmasTree', blurb: 'Baubles, bows and a star on top.' },
  snowman: { name: 'Snowman', kind: 'floorDecor', price: 60, shop: 'christmas', art: 'snowman', blurb: "He won't melt indoors. Promise." },
  tableAndCandle: { name: 'Table & Candle', kind: 'table', price: 50, shop: 'christmas', art: 'tableAndCandle', blurb: 'A red cloth and a warm candle.' },
  chairWithBow: { name: 'Chair with Bow', kind: 'chair', price: 20, shop: 'christmas', art: 'chairWithBow', blurb: 'A red cushion and a bow.' },
  giftBoxes: { name: 'Gift Boxes', kind: 'floorDecor', price: 35, shop: 'christmas', art: 'giftBoxes', blurb: 'No peeking!' },
  poinsettia: { name: 'Poinsettia Plant', kind: 'floorDecor', price: 20, shop: 'christmas', art: 'poinsettia', blurb: 'Red leaves for a winter window.' },
  snowGlobe: { name: 'Snow Globe', kind: 'floorDecor', price: 15, shop: 'christmas', art: 'snowGlobe', blurb: 'Give it a shake.' },
  pineGarland: { name: 'Pine Garland', kind: 'wallDecor', price: 35, shop: 'christmas', art: 'pineGarland', blurb: 'Pine, bows and a little glow.' },
  fairyLights: { name: 'Fairy Lights', kind: 'wallDecor', price: 25, shop: 'christmas', art: 'fairyLights', blurb: 'A string of warm little lights.' },
  stockings: { name: 'Stockings', kind: 'wallDecor', price: 20, shop: 'christmas', art: 'stockings', blurb: 'Hung up with care.' },
  baubles: { name: 'Bauble Ornaments', kind: 'wallDecor', price: 20, shop: 'christmas', art: 'baubles', blurb: 'Red, gold and green.' },
  wreath: { name: 'Christmas Wreath', kind: 'wallDecor', price: 35, shop: 'christmas', art: 'wreath', blurb: 'Holly, pinecones and a bow.' },
  lantern: { name: 'Lantern', kind: 'wallDecor', price: 20, shop: 'christmas', art: 'lantern', blurb: 'A soft light for long nights.' },
  treePicture: { name: 'Christmas Tree Picture', kind: 'wallDecor', price: 40, shop: 'christmas', art: 'treePicture', blurb: 'A snowy tree, framed.' },
} as const satisfies Record<string, FurnitureDesign>;

export type DesignId = keyof typeof FURNITURE;

export const DESIGN_IDS = Object.keys(FURNITURE) as DesignId[];

export function kindOf(design: DesignId): FurnitureKind {
  return FURNITURE[design].kind;
}

/** The designs a shop sells, in catalogue order. */
export function designsSoldBy(shop: FurnitureShop): DesignId[] {
  return DESIGN_IDS.filter((id) => FURNITURE[id].shop === shop);
}

/**
 * The Christmas catalogue (GAME_DESIGN.md §5.10): its sections, each a tab
 * down the book's side, and the pieces on its cover. Sold at the Christmas stall.
 */
export const CHRISTMAS_CATALOGUE = {
  title: 'Woodland Cafe',
  edition: 'Christmas Edition',
  tabs: [
    { name: 'Furniture', designs: designsSoldBy('christmas').filter((d) => kindOf(d) === 'table' || kindOf(d) === 'chair') },
    { name: 'Decor', designs: designsSoldBy('christmas').filter((d) => kindOf(d) === 'floorDecor') },
    { name: 'Wall', designs: designsSoldBy('christmas').filter((d) => kindOf(d) === 'wallDecor') },
  ],
  cover: ['christmasTree', 'giftBoxes', 'snowman'],
} as const satisfies { title: string; edition: string; tabs: readonly { name: string; designs: readonly DesignId[] }[]; cover: readonly ArtName[] };

/** How a kind is written in a layout grid (data/cafeLayout.ts). Wall decorations aren't on the floor, so they have none. */
export const KIND_CHAR = { table: 'T', chair: 'S', floorDecor: 'X' } as const satisfies Partial<Record<FurnitureKind, string>>;

/** A chair's frames: which way the sitter faces. Plain chairs have one frame, used for all three. */
export const CHAIR_VIEWS = { front: 0, left: 1, right: 2 } as const;
