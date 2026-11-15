import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT, TILE_SIZE } from '../config/display';
import { SPRITE_ART } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import { clothingArt } from '../data/clothingFits';
import { getGameState } from '../scenes/gameStore';
import { layoutPoint } from '../layout/positions';
import { addJournalImage } from './journalImage';
import { Button } from './Button';

/** Separate from clothing: the title never turns, bobs or intercepts clicks. */
export function attachPlayerWorldTitle(scene: Phaser.Scene, player: Phaser.GameObjects.Container, canShow: () => boolean = () => true): void {
  const ribbon = addJournalImage(scene, 0, 0, 'masterCollectorWorldRibbon').setDepth(900).setVisible(false).setName('playerWorldTitle');
  const offset = layoutPoint('outdoor', 'playerTitleOffset', { x: 0, y: -6 });
  const update = () => {
    if (!player.scene) return;
    const state = getGameState(scene);
    ribbon.setVisible(player.visible && canShow() && state.journal.equippedTitle === 'masterCollector');
    if (!ribbon.visible) return;
    let height = spriteSize(SPRITE_ART[state.animal]).height;
    if (state.outfit.hat) height = Math.max(height, spriteSize(SPRITE_ART[clothingArt(state.animal, state.outfit.hat)]).height);
    const world = player.getWorldTransformMatrix();
    const half = ribbon.height / 2;
    const x = Math.round(Phaser.Math.Clamp(world.tx + TILE_SIZE / 2 + offset.x, ribbon.width / 2 + 4, BASE_WIDTH - ribbon.width / 2 - 4));
    const controls = scene.children.list.filter((object): object is Button => object instanceof Button && object.visible);
    const blocked = (y: number) => controls.some(button => Phaser.Geom.Intersects.RectangleToRectangle(
      new Phaser.Geom.Rectangle(x - ribbon.width / 2 - 3, y - half - 3, ribbon.width + 6, ribbon.height + 6), button.getBounds()));
    let y = world.ty + TILE_SIZE - height + offset.y - half;
    // Garden's return button is below the header: test actual controls too.
    if (y - half < 46 || blocked(y)) y = world.ty + TILE_SIZE + 6 + half;
    if (y + half > BASE_HEIGHT - 8 || blocked(y)) { ribbon.setVisible(false); return; }
    ribbon.setPosition(x, Math.round(y));
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update);
  const cleanup = () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update); ribbon.destroy(); };
  player.once(Phaser.GameObjects.Events.DESTROY, cleanup);
  update();
}
