import type { PixelSprite } from '../pixelSprite';

// The cafe room and its furniture, all 24x24 tiles seen slightly from the
// front (tops and front edges), like the characters. Tiles that sit side by
// side (floor, wall, counter) have no outline on their left and right edges,
// so a row of them reads as one piece instead of a grid of boxes.

/** Wooden floor planks, 24x24. Two frames = two plank patterns, mixed so the floor doesn't look tiled. */
export const FLOOR: PixelSprite = {
  legend: { t: 'tan', w: 'wood', s: 'sand' },
  frames: [
    [
      'ttttttttttttttttwttttttt',
      'tttsttttttttttttwttttttt',
      'ttttttttttttttttwttttttt',
      'ttttttttttttttttwttttttt',
      'ttttttttttttttttwttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'tttttwtttttttttttttttttt',
      'tttttwtttttttttttttttttt',
      'tttttwttttttttttttttsttt',
      'tttttwtttttttttttttttttt',
      'tttttwtttttttttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'ttttttttttttwttttttttttt',
      'ttttttttttttwttttttttttt',
      'ttttttttstttwttttttttttt',
      'ttttttttttttwttttttttttt',
      'ttttttttttttwttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'ttwttttttttttttttttttttt',
      'ttwttttttttttttttttttttt',
      'ttwtttttttttttsttttttttt',
      'ttwttttttttttttttttttttt',
      'ttwttttttttttttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
    ],
    [
      'tttttttttwtttttttttttttt',
      'tttttttttwtttttttttttttt',
      'tttttttttwtttstttttttttt',
      'tttttttttwtttttttttttttt',
      'tttttttttwtttttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'tttttttttttttttttttwtttt',
      'tttttttttttttttttttwtttt',
      'tttttttttttttttttttwtttt',
      'tttttstttttttttttttwtttt',
      'tttttttttttttttttttwtttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'tttwtttttttttttttttttttt',
      'tttwtttttttttttttttttttt',
      'tttwtttttttttttttttttttt',
      'tttwtttttttttttttttttstt',
      'tttwtttttttttttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'ttttttttttttttwttttttttt',
      'ttttttttttttttwttttttttt',
      'ttttttttttttttwttttttttt',
      'ttttttttttstttwttttttttt',
      'ttttttttttttttwttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww',
    ],
  ],
};

/** Log walls, 24x24. Frame 1 has a window, used along the back wall. */
export const WALL: PixelSprite = {
  legend: { w: 'wood', b: 'brown', o: 'darkBrown', k: 'sky', c: 'white', g: 'lime' },
  frames: [
    [
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'oooooooooooooooooooooooo',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbobbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'oooooooooooooooooooooooo',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbobbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'oooooooooooooooooooooooo',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbobbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'oooooooooooooooooooooooo',
    ],
    [
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbboooooooooooooooobbbb',
      'bbbbocckkkkoocckkkkobbbb',
      'ooooockkkkkoockkkkkooooo',
      'wwwwokkkkkkookkkkkkowwww',
      'bbbbokkkkkkookkkkkkobbbb',
      'bbbbokkkkkkookkkkkkobbbb',
      'bbbboooooooooooooooobbbb',
      'bbbbokkkkkkookkkkkkobbbb',
      'oooookkkkkkookkkkkkooooo',
      'wwwwokgkkgkookkgkgkowwww',
      'bbbboggggggooggggggobbbb',
      'bbbboggggggooggggggobbbb',
      'bbbboooooooooooooooobbbb',
      'bbbwwwwwwwwwwwwwwwwwwbbb',
      'oooooooooooooooooooooooo',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bbbbobbbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'oooooooooooooooooooooooo',
    ],
  ],
};

