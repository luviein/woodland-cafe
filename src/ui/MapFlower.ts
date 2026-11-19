import Phaser from 'phaser';
import { MAP_FLOWER, MAP_FLOWER_KEY } from '../assets/worldMap';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import type { Point } from '../logic/layout';

/** The approved repair is already at game size; keep stalks sharp instead of filtering the map again. */
export function addMapFlower(scene: Phaser.Scene, background: Point): Phaser.GameObjects.Image {
  scene.textures.get(MAP_FLOWER_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  const { x, y } = MAP_FLOWER.display;
  // The scene registers this with the map illustration, so Arrange moves both together.
  return scene.add.image(background.x - BASE_WIDTH / 2 + x, background.y - BASE_HEIGHT / 2 + y, MAP_FLOWER_KEY).setOrigin(0);
}
