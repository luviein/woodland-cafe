import breadBottom from './breadBottomLayer.png';
import mushroom from './mushroomLayer.png';
import jam from './jamLayer.png';
import config from './layers.json';
import type { ArtName } from '../../art/spriteArt';

/** Approved complete strips; Boot registers their two end caps and repeatable centre. */
export const PREP_LAYER_IMAGES = {
  breadBottomLayer: breadBottom,
  mushroomLayer: mushroom,
  jamLayer: jam,
} satisfies Partial<Record<ArtName, string>>;
export const PREP_LAYER_LAYOUT = { width: config.width, height: config.height, endWidth: config.endWidth };

export type PrepLayerName = keyof typeof PREP_LAYER_IMAGES;

export function prepLayerLayout(name: PrepLayerName) {
  const source = config.sources[name];
  return {
    width: config.width,
    height: 'height' in source ? source.height : config.height,
    bodyHeight: config.height,
    leftWidth: 'leftWidth' in source ? source.leftWidth : config.endWidth,
    rightWidth: 'rightWidth' in source ? source.rightWidth : config.endWidth,
  };
}
