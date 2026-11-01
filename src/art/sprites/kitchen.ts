import type { IngredientId } from '../../data/ingredients';
import type { PaletteName } from '../palette';
import type { PixelSprite } from '../pixelSprite';

// The prep station: ingredient icons for the bins, the layers a dish is
// stacked from, and the Toaster. Typed by IngredientId, so adding an
// ingredient without its art is a compile error.

const ICON_LEGEND = { o: 'darkBrown', w: 'white' } as const;

/** 16x16 pictures on the ingredient bins (shown at 2x). */
export const INGREDIENT_ICONS: Record<IngredientId, PixelSprite> = {
  bread: {
    legend: { ...ICON_LEGEND, k: 'clay', c: 'cream', s: 'sand' },
    frames: [
      [
        '................',
        '...oooooooooo...',
        '..okkkkkkkkkko..',
        '.okkcccccccckko.',
        '.okccscccccccko.',
        '.okccccccccscko.',
        '..okccccccccko..',
        '..okccscccccko..',
        '..okccccccccko..',
        '..okccccccscko..',
        '..okccccccccko..',
        '..okkkkkkkkkko..',
        '...oooooooooo...',
        '................',
        '................',
        '................',
      ],
    ],
  },
  mushroom: {
    legend: { ...ICON_LEGEND, r: 'rust', c: 'cream', s: 'sand' },
    frames: [
      [
        '................',
        '................',
        '.....oooooo.....',
        '...oorrrrrroo...',
        '..orrcrrrrcrro..',
        '.orrcccrrrrrrro.',
        '.orrrcrrrrcccro.',
        '.orrrrrrrrrcrro.',
        '.oooooooooooooo.',
        '.....occcco.....',
        '.....occcco.....',
        '.....occsco.....',
        '.....occcco.....',
        '....oooooooo....',
        '................',
        '................',
      ],
    ],
  },
  jam: {
    legend: { ...ICON_LEGEND, j: 'red', k: 'wine', c: 'cream', l: 'wood' },
    frames: [
      [
        '................',
        '....oooooooo....',
        '....ollllllo....',
        '....oooooooo....',
        '...owjjjjjjjo...',
        '..owjjjjjjjjjo..',
        '..owjjjjjjjjjo..',
        '..ojjcccccccjo..',
        '..ojjcccccccjo..',
        '..ojjjjjjjjjjo..',
        '..ojjjjjjjjjjo..',
        '..okjjjjjjjjko..',
        '...okkkkkkkko...',
        '....oooooooo....',
        '................',
        '................',
      ],
    ],
  },
  chilli: {
    legend: { ...ICON_LEGEND, r: 'red', h: 'pink', g: 'green' },
    frames: [
      [
        '................',
        '.........oo.....',
        '........ogo.....',
        '........ogo.....',
        '.......orrro....',
        '......orhrrro...',
        '.....orhrrrro...',
        '....orhrrrro....',
        '...orrrrrro.....',
        '..orrrrrro......',
        '.orrrrrro.......',
        '.orrrro.........',
        '..ooo...........',
        '................',
        '................',
        '................',
      ],
    ],
  },
  tuna: {
    legend: { ...ICON_LEGEND, b: 'slate', l: 'silver', k: 'darkSlate' },
    frames: [
      [
        '................',
        '................',
        '................',
        '................',
        '....oooooo...oo.',
        '..oobbbbbboo.oko',
        '.obwobbbbbbboko.',
        '.obbbbbbbbbbkko.',
        '.olllllllllloko.',
        '..oolllllloo.oko',
        '....oooooo...oo.',
        '................',
        '................',
        '................',
        '................',
        '................',
      ],
    ],
  },
  tomato: {
    legend: { ...ICON_LEGEND, r: 'red', h: 'pink', k: 'wine', g: 'green' },
    frames: [
      [
        '................',
        '......o.o.......',
        '.....ogggo......',
        '...oooggooo.....',
        '..orrrgrrrro....',
        '.orhhrrrrrrro...',
        '.orhrrrrrrrrro..',
        '.orrrrrrrrrrro..',
        '.orrrrrrrrrrro..',
        '.orrrrrrrrrrko..',
        '..orrrrrrrrko...',
        '...okkkkkkko....',
        '....ooooooo.....',
        '................',
        '................',
        '................',
      ],
    ],
  },
};

/**
 * Every dish layer has the same shape, seen from the side, in three 4x6
 * frames: left end, a middle that repeats to any width, right end. Only the
 * colours differ: a top, b body, h a speck in the body, d bottom.
 */
const LAYER_FRAMES = [
  ['.ooo', 'oaaa', 'obbb', 'obbb', 'oddd', '.ooo'],
  ['oooo', 'aaaa', 'bbbb', 'bhbb', 'dddd', 'oooo'],
  ['ooo.', 'aaao', 'bbbo', 'bbbo', 'dddo', 'ooo.'],
];

/** Frame numbers of a layer sprite. */
export const LAYER_LEFT = 0;
export const LAYER_MIDDLE = 1;
export const LAYER_RIGHT = 2;

function layer(a: PaletteName, b: PaletteName, h: PaletteName, d: PaletteName): PixelSprite {
  return { legend: { o: 'darkBrown', a, b, h, d }, frames: LAYER_FRAMES };
}

export const INGREDIENT_LAYERS: Record<IngredientId, PixelSprite> = {
  bread: layer('clay', 'cream', 'sand', 'clay'),
  // Tan and brown, so a mushroom slice never reads as bread (cream with a crust).
  mushroom: layer('wood', 'tan', 'cream', 'brown'),
  jam: layer('wine', 'red', 'pink', 'wine'),
  chilli: layer('orange', 'red', 'yellow', 'rust'),
  tuna: layer('silver', 'grey', 'white', 'slate'),
  tomato: layer('red', 'pink', 'yellow', 'red'),
};

/** Toasted bread: the same slice, browner. (Toasting only changes how bread looks.) */
export const TOASTED_BREAD_LAYER = layer('brown', 'sand', 'clay', 'brown');

/** The Toaster, 28x18 (shown at 2x): two slots on top and a knob on the front. */
export const TOASTER: PixelSprite = {
  legend: { o: 'darkBrown', s: 'silver', w: 'white', g: 'grey', k: 'black', r: 'red' },
  frames: [
    [
      '..oooooooooooooooooooooooo..',
      '.owssssssssssssssssssssssso.',
      '.owskkkkkkkkksskkkkkkkkksso.',
      '.owskkkkkkkkksskkkkkkkkksso.',
      '.owssssssssssssssssssssssso.',
      '.owsssssssssssssssssssssggo.',
      '.owsssssssssssssssssssssggo.',
      '.owsssssssssssssssssorosggo.',
      '.owsssssssssssssssssooosggo.',
      '.owsssssssssssssssssssssggo.',
      '.owsssssssssssssssssssssggo.',
      '.owsssssssssssssssssssssggo.',
      '.owsssssssssssssssssssssggo.',
      '.owsssssssssssssssssssssggo.',
      '.oggggggggggggggggggggggggo.',
      '.oggggggggggggggggggggggggo.',
      '..oooooooooooooooooooooooo..',
      '...oo..................oo...',
    ],
  ],
};
