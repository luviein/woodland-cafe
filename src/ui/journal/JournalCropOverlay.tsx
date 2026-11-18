import type Phaser from 'phaser';
import words from '../../data/texts/fieldJournal.json';
import { createRoot, type Root } from 'react-dom/client';
import { COLLECTION_ITEMS, type CollectionId } from '../../logic/cropCollection';
import type { GameState } from '../../logic/gameState';
import { cropArtName } from '../../logic/garden';
import type { ArtName } from '../../art/spriteArt';
import { artKey } from '../art';
import { JournalCropCard } from './JournalCropCard';
import { journalCropCards } from './journalCropData';

export interface JournalCropAnchor { id: CollectionId; zone: Phaser.GameObjects.Zone }
const pngCache = new WeakMap<Phaser.Textures.TextureManager, Map<CollectionId, string>>();

/** A read-only DOM layer follows Phaser anchors; the existing book still owns input and pausing. */
export class JournalCropOverlay {
  private readonly host = document.createElement('div');
  private readonly root: Root;
  private readonly rows = new Map<CollectionId, HTMLDivElement>();
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly owner: Phaser.GameObjects.Container,
    private readonly anchors: readonly JournalCropAnchor[], state: GameState) {
    this.host.className = 'journal-crop-overlay';
    this.host.setAttribute('aria-label', `${words.title}: ${words.crops}`);
    document.body.append(this.host);
    this.root = createRoot(this.host);
    let icons = pngCache.get(scene.textures);
    if (!icons) {
      icons = new Map(COLLECTION_ITEMS.map(item => [item.id,
        scene.textures.getBase64(artKey(cropArtName(item.crop, item.variant) as ArtName), 0)]));
      pngCache.set(scene.textures, icons);
    }
    this.root.render(<>{journalCropCards(state, icons).map(entry =>
      <JournalCropCard key={entry.id} entry={entry} cardRef={element => {
        if (element) { this.rows.set(entry.id, element); this.position(); }
        else this.rows.delete(entry.id);
      }} />)}</>);
    this.position();
    // Keep checking visibility when another HUD panel pauses the owning scene.
    scene.game.events.on('postrender', this.position);
    scene.events.once('shutdown', this.destroy);
  }

  private position = (): void => {
    if (this.destroyed) return;
    let visible = this.scene.sys.isActive() && this.scene.sys.isVisible();
    for (let parent: Phaser.GameObjects.Container | null = this.owner; parent; parent = parent.parentContainer) visible &&= parent.visible;
    this.host.style.visibility = visible ? 'visible' : 'hidden';
    const rect = this.scene.game.canvas.getBoundingClientRect();
    this.host.style.left = `${rect.left}px`; this.host.style.top = `${rect.top}px`;
    this.host.style.transform = `scale(${rect.width / 640}, ${rect.height / 360})`;
    const camera = this.scene.cameras.main;
    // Invert the public screen-to-world transform, including camera zoom and rotation.
    const origin = camera.getWorldPoint(0, 0), right = camera.getWorldPoint(1, 0), down = camera.getWorldPoint(0, 1);
    const ax = right.x - origin.x, ay = right.y - origin.y;
    const bx = down.x - origin.x, by = down.y - origin.y, determinant = ax * by - ay * bx;
    if (Math.abs(determinant) < 1e-8) return;
    for (const { id, zone } of this.anchors) {
      const row = this.rows.get(id);
      if (!row) continue;
      const world = zone.getWorldTransformMatrix().transformPoint(0, 0);
      const dx = world.x - origin.x, dy = world.y - origin.y;
      const x = (dx * by - dy * bx) / determinant, y = (ax * dy - ay * dx) / determinant;
      row.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
  };

  destroy = (): void => {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.game.events.off('postrender', this.position);
    this.scene.events.off('shutdown', this.destroy);
    this.root.unmount(); this.rows.clear(); this.host.remove();
  };
}
