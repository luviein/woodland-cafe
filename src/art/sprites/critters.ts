import type { PixelSprite } from '../pixelSprite';
import type { PaletteName } from '../palette';

// The code-drawn cast (GAME_DESIGN.md §8.2; the hedgehog, rabbit, mouse and
// deer are the player's own art, in sheetCritters.ts): 16x24 critters, big round heads, dot eyes,
// rosy cheeks. They're built from shared pieces so they all look like one
// family and a change to, say, the eyes is made once:
//
//   rows 0-3    ears (each animal's own)
//   rows 4-12   HEAD (or the animal's own, e.g. the hedgehog's spines)
//   rows 13-20  BODY (or the animal's own, e.g. the apron)
//   rows 21-23  legs: standing, then two walking steps = frames 0, 1, 2
//
// Shared letters: o outline, f fur, l light fur (muzzle, belly), w eye
// shine, n nose, p cheeks. Critters face right; walking left mirrors them.

const HEAD = [
  '...oooooooooo...',
  '..offffffffffo..',
  '.offffffffffffo.',
  '.offffffffffffo.',
  '.offfowfffowffo.',
  '.offfoofffooffo.',
  '.opffllnnllffpo.',
  '..offllllllffo..',
  '...offffffffo...',
];

/** The muzzle and chin, shared by every head (rows 10-12). */
const CHIN = HEAD.slice(6);

const BODY = [
  '....offffffo....',
  '...offllllffo...',
  '..offllllllffo..',
  '.offfllllllfffo.',
  '.offfllllllfffo.',
  '..offllllllffo..',
  '...offffffffo...',
  '....oooooooo....',
];

const LEGS = [
  // Standing
  ['....ofo..ofo....', '....ofo..ofo....', '....ooo..ooo....'],
  // Left foot down, right foot lifted
  ['....ofo..ofo....', '....ofo..ooo....', '....ooo.........'],
  // Right foot down, left foot lifted
  ['....ofo..ofo....', '....ooo..ofo....', '.........ooo....'],
];

/** A critter with all three frames, from its top 21 rows (ears, head, body). */
function critter(legend: Record<string, PaletteName>, top: readonly string[]): PixelSprite {
  return { legend, frames: LEGS.map((legs) => [...top, ...legs]) };
}

const FACE = { o: 'darkBrown', w: 'white', n: 'darkBrown', p: 'pink' } as const;

/** The Cleaner: a raccoon with a blue bandana (knot on the right) and a mask. */
export const RACCOON = critter({ ...FACE, f: 'grey', l: 'white', m: 'darkSlate', b: 'blue' }, [
  '................',
  '..ooo......ooo..',
  '.ofmfo....ofmfo.',
  '.offfoooooofffo.',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbbb',
  '.offffffffffffob',
  '.offffffffffffo.',
  '.ommmowmmmowmmo.',
  '.ofmmoommmoomfo.',
  ...CHIN,
  ...BODY,
]);

/** The Mascot: a frog in a leaf costume, the leaf's tip and vein on top. */
export const FROG = critter({ ...FACE, f: 'lime', l: 'cream', g: 'green', d: 'forest' }, [
  '........o.......',
  '.......ogo......',
  '......oggdo.....',
  '....oogggdggoo..',
  '..oggggggggggo..',
  '.oggggggggggggo.',
  '.oggffffffffggo.',
  '.ogffffffffffgo.',
  '.ogffowfffowfgo.',
  '.ogffoofffoofgo.',
  '.opffffffffffpo.',
  '..offoffffoffo..',
  '...offooooffo...',
  ...BODY,
]);

// Customers (picked per customer on the floor).

export const FOX = critter({ ...FACE, f: 'orange', l: 'white' }, [
  '..o..........o..',
  '..oo........oo..',
  '..ofo......ofo..',
  '..offo....offo..',
  ...HEAD,
  ...BODY,
]);

/** A red squirrel, with its bushy tail curling up on the right. */
export const SQUIRREL = critter({ ...FACE, f: 'clay', l: 'cream' }, [
  '................',
  '................',
  '..ooo......ooo..',
  '..ofo......ofo..',
  ...HEAD,
  '....offffffo.ooo',
  '...offllllffoffo',
  '..offllllllffffo',
  '.offfllllllffffo',
  '.offfllllllffffo',
  '..offllllllfffo.',
  '...offffffffo...',
  '....oooooooo....',
]);

/** Grandma Badger, who hands over the cafe (GAME_DESIGN.md §5.9): striped face, plum shawl. */
export const BADGER = critter({ ...FACE, f: 'grey', l: 'white', k: 'darkSlate', a: 'plum' }, [
  '................',
  '................',
  '..ooo......ooo..',
  '..ofo......ofo..',
  '...oooooooooo...',
  '..okkllllllkko..',
  '.okkkllllllkkko.',
  '.ofkkllllllkkfo.',
  '.ofkkowllowkkfo.',
  '.ofkkoollookkfo.',
  '.opffllnnllffpo.',
  '..offllllllffo..',
  '...offffffffo...',
  '....oaaaaaao....',
  '...oaaaaaaaao...',
  '..oaaaallaaaao..',
  '.ofaaallllaaafo.',
  '.offfllllllfffo.',
  '..offllllllffo..',
  '...offffffffo...',
  '....oooooooo....',
]);
