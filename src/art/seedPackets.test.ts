import { expect, it } from 'vitest';
import { spriteSize } from './pixelSprite';
import { SEED_PACKET_ART } from './sprites/seedPackets';

it('keeps adapted crop illustrations on the full supplied packet canvas', () => {
  const original = SEED_PACKET_ART.seedPacketSprout;
  for (const packet of [SEED_PACKET_ART.seedPacketMushroom, SEED_PACKET_ART.seedPacketChilli]) {
    expect(spriteSize(packet)).toEqual(spriteSize(original));
    // The crop cleanup must preserve the folded top and bottom of the paper bag.
    expect(packet.frames[0].slice(0, 10)).toEqual(original.frames[0].slice(0, 10));
    expect(packet.frames[0].slice(-3)).toEqual(original.frames[0].slice(-3));
  }
});
