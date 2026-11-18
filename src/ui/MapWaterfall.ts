import Phaser from 'phaser';
import { MAP_WATERFALL, MAP_WATERFALL_ANIMATION, MAP_WATERFALL_KEY } from '../assets/worldMap';
import { arrangeable } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';

/** Only water and foam are in this atlas; the original map continues to draw every rock. */
export function addMapWaterfall(scene: Phaser.Scene): void {
  scene.textures.get(MAP_WATERFALL_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  if (!scene.anims.exists(MAP_WATERFALL_ANIMATION)) {
    scene.anims.create({
      key: MAP_WATERFALL_ANIMATION,
      frames: Array.from({ length: MAP_WATERFALL.count }, (_, frame) => ({ key: MAP_WATERFALL_KEY, frame })),
      frameRate: 1000 / MAP_WATERFALL.frameMs,
      repeat: -1,
    });
  }
  const { x, y } = MAP_WATERFALL.display;
  const point = layoutPoint('worldMap', 'water.waterfall', { x, y });
  // Atlas frames already have the existing map footprint: no runtime resizing or smoothing.
  const waterfall = scene.add.sprite(point.x, point.y, MAP_WATERFALL_KEY, 0).play(MAP_WATERFALL_ANIMATION);
  arrangeable(scene, 'worldMap', 'water.waterfall', point, waterfall);
}
