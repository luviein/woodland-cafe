import { cropRecord, formatCropWeight } from '../logic/cropWeights';
import Phaser from 'phaser';
import words from '../data/texts/museum.json';
import collectionWords from '../data/texts/cropCollection.json';
import { COLLECTION_ITEMS, type CollectionId } from '../logic/cropCollection';
import { cropArtName, cropName } from '../logic/garden';
import type { GameState } from '../logic/gameState';
import type { ArtName } from '../art/spriteArt';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

export class MuseumExhibitPanel extends Phaser.GameObjects.Container {
  private readonly plaque: Phaser.GameObjects.Text;
  private readonly record: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly description: Phaser.GameObjects.Text;
  private readonly image: Phaser.GameObjects.Image;
  private readonly choices: Button[] = [];
  constructor(scene: Phaser.Scene, private readonly caseId: number, choose: (id: CollectionId | null) => void, move: () => void, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(5000);
    this.add(scene.add.rectangle(320, 180, 640, 360, COLORS.overlay, 0.6).setInteractive());
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint('museumExhibit', name, { x, y });
      object.setName(name).setPosition(at.x, at.y); this.add(object);
      arrangeable(scene, 'museumExhibit', name, at, object); return object;
    };
    place('frame', 320, 180, scene.add.rectangle(0, 0, 550, 302, COLORS.counter).setStrokeStyle(3, COLORS.ink));
    place('paper', 320, 180, scene.add.rectangle(0, 0, 534, 286, COLORS.paper).setStrokeStyle(2, COLORS.paperEdge));
    place('heading', 320, 56, scene.add.text(0, 0, words.choose, TEXT.heading).setOrigin(0.5));
    place('close', 554, 56, new Button(scene, 0, 0, 56, 22, words.close, COLORS.reset, close).setFontSize(11));
    place('case', 127, 144, addArt(scene, 0, 0, 'museumCase').setScale(2).setOrigin(0.5, 1));
    this.image = place('crop', 127, 124, addArt(scene, 0, 0, 'mushroom').setScale(2).setOrigin(0.5, 1));
    place('glass', 127, 144, addArt(scene, 0, 0, 'museumGlass').setScale(2).setOrigin(0.5, 1));
    this.plaque = place('weightPlaque', 127, 136, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#493026', backgroundColor: '#f2cea0', padding: { x: 2, y: 0 } }).setOrigin(0.5));
    this.title = place('name', 183, 85, scene.add.text(0, 0, '', { ...TEXT.heading, fontSize: '13px' }));
    this.record = place('record', 183, 107, scene.add.text(0, 0, '', { ...TEXT.heading, fontSize: '11px' }));
    this.description = place('description', 183, 125, scene.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', wordWrap: { width: 359 } }));
    COLLECTION_ITEMS.forEach((item, i) => {
      const button = place(`exhibit.${item.id}`, i < 3 ? 190 : 450, 181 + i % 3 * 38,
        new Button(scene, 0, 0, 226, 30, cropName(item.crop, item.variant), COLORS.serve, () => choose(item.id)).setFontSize(11)
          .setLeadingIcon(addArt(scene, 0, 0, cropArtName(item.crop, item.variant) as ArtName)));
      this.choices.push(button);
    });
    place('availabilityHint', 320, 281, scene.add.text(0, 0, words.availabilityHint,
      { ...TEXT.body, fontSize: '9px' }).setOrigin(0.5));
    place('move', 250, 302, new Button(scene, 0, 0, 116, 22, words.move, COLORS.book, move).setFontSize(11));
    place('clear', 390, 302, new Button(scene, 0, 0, 116, 22, words.clear, COLORS.reset, () => choose(null)).setFontSize(11));
    arrangeablePanel(scene, 'museumExhibit', 'panel', this);
  }
  refresh(state: GameState): void {
    const exhibit = state.museum.cases.find(item => item.id === this.caseId)?.exhibit;
    const item = COLLECTION_ITEMS.find(item => item.id === exhibit);
    this.image.setVisible(!!item);
    if (item) this.image.setTexture(`art:${cropArtName(item.crop, item.variant)}`, 0);
    this.title.setText(item ? cropName(item.crop, item.variant) : words.empty);
    this.plaque.setVisible(!!item).setText(item ? formatCropWeight(cropRecord(state, item.id)).replace(' ', '') : '');
    this.record.setText(item ? words.record.replace('{weight}', formatCropWeight(cropRecord(state, item.id))) : '');
    this.description.setText(item ? collectionWords.descriptions[item.id] : words.emptyDescription);
    COLLECTION_ITEMS.forEach((entry, i) => this.choices[i].setEnabled(state.cropCollection.includes(entry.id)
      && !state.museum.cases.some(item => item.exhibit === entry.id)));
  }
}
