import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT, TILE_SIZE } from '../config/display';
import { SPRITE_ART } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import { clothingArt } from '../data/clothingFits';
import { getGameState } from '../scenes/gameStore';
import { layoutPoint } from '../layout/positions';
import { addJournalImage, setJournalImage } from './journalImage';
import { Button } from './Button';
import { WORLD_TITLE_RIBBONS, titleDisplayWidth } from './titleArt';

/** Separate from clothing: the title never turns, bobs or intercepts clicks. */
export function attachPlayerWorldTitle(scene: Phaser.Scene, player: Phaser.GameObjects.Container, canShow: () => boolean = () => true): void {
  const ribbon = addJournalImage(scene, 0, 0, 'masterCollectorWorldRibbon').setDepth(900).setVisible(false).setName('playerWorldTitle');
  const name = scene.add.text(0, 0, '', { fontFamily: 'Consolas, monospace', fontSize: '11px', resolution: 2, color: '#fff2d5', stroke: '#291d28', strokeThickness: 2 }).setOrigin(0, 0.5).setDepth(900).setName('playerWorldName');
  const offset = layoutPoint('outdoor', 'playerTitleOffset', { x: 0, y: -6 });
  const update = () => {
    if (!player.scene) return;
    const state = getGameState(scene);
    const title = state.journal.equippedTitle;
    const visible = player.visible && canShow() && (title !== null || state.playerName !== '');
    ribbon.setVisible(visible && title !== null);
    name.setText(state.playerName).setVisible(visible && state.playerName !== '');
    if (!visible) return;
    if (title) setJournalImage(ribbon, WORLD_TITLE_RIBBONS[title], titleDisplayWidth(title, 'world'));
    let height = spriteSize(SPRITE_ART[state.animal]).height;
    if (state.outfit.hat) height = Math.max(height, spriteSize(SPRITE_ART[clothingArt(state.animal, state.outfit.hat)]).height);
    const world = player.getWorldTransformMatrix();
    const badgeWidth = title ? ribbon.displayWidth : 0;
    const gap = title && state.playerName ? 4 : 0;
    const width = badgeWidth + gap + (state.playerName ? name.width : 0);
    const half = Math.max(title ? ribbon.displayHeight : 0, state.playerName ? name.height : 0) / 2;
    const x = Math.round(Phaser.Math.Clamp(world.tx + TILE_SIZE / 2 + offset.x, width / 2 + 4, BASE_WIDTH - width / 2 - 4));
    const controls = scene.children.list.filter((object): object is Button => object instanceof Button && object.visible);
    const blocked = (y: number) => controls.some(button => Phaser.Geom.Intersects.RectangleToRectangle(
      new Phaser.Geom.Rectangle(x - width / 2 - 3, y - half - 3, width + 6, half * 2 + 6), button.getBounds()));
    let y = world.ty + TILE_SIZE - height + offset.y - half;
    // Garden's return button is below the header: test actual controls too.
    if (y - half < 46 || blocked(y)) y = world.ty + TILE_SIZE + 6 + half;
    if (y + half > BASE_HEIGHT - 8 || blocked(y)) { ribbon.setVisible(false); name.setVisible(false); return; }
    ribbon.setPosition(Math.round(x - width / 2 + badgeWidth / 2), Math.round(y));
    name.setPosition(Math.round(x - width / 2 + badgeWidth + gap), Math.round(y));
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update);
  const cleanup = () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update); ribbon.destroy(); name.destroy(); };
  player.once(Phaser.GameObjects.Events.DESTROY, cleanup);
  update();
}
