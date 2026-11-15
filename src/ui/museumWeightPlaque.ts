import type Phaser from 'phaser';
import { formatCropWeight } from '../logic/cropWeights';

// Native 3-by-5 glyphs stay sharp where a six-pixel browser font loses its strokes.
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '.': ['0', '0', '0', '0', '1'],
  k: ['100', '101', '110', '101', '101'],
  g: ['000', '000', '111', '101', '111', '001', '110'],
};

export function museumWeightPlaque(scene: Phaser.Scene, grams: number): Phaser.GameObjects.Graphics {
  const text = formatCropWeight(grams).replace(' ', '');
  const width = [...text].reduce((sum, char) => sum + GLYPHS[char][0].length + 1, -1);
  const plaque = scene.add.graphics().setName('weightPlaque');
  const left = -Math.floor((width + 4) / 2);
  // The lowercase g descends below the digits; retain a clear row beneath its tail.
  plaque.fillStyle(0x493026).fillRect(left, -9, width + 4, 11);
  plaque.fillStyle(0xffe9ae).fillRect(left + 1, -8, width + 2, 9);
  plaque.fillStyle(0x281a14);
  let x = left + 2;
  for (const char of text) {
    const glyph = GLYPHS[char];
    glyph.forEach((row, y) => [...row].forEach((pixel, column) => {
      if (pixel === '1') plaque.fillRect(x + column, -7 + y, 1, 1);
    }));
    x += glyph[0].length + 1;
  }
  return plaque;
}
