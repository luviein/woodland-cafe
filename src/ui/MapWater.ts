import Phaser from 'phaser';
import { MAP_IMAGE_KEY } from '../assets/worldMap';
import { MAP_RIPPLES } from '../data/mapPresentation';
import { arrangeable } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';

const RIPPLE_KEY = 'worldMap:seaRipple';
/** A cyan ripple already present in the approved source, away from land and UI. */
const SOURCE = { x: 312, y: 69, width: 75, height: 27 };

/** Cache only the existing cyan pixels; the surrounding blue sea must not move as a rectangle. */
function prepareRipple(scene: Phaser.Scene): boolean {
  if (scene.textures.exists(RIPPLE_KEY)) return true;
  const texture = scene.textures.createCanvas(RIPPLE_KEY, SOURCE.width, SOURCE.height);
  if (!texture) return false;
  const context = texture.getContext();
  const image = scene.textures.get(MAP_IMAGE_KEY).getSourceImage() as CanvasImageSource;
  context.drawImage(image, SOURCE.x, SOURCE.y, SOURCE.width, SOURCE.height, 0, 0, SOURCE.width, SOURCE.height);
  const pixels = context.getImageData(0, 0, SOURCE.width, SOURCE.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const [red, green, blue] = pixels.data.subarray(i, i + 3);
    // Keep approved ripple colours intact; make only the surrounding sea transparent.
    if (green < 150 || blue < 175 || green - red < 35) pixels.data[i + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return true;
}

/** A few fading highlights suggest movement without warping the illustrated island. */
export function addMapWater(scene: Phaser.Scene): void {
  if (!prepareRipple(scene)) return;
  MAP_RIPPLES.forEach((fallback, index) => {
    const name = `water.ripple.${index}`;
    const point = layoutPoint('worldMap', name, fallback);
    const ripple = scene.add.image(0, 0, RIPPLE_KEY, '__BASE').setDisplaySize(29, 10).setAlpha(0);
    // Animate inside an anchor so Arrange mode can move the whole effect without fighting the tween.
    const anchor = scene.add.container(point.x, point.y, [ripple]);
    arrangeable(scene, 'worldMap', name, point, anchor);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 3200 + index % 3 * 650,
      delay: index * 370, repeat: -1,
      onUpdate: tween => {
        const progress = tween.getValue() ?? 0;
        ripple.setPosition(Math.round((progress - 0.5) * 6), Math.round(Math.sin(progress * Math.PI)));
        ripple.setAlpha(0.35 * Math.sin(progress * Math.PI) ** 2);
      },
    });
  });
}