/** The doorway, with a leafy welcome mat. 24x24. */
export const DOOR: PixelSprite = {
  legend: { b: 'brown', o: 'darkBrown', t: 'tan', w: 'wood', f: 'forest', g: 'green', l: 'lime' },
  frames: [
    [
      'bottttttttttttttttttttob',
      'bottttttttttttttttttttob',
      'botfffffffffffffffffftob',
      'botfggggggggggggggggftob',
      'botfggggggggggggggggftob',
      'botfggggggggllggggggftob',
      'botfggggggglllggggggftob',
      'botfgggggglllgggggggftob',
      'botfggggggllggggggggftob',
      'botfgggggglgggggggggftob',
      'botfggggglggggggggggftob',
      'botfggggggggggggggggftob',
      'botfggggggggggggggggftob',
      'botfggggggggggggggggftob',
      'botfffffffffffffffffftob',
      'bottttttttttttttttttttob',
      'bottttttttttttttttttttob',
      'bowwwwwwwwwwwwwwwwwwwwob',
      'bottttttttttttttttttttob',
      'bottttttttttttttttttttob',
      'bottttttttttttttttttttob',
      'bottttttttttttttttttttob',
      'bottttttttttttttttttttob',
      'bowwwwwwwwwwwwwwwwwwwwob',
    ],
  ],
};

/** The serving counter: a cream top over panelled wood, facing the customers. 24x24. */
export const COUNTER: PixelSprite = {
  legend: { o: 'darkBrown', c: 'cream', s: 'sand', w: 'wood', b: 'brown' },
  frames: [
    [
      'oooooooooooooooooooooooo',
      'cccccccccccccccccccccccc',
      'cccccccccccccccccccccscc',
      'cccccscccccccccccccccccc',
      'cccccccccccccccccccccccc',
      'cccccccccccccccccscccccc',
      'cccccccccccccccccccccccc',
      'ccccccccccsccccccccccccc',
      'cccccccccccccccccccccccc',
      'cccccccccccccccccccccccc',
      'ssssssssssssssssssssssss',
      'oooooooooooooooooooooooo',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'wbbbbbbbbbbwwbbbbbbbbbbw',
      'wbwwwwwwwwbwwbwwwwwwwwbw',
      'wbwwwwwwwwbwwbwwwwwwwwbw',
      'wbwwwwwwwwbwwbwwwwwwwwbw',
      'wbwwwwwwwwbwwbwwwwwwwwbw',
      'wbwwwwwwwwbwwbwwwwwwwwbw',
      'wbbbbbbbbbbwwbbbbbbbbbbw',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'oooooooooooooooooooooooo',
    ],
  ],
};

/** A round wooden table on short legs. 24x24. */
export const TABLE: PixelSprite = {
  legend: { o: 'darkBrown', w: 'wood', s: 'sand', b: 'brown' },
  frames: [
    [
      '........................',
      '........................',
      '........................',
      '......oooooooooooo......',
      '....oosssssswwwwwwoo....',
      '...owsssssssswwwwwwwo...',
      '..owsssssssssswwwwwwwo..',
      '.owwsssssssssswwwwwwwwo.',
      '.owwwsssssssswwwwwwwwwo.',
      '.owwwwsssssswwwwwwwwwwo.',
      '.owwwwwwwwwwwwwwwwwwwwo.',
      '.owwwwwwwwwwwwwwwwwwwwo.',
      '.owwwwwwwwwwwwwwwwwwwwo.',
      '.owwwwwwwwwwwwwwwwwwwwo.',
      '..obbbbbbbbbbbbbbbbbbo..',
      '...obbbbbbbbbbbbbbbbo...',
      '....oobbbbbbbbbbbboo....',
      '......oooooooooooo......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '........................',
    ],
  ],
};

