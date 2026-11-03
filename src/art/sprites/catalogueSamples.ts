import { FROG, BADGER, RACCOON } from './sheetCritters2';
import { CUSTOMER_SANTA_ART } from './customerClothing';
import type { PixelSprite } from '../pixelSprite';
import { DEER, HEDGEHOG, MOUSE, RABBIT } from './sheetCritters';
import { SANTA_COAT, SANTA_HAT } from './wardrobe';
import { DEER_SANTA_COAT, DEER_SANTA_HAT, MOUSE_SANTA_COAT, MOUSE_SANTA_HAT, RABBIT_SANTA_COAT, RABBIT_SANTA_HAT } from './wardrobeCritters';
import { COLLECTION_ART, type CollectionArtName } from './christmasClothing';
import { CLOTHING_IDS, type ClothingId } from '../../data/clothing';
import { clothingArt } from '../../data/clothingFits';
import { PLAYER_ANIMALS, type PlayerAnimal } from '../../data/playerAnimals';

const BODIES = { hedgehog: HEDGEHOG, rabbit: RABBIT, mouse: MOUSE, deer: DEER, frog: FROG, badger: BADGER, raccoon: RACCOON };
const HATS = { hedgehog: SANTA_HAT, rabbit: RABBIT_SANTA_HAT, mouse: MOUSE_SANTA_HAT, deer: DEER_SANTA_HAT, frog: CUSTOMER_SANTA_ART.frogSantaHat, badger: CUSTOMER_SANTA_ART.badgerSantaHat, raccoon: CUSTOMER_SANTA_ART.raccoonSantaHat };
const COATS = { hedgehog: SANTA_COAT, rabbit: RABBIT_SANTA_COAT, mouse: MOUSE_SANTA_COAT, deer: DEER_SANTA_COAT, frog: CUSTOMER_SANTA_ART.frogSantaCoat, badger: CUSTOMER_SANTA_ART.badgerSantaCoat, raccoon: CUSTOMER_SANTA_ART.raccoonSantaCoat };
export type CatalogueSampleName = `${PlayerAnimal}Catalogue${Capitalize<ClothingId>}`;

export function catalogueSampleName(animal: PlayerAnimal, item: ClothingId): CatalogueSampleName {
  return `${animal}Catalogue${item[0].toUpperCase()}${item.slice(1)}` as CatalogueSampleName;
}

function sample(animal: PlayerAnimal, item: ClothingId): PixelSprite {
  const body = BODIES[animal];
  const clothing = item === 'santaHat' ? HATS[animal] : item === 'santaCoat' ? COATS[animal]
    : COLLECTION_ART[clothingArt(animal, item) as CollectionArtName];
  // Use the exact gameplay body and fitting, with no mannequin or rescaling.
  // Only the advertised garment is added so other outfit slots cannot hide it.
  const frame = body.frames[0].map((row, y) => [...row].map((c, x) => {
    const garment = clothing.frames[0][y][x];
    return garment === '.' ? c : garment;
  }).join(''));
  return { legend: { ...clothing.legend, ...body.legend }, frames: [frame] };
}

export const CATALOGUE_SAMPLES = Object.fromEntries(PLAYER_ANIMALS.flatMap(animal =>
  CLOTHING_IDS.map(item => [catalogueSampleName(animal, item), sample(animal, item)]),
)) as Record<CatalogueSampleName, PixelSprite>;
