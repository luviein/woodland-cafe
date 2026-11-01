import type { PixelSprite } from '../pixelSprite';

// The cafe room and its furniture, all 16x16 tiles seen slightly from the
// front (tops and front edges), like the characters. Tiles that sit side by
// side (floor, wall, counter) have no outline on their left and right edges,
// so a row of them reads as one piece instead of a grid of boxes.

/** Wooden floor planks. Two frames = two plank patterns, mixed so the floor doesn't look tiled. */
export const FLOOR: PixelSprite = {
  legend: { t: 'tan', w: 'wood', s: 'sand' },
  frames: [
    [
      'ttsttttttttwtttt',
      'tttttttttttwtttt',
      'tttttttttttwttst',
      'wwwwwwwwwwwwwwww',
      'ttttwttttttttttt',
      'ttttwtttttsttttt',
      'ttttwttttttttttt',
      'wwwwwwwwwwwwwwww',
      'tttttttttwtttttt',
      'tstttttttwtttttt',
      'tttttttttwttttst',
      'wwwwwwwwwwwwwwww',
      'twtttttttttttttt',
      'twttttttsttttttt',
      'twtttttttttttttt',
      'wwwwwwwwwwwwwwww',
    ],
    [
      'ttttttwttttttttt',
      'ttttttwtttsttttt',
      'ttttttwttttttttt',
      'wwwwwwwwwwwwwwww',
      'tttttttttttttwtt',
      'tstttttttttttwtt',
      'tttttttttttttwtt',
      'wwwwwwwwwwwwwwww',
      'ttwttttttttttttt',
      'ttwtttttttsttttt',
      'ttwttttttttttttt',
      'wwwwwwwwwwwwwwww',
      'ttttttttttwttttt',
      'ttttttttttwttstt',
      'ttttttttttwttttt',
      'wwwwwwwwwwwwwwww',
    ],
  ],
};

/** Log walls. Frame 1 has a window, used along the back wall. */
export const WALL: PixelSprite = {
  legend: { w: 'wood', b: 'brown', o: 'darkBrown', k: 'sky', c: 'white', g: 'lime' },
  frames: [
    [
      'wwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbb',
      'oooooooooooooooo',
      'wwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbb',
      'bbbbbobbbbbbbbbb',
      'oooooooooooooooo',
      'wwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbobbbb',
      'oooooooooooooooo',
      'wwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbb',
      'oooooooooooooooo',
    ],
    [
      'wwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbb',
      'bboooooooooooobb',
      'bbockkkoockkkobb',
      'bbokkkkookkkkobb',
      'bbokkkkookkkkobb',
      'bboooooooooooobb',
      'bbokkkkookkkkobb',
      'bbogkgkookgkgobb',
      'bboggggooggggobb',
      'bboooooooooooobb',
      'bwwwwwwwwwwwwwwb',
      'wwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbb',
      'oooooooooooooooo',
    ],
  ],
};

/** The doorway, with a leafy welcome mat. */
export const DOOR: PixelSprite = {
  legend: { b: 'brown', o: 'darkBrown', t: 'tan', w: 'wood', f: 'forest', g: 'green', l: 'lime' },
  frames: [
    [
      'bottttttttttttob',
      'boffffffffffffob',
      'bofggggggggggfob',
      'bofgggggllgggfob',
      'bofgggglllgggfob',
      'bofggglllggggfob',
      'bofgggglgggggfob',
      'bofggggggggggfob',
      'boffffffffffffob',
      'bottttttttttttob',
      'bottttttttttttob',
      'bowwwwwwwwwwwwob',
      'bottttttttttttob',
      'bottttttttttttob',
      'bottttttttttttob',
      'bowwwwwwwwwwwwob',
    ],
  ],
};

/** The serving counter: a cream top over panelled wood, facing the customers. */
export const COUNTER: PixelSprite = {
  legend: { o: 'darkBrown', c: 'cream', s: 'sand', w: 'wood', b: 'brown' },
  frames: [
    [
      'oooooooooooooooo',
      'cccccccccccccccc',
      'ccccccccsccccccc',
      'cccccccccccccccc',
      'ccscccccccccccsc',
      'cccccccccccccccc',
      'ssssssssssssssss',
      'oooooooooooooooo',
      'wwwwwwwwwwwwwwww',
      'wbbbbbbwwbbbbbbw',
      'wbwwwwbwwbwwwwbw',
      'wbwwwwbwwbwwwwbw',
      'wbbbbbbwwbbbbbbw',
      'wwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwww',
      'oooooooooooooooo',
    ],
  ],
};

