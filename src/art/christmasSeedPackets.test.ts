import { expect, it } from 'vitest';
import { CHRISTMAS_SEED_PACKET_ART } from './sprites/christmasSeedPackets';
import { holes, strayPixels } from './checks';
import { spriteSize } from './pixelSprite';
import { CROP_IDS } from '../data/crops';
import { SPRITE_ART, type ArtName } from './spriteArt';
import { seedPacketArtName } from '../logic/seedShop';

it('uses distinct Christmas wrapping at native pouch and shop sizes', () => {
  for (const crop of CROP_IDS) for (const small of [false,true]) {
    const name = seedPacketArtName(crop, 'christmas', small) as keyof typeof CHRISTMAS_SEED_PACKET_ART;
    const sprite = CHRISTMAS_SEED_PACKET_ART[name];
    expect(spriteSize(sprite)).toEqual(small ? { width:24, height:29 } : { width:48, height:54 });
    expect(holes(sprite.frames[0])).toBe(0);
    expect(strayPixels(sprite.frames[0])).toBe(0);
    expect(SPRITE_ART[name]).not.toEqual(SPRITE_ART[seedPacketArtName(crop, 'normal', small) as ArtName]);
  }
});

it('keeps every wrapping pixel identical between crop variants outside the printed crop', () => {
  for (const small of [false,true]) {
    const reference = CHRISTMAS_SEED_PACKET_ART[seedPacketArtName('mushroom', 'christmas', small) as keyof typeof CHRISTMAS_SEED_PACKET_ART].frames[0];
    const ox=small?8:15,oy=small?12:22,size=small?8:16;
    for (const crop of ['tomato','chilli'] as const) {
      const frame = CHRISTMAS_SEED_PACKET_ART[seedPacketArtName(crop, 'christmas', small) as keyof typeof CHRISTMAS_SEED_PACKET_ART].frames[0];
      frame.forEach((row,y)=>[...row].forEach((char,x)=>{
        if(x<ox||x>=ox+size||y<oy||y>=oy+size)expect(char, `${crop} wrapping changed at ${x},${y}`).toBe(reference[y][x]);
      }));
    }
  }
});
