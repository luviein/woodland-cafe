import Phaser from 'phaser';
import { TILE_SIZE } from '../config/display';
import { getGameState } from '../scenes/gameStore';
import { layoutPoint } from '../layout/positions';
import { addJournalImage, setJournalImage } from './journalImage';
import { WORLD_TITLE_RIBBONS, titleDisplayWidth } from './titleArt';

/** Separate from clothing: the title never turns, bobs or intercepts clicks. */
export function attachPlayerWorldTitle(scene: Phaser.Scene, player: Phaser.GameObjects.Container, canShow: () => boolean = () => true): void {
  const ribbon = addJournalImage(scene, 0, 0, 'masterCollectorWorldRibbon').setDepth(900).setVisible(false).setName('playerWorldTitle');
  const name = scene.add.text(0, 0, '', { fontFamily: 'Consolas, monospace', fontSize: '11px', resolution: 2, color: '#fff2d5', stroke: '#291d28', strokeThickness: 2 }).setOrigin(0.5).setDepth(900).setName('playerWorldName');
  const offset = layoutPoint('outdoor', 'playerTitleOffset', { x: 0, y: 2 });
  const update = () => {
    if (!player.scene) return;
    const state = getGameState(scene);
    const title = state.journal.equippedTitle;
    const visible = player.visible && canShow() && (title !== null || state.playerName !== '');
    ribbon.setVisible(visible && title !== null);
    name.setText(state.playerName).setVisible(visible && state.playerName !== '');
    if (!visible) return;
    if (title) setJournalImage(ribbon, WORLD_TITLE_RIBBONS[title], titleDisplayWidth(title, 'world'));
    const feet = player.getWorldTransformMatrix().transformPoint(TILE_SIZE / 2, TILE_SIZE);
    const badgeWidth = title ? ribbon.displayWidth : 0;
    const gap = title && state.playerName ? 4 : 0;
    const half = Math.max(title ? ribbon.displayHeight : 0, state.playerName ? name.height : 0) / 2;
    const x = Math.round(feet.x + offset.x);
    const y = Math.round(feet.y + offset.y + half);
    // Centre the name itself, so changing badges cannot push it to the right.
    // Stay below the feet even near headers; never flip the tag above the player.
    name.setPosition(x, y);
    ribbon.setPosition(Math.round(state.playerName ? x - name.width / 2 - gap - badgeWidth / 2 : x), y);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update);
  const cleanup = () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update); ribbon.destroy(); name.destroy(); };
  player.once(Phaser.GameObjects.Events.DESTROY, cleanup);
  update();
}