/** A round wooden table on short legs. */
export const TABLE: PixelSprite = {
  legend: { o: 'darkBrown', w: 'wood', s: 'sand', b: 'brown' },
  frames: [
    [
      '................',
      '....oooooooo....',
      '..oowwwwwwwwoo..',
      '.owwsswwwwwwwwo.',
      '.owsswwwwwwwwwo.',
      'owwswwwwwwwwwwwo',
      'owwwwwwwwwwwwwwo',
      'owwwwwwwwwwwwwwo',
      'owwwwwwwwwwwwwwo',
      '.owwwwwwwwwwwwo.',
      '.obwwwwwwwwwwbo.',
      '..oobbbbbbbboo..',
      '....oooooooo....',
      '.....ob..bo.....',
      '.....ob..bo.....',
      '......o..o......',
    ],
  ],
};

/** A seat: a round stool with a cushion, so it looks right on any side of a table. */
export const CHAIR: PixelSprite = {
  legend: { o: 'darkBrown', r: 'rust', h: 'clay', k: 'wine', w: 'wood', b: 'brown' },
  frames: [
    [
      '................',
      '................',
      '................',
      '.....oooooo.....',
      '....orrrrrro....',
      '...orhhrrrrro...',
      '...orhrrrrrro...',
      '...orrrrrrrro...',
      '...okrrrrrrko...',
      '....okkkkkko....',
      '....owwwwwwo....',
      '.....oooooo.....',
      '.....ob..bo.....',
      '.....ob..bo.....',
      '......o..o......',
      '................',
    ],
  ],
};

/** A little rug on the order spot, where customers stand to order. */
export const ORDER_RUG: PixelSprite = {
  legend: { o: 'darkBrown', r: 'rust', y: 'gold', c: 'cream' },
  frames: [
    [
      '................',
      '................',
      '................',
      '..oooooooooooo..',
      '..orrrrrrrrrro..',
      '..oryyyyyyyyro..',
      '..oryyyccyyyro..',
      '..orycyyyycyro..',
      '..orycyyyycyro..',
      '..oryyyccyyyro..',
      '..oryyyyyyyyro..',
      '..orrrrrrrrrro..',
      '..oooooooooooo..',
      '................',
      '................',
      '................',
    ],
  ],
};

/** A paw print on the floor where the queue forms. 5x4. */
export const PAW_PRINT: PixelSprite = {
  legend: { o: 'wood' },
  frames: [['o.o.o', '.....', '.ooo.', '.ooo.']],
};

/** Crumbs and a spill left on a table. 8x8. */
export const MESS: PixelSprite = {
  legend: { o: 'darkBrown', b: 'brown', s: 'sand' },
  frames: [
    [
      '...oo...',
      '..obbo.s',
      '.obbbbo.',
      '.obbsbbo',
      'obbbbbo.',
      '.obbbo.s',
      '..ooo...',
      's....s..',
    ],
  ],
};

/** A customer's plate of food while they eat. 8x8. */
export const PLATE: PixelSprite = {
  legend: { o: 'darkBrown', w: 'white', g: 'silver', f: 'sand' },
  frames: [
    [
      '..oooo..',
      '.owwwwo.',
      'owwffwwo',
      'owffffwo',
      'owffffwo',
      'owwffwwo',
      '.oggggo.',
      '..oooo..',
    ],
  ],
};

/** Decorate menu icon: Move, four arrows. 13x13 (shown at 2x). */
export const MOVE_ICON: PixelSprite = {
  legend: { o: 'darkBrown', w: 'cream' },
  frames: [
    [
      '......o......',
      '.....owo.....',
      '....owwwo....',
      '...ooowooo...',
      '..o..owo..o..',
      '.ow..owo..wo.',
      'owwwwwwwwwwwo',
      '.ow..owo..wo.',
      '..o..owo..o..',
      '...ooowooo...',
      '....owwwo....',
      '.....owo.....',
      '......o......',
    ],
  ],
};

/** Decorate menu icon: Put away, a storage crate. 13x13 (shown at 2x). */
export const STORE_ICON: PixelSprite = {
  legend: { o: 'darkBrown', t: 'sand', b: 'wood' },
  frames: [
    [
      '.............',
      '..ooooooooo..',
      '.ottttttttto.',
      '.ooooooooooo.',
      '..obbbbbbbo..',
      '..obbbbbbbo..',
      '..obooooobo..',
      '..obbbbbbbo..',
      '..obbbbbbbo..',
      '..obbbbbbbo..',
      '..ooooooooo..',
      '.............',
      '.............',
    ],
  ],
};

/** A puff of dust when a table is wiped clean, 10x8: a cloud, then it breaking up. */
export const PUFF: PixelSprite = {
  legend: { c: 'cream', s: 'sand' },
  frames: [
    ['...cc.....', '.cccccc.c.', 'ccccsccccc', '.ccsscccc.', '..cccccc..', '....cc....', '..........', '..........'],
    ['..........', 'c...c...c.', '..........', '.c...c..c.', '....c.....', '..c.....c.', '..........', '..........'],
  ],
};
