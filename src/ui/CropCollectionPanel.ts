import { cropRecord, heaviestCrop, formatCropWeight } from '../logic/cropWeights';
import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import words from '../data/texts/cropCollection.json';
import { COLLECTION_ITEMS, donateCrop } from '../logic/cropCollection';
import { cropArtName, cropName } from '../logic/garden';
import type { GameState } from '../logic/gameState';
import type { ArtName } from '../art/spriteArt';
import { getGameState, setGardenGameState } from '../scenes/gameStore';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** Two permanent collection pages; remaining crops stay in the player's inventory. */
export class CropCollectionPanel extends Phaser.GameObjects.Container {
  private readonly progress: Phaser.GameObjects.Text;
  private readonly entries: { back: Phaser.GameObjects.Rectangle; art: Phaser.GameObjects.Image; description: Phaser.GameObjects.Text; count: Phaser.GameObjects.Text; record: Phaser.GameObjects.Text; donate: Button }[] = [];

  constructor(scene: Phaser.Scene, back: () => void, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('cropCollection');
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.65).setOrigin(0).setInteractive());
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint('cropCollection', name, { x, y });
      object.setName(name).setPosition(at.x, at.y);
      this.add(object);
      arrangeable(scene, 'cropCollection', name, at, object);
      return object;
    };
    place('cover', 320, 180, scene.add.rectangle(0, 0, 600, 328, COLORS.counter).setStrokeStyle(3, COLORS.ink));
    for (const [i, x] of [174, 466].entries()) {
      place(`page.${i}`, x, 180, scene.add.rectangle(0, 0, 280, 304, COLORS.paper).setStrokeStyle(2, COLORS.paperEdge));
      place(`heading.${i}`, x, 87, scene.add.text(0, 0, i === 0 ? words.golden : words.christmas,
        { ...TEXT.heading, fontSize: '12px' }).setOrigin(0.5));
    }
    place('spine', 320, 180, scene.add.rectangle(0, 0, 8, 304, COLORS.counterEdge));
    // A paper title plate keeps the centre seam out of the heading and progress.
    place('titlePlate', 320, 52, scene.add.rectangle(0, 0, 230, 54, COLORS.paper).setStrokeStyle(1, COLORS.paperEdge));
    place('title', 320, 43, scene.add.text(0, 0, words.title, TEXT.heading).setOrigin(0.5));
    this.progress = place('progress', 320, 64, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '11px' }).setOrigin(0.5));
    place('back', 72, 43, new Button(scene, 0, 0, 60, 22, words.back, COLORS.book, back).setFontSize(12));
    place('close', 568, 43, new Button(scene, 0, 0, 60, 22, words.close, COLORS.reset, close).setFontSize(12));
    COLLECTION_ITEMS.forEach((item, i) => {
      const x = i < 3 ? 174 : 466, y = 135 + i % 3 * 76;
      const card = place(`entry.${item.id}`, x, y, scene.add.rectangle(0, 0, 258, 70, 0xffe7bf).setStrokeStyle(1, COLORS.paperEdge));
      const art = place(`entry.${item.id}.art`, x - 99, y - 7, addArt(scene, 0, 0, cropArtName(item.crop, item.variant) as ArtName).setScale(2));
      place(`entry.${item.id}.name`, x - 68, y - 28, scene.add.text(0, 0, cropName(item.crop, item.variant),
        { ...TEXT.heading, fontSize: '11px' }));
      const description = place(`entry.${item.id}.description`, x - 68, y - 12, scene.add.text(0, 0, '', {
        ...TEXT.body, fontSize: '9px', wordWrap: { width: 184 }, lineSpacing: 0,
      }));
      const count = place(`entry.${item.id}.count`, x - 68, y + 22, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '9px' }).setOrigin(0, 0.5));
      const donate = place(`entry.${item.id}.donate`, x + 89, y + 22, new Button(scene, 0, 0, 64, 18, words.donate, COLORS.serve, () => {
        setGardenGameState(scene, donateCrop(getGameState(scene), item.id));
        this.refresh();
      }).setFontSize(10));
      const record = place(`entry.${item.id}.record`, x - 99, y + 12, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '8px', align: 'center', lineSpacing: 0 }).setOrigin(0.5, 0));
      this.entries.push({ back: card, art, description, count, record, donate });
    });
    this.refresh();
    arrangeablePanel(scene, 'cropCollection', 'panel', this);
  }

  refresh(state: GameState = getGameState(this.scene)): void {
    this.progress.setText(words.progress.replace('{amount}', String(state.cropCollection.length)));
    COLLECTION_ITEMS.forEach((item, i) => {
      const entry = this.entries[i], donated = state.cropCollection.includes(item.id);
      const amount = state.garden.harvests[item.variant][item.crop];
      entry.art.setAlpha(donated ? 1 : 0.35);
      entry.back.setStrokeStyle(donated ? 2 : 1, donated ? 0xc29b45 : COLORS.paperEdge);
      entry.description.setText(donated ? words.descriptions[item.id] : words.hint);
      entry.count.setText(words.have.replace('{amount}', String(amount)));
      entry.record.setText(donated ? words.record.replace('{weight}', formatCropWeight(cropRecord(state, item.id))) : '');
      const improves = heaviestCrop(state, item.crop, item.variant) > cropRecord(state, item.id);
      entry.donate.setText(donated ? improves ? words.upgrade : words.donated : words.donate).setEnabled(improves);
    });
  }
}