/** A seat: a round stool with a cushion, so it looks right on any side of a table. 24x24. */
export const CHAIR: PixelSprite = {
  legend: { o: 'darkBrown', r: 'rust', h: 'clay', k: 'wine', w: 'wood', b: 'brown' },
  frames: [
    [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '.......oooooooooo.......',
      '......orhhhrrrrrro......',
      '.....orhhhhhrrrrrro.....',
      '....orrhhhhhrrrrrrro....',
      '....orrrhhhrrrrrrrro....',
      '....orrrrrrrrrrrrrro....',
      '....orrrrrrrrrrrrrro....',
      '....oorrrrrrrrrrrroo....',
      '....owokkkkkkkkkkowo....',
      '.....oooooooooooooo.....',
      '.......oooooooooo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '.......oo......oo.......',
      '........................',
    ],
  ],
};

/** A little rug on the order spot, where customers stand to order. 24x24. */
export const ORDER_RUG: PixelSprite = {
  legend: { o: 'darkBrown', r: 'rust', y: 'gold', c: 'cream' },
  frames: [
    [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '...oooooooooooooooooo...',
      '...orrrrrrrrrrrrrrrro...',
      '...oryyyyyyyyyyyyyyro...',
      '...oryyyyyyccyyyyyyro...',
      '...oryyyyyyyyyyyyyyro...',
      '...oryyyyyycyyyyyyyro...',
      '...oryycyycyyyyycyyro...',
      '...oryycyyyyycyycyyro...',
      '...oryyyyyyycyyyyyyro...',
      '...oryyyyyyyyyyyyyyro...',
      '...oryyyyyyccyyyyyyro...',
      '...oryyyyyyyyyyyyyyro...',
      '...orrrrrrrrrrrrrrrro...',
      '...oooooooooooooooooo...',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
  ],
};

/** A paw print on the floor where the queue forms. 5x4. */
export const PAW_PRINT: PixelSprite = {
  legend: { o: 'wood' },
  frames: [['o.o.o', '.....', '.ooo.', '.ooo.']],
};

/** Crumbs and a spill left on a table. 12x12. */
export const MESS: PixelSprite = {
  legend: { o: 'darkBrown', b: 'brown', s: 'sand' },
  frames: [
    [
      '............',
      '..........s.',
      '...ooooooo..',
      '..obbsbbbo..',
      '.obsbbbbbo..',
      '.obbbbbbbo..',
      '.obbbbbbo...',
      '.obbbbbbo...',
      '..obbbso....',
      '...oooo...s.',
      '.s..........',
      '............',
    ],
  ],
};

/** A customer's plate of food while they eat. 12x12. */
export const PLATE: PixelSprite = {
  legend: { o: 'darkBrown', w: 'white', g: 'silver', f: 'sand', l: 'clay' },
  frames: [
    [
      '............',
      '....oooo....',
      '..oowwwwoo..',
      '.owwoooowwo.',
      'owwollllowwo',
      'owoffffffowo',
      'owwoffffowwo',
      'owwwoooowwwo',
      'owwwwwwwwwwo',
      '.oggggggggo.',
      '..ooggggoo..',
      '....oooo....',
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

/** The volume button's speaker, 11x9: frame 0 with sound waves, frame 1 muted (a red cross). */
export const SPEAKER: PixelSprite = {
  legend: { o: 'darkBrown', c: 'cream', r: 'red' },
  frames: [
    ['....o......', '...oo....c.', 'oooco..c..c', 'occco...c.c', 'occco...c.c', 'occco...c.c', 'oooco..c..c', '...oo....c.', '....o......'],
    ['....o......', '...oo......', 'oooco.r...r', 'occco..r.r.', 'occco...r..', 'occco..r.r.', 'oooco.r...r', '...oo......', '....o......'],
  ],
};

/** The tutorial's bouncing arrow, 9x8, pointing down at what Grandma Badger means. */
export const POINTER_ARROW: PixelSprite = {
  legend: { o: 'darkBrown', y: 'gold' },
  frames: [['..ooooo..', '..oyyyo..', '..oyyyo..', 'oooyyyooo', '.oyyyyyo.', '..oyyyo..', '...oyo...', '....o....']],
};
