import Phaser from 'phaser';
import words from '../data/texts/fieldJournal.json';
import collectionWords from '../data/texts/cropCollection.json';
import titleWords from '../data/texts/playerTitles.json';
import { COLLECTION_ITEMS } from '../logic/cropCollection';
import { MILESTONE_IDS, MILESTONE_LEAVES, canClaimMilestone, milestoneProgress } from '../logic/journal';
import { cropRecord, formatCropWeight } from '../logic/cropWeights';
import { cropArtName, cropName } from '../logic/garden';
import type { GameState } from '../logic/gameState';
import type { ArtName } from '../art/spriteArt';
import { claimJournalMilestone, getGameState } from '../scenes/gameStore';
import { titleProgress, titleUnlocked } from '../logic/playerTitles';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { addArt } from './art';
import { addJournalImage } from './journalImage';
import { Button } from './Button';
import { LeafText } from './LeafText';
import { PlayerTitlePlate } from './PlayerTitlePlate';
import { WardrobePanel } from './WardrobePanel';
import { cropQuantity } from './cropQuantity';
import { COLORS, TEXT } from './theme';

type Placed = Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text;

/** Existing book entry points now share one journal and the same pause lifecycle. */
export class CropCollectionPanel extends Phaser.GameObjects.Container {
  private spread: 'crops' | 'milestones' = 'crops';
  private readonly content: Phaser.GameObjects.Container;
  private pendingRefresh: Phaser.Time.TimerEvent | null = null;
  private journalState: GameState;

  constructor(scene: Phaser.Scene, back: () => void, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('fieldJournal');
    this.journalState = getGameState(scene);
    this.add(scene.add.rectangle(320, 180, 640, 360, COLORS.overlay, 0.65).setInteractive());
    this.place(this, 'background', 350, 180, addJournalImage(scene, 0, 0, 'fieldJournal'));
    this.place(this, 'back', 137, 332, new Button(scene, 0, 0, 60, 20, collectionWords.back, COLORS.book, back).setFontSize(10));
    this.place(this, 'close', 563, 332, new Button(scene, 0, 0, 60, 20, collectionWords.close, COLORS.reset, close).setFontSize(10));
    (['crops', 'milestones'] as const).forEach((spread, i) => {
      const art = i === 0 ? 'journalCropsBookmark' : 'journalMilestonesBookmark';
      this.place(this, `bookmark.${spread}`, 65, 91 + i * 54,
        new Button(scene, 0, 0, 112, 50, '', COLORS.book, () => {
          this.spread = spread; this.refresh();
        }).setIcon(addJournalImage(scene, 0, 0, art)).setBackgroundVisible(false));
    });
    this.content = scene.add.container(30, 0).setName('content'); this.add(this.content);
    this.renderSpread();
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.pendingRefresh?.remove(false));
    arrangeablePanel(scene, 'fieldJournal', 'panel', this);
  }

  private place<T extends Placed>(parent: Phaser.GameObjects.Container, name: string, x: number, y: number, object: T): T {
    const at = layoutPoint('fieldJournal', name, { x, y });
    object.setName(name).setPosition(at.x, at.y); parent.add(object);
    arrangeable(this.scene, 'fieldJournal', name, at, object);
    return object;
  }

  private text(name: string, x: number, y: number, value: string, size = 10, width = 185): Phaser.GameObjects.Text {
    const text = this.scene.add.text(0, 0, value,
      { ...TEXT.body, fontFamily: 'Consolas, monospace', color: '#3c261d', resolution: 2,
        fontSize: `${Math.max(10, size)}px`, wordWrap: { width }, lineSpacing: 1 });
    return this.place(this.content, name, x, y, text);
  }

  refresh(state: GameState = getGameState(this.scene)): void {
    this.journalState = state;
    // A claim can notify the inventory synchronously during pointer-up. Rebuild
    // after dispatch so its button is not destroyed underneath Phaser input.
    if (this.pendingRefresh) return;
    this.pendingRefresh = this.scene.time.delayedCall(0, () => {
      this.pendingRefresh = null;
      if (this.scene) this.renderSpread();
    });
  }

  private renderSpread(): void {
    this.content.removeAll(true);
    if (this.spread === 'crops') this.renderCrops(); else this.renderMilestones();
  }

  private renderCrops(): void {
    const state = this.journalState;
    [collectionWords.golden, collectionWords.christmas].forEach((label, i) =>
      this.text(`heading.${i}`, i === 0 ? 203 : 448, 92, label, 12).setOrigin(0.5, 0));
    COLLECTION_ITEMS.forEach((item, i) => {
      const left = i < 3 ? 104 : 352, y = 112 + i % 3 * 60;
      const recorded = state.cropCollection.includes(item.id), name = `crop.${item.id}`;
      const art = this.place(this.content, `${name}.art`, left + 12, y + 4,
        addArt(this.scene, 0, 0, cropArtName(item.crop, item.variant) as ArtName));
      if (!recorded) art.setTintFill(0x785c43).setAlpha(0.5);
      this.text(`${name}.name`, left + 28, y - 3, cropName(item.crop, item.variant), 10, 152).setFontStyle('bold');
      this.text(`${name}.description`, left, y + 16,
        recorded ? collectionWords.descriptions[item.id] : item.variant === 'golden' ? words.goldenClue : words.christmasClue, 10, 194);
      this.text(`${name}.count`, left, y + 44,
        collectionWords.have.replace('{amount}', cropQuantity(state.garden.harvests[item.variant][item.crop])), 9, 80);
      this.text(`${name}.weight`, left + 194, y + 44,
        recorded ? collectionWords.record.replace('{weight}', formatCropWeight(cropRecord(state, item.id))) : '', 9, 112).setOrigin(1, 0);
    });
    this.text('progress', 203, 78, collectionWords.progress.replace('{amount}', String(state.cropCollection.length)), 10, 200).setOrigin(0.5);
  }

  private renderMilestones(): void {
    const state = this.journalState;
    const badges = ['discoveryBadge', 'goldenBadge', 'collectorBadge'] as const;
    const names = [words.firstDiscovery, words.goldenFind, words.founding];
    const hints = [words.discoveryHint, words.goldenHint, words.foundingHint];
    this.text('milestoneHeading', 203, 103, words.milestones, 11).setOrigin(0.5, 0);
    MILESTONE_IDS.forEach((id, i) => {
      const y = 125 + i * 54, name = `milestone.${id}`;
      const progress = milestoneProgress(state, id), claimed = state.journal.claimed.includes(id);
      this.place(this.content, `${name}.badge`, 116, y + 13, addJournalImage(this.scene, 0, 0, badges[i])).setAlpha(progress.current >= progress.target ? 1 : 0.4);
      this.text(`${name}.name`, 137, y - 4, names[i], 10, 164);
      this.text(`${name}.hint`, 137, y + 10, `${hints[i]} (${progress.current}/${progress.target})`, 9, 164);
      const reward = id === 'foundingCollection' ? titleWords.caseReward : `🍃 ${MILESTONE_LEAVES[id]}`;
      this.place(this.content, `${name}.reward`, 104, y + 36,
        new LeafText(this.scene, 0, 0, reward, { ...TEXT.body, fontFamily: 'Consolas, monospace', color: '#3c261d', resolution: 2, fontSize: '10px' }));
      this.place(this.content, `${name}.claim`, 275, y + 40,
        new Button(this.scene, 0, 0, 46, 16, claimed ? words.claimed : words.claim, COLORS.serve, () => {
          claimJournalMilestone(this.scene, id); this.refresh();
        }).setFontSize(9)).setEnabled(canClaimMilestone(state, id));
    });
    const titleCentre = 448;
    this.text('titleHeading', titleCentre, 107, titleWords.journalHeading, 12).setFontStyle('bold').setOrigin(0.5, 0);
    (['goldenCollector', 'christmasDevotee2026'] as const).forEach((title, i) => {
      const y = 150 + i * 76, progress = titleProgress(state, title), unlocked = titleUnlocked(state, title);
      this.place(this.content, `title.${title}.plate`, titleCentre, y, new PlayerTitlePlate(this.scene, title)).setAlpha(unlocked ? 1 : 0.5);
      this.text(`title.${title}.progress`, titleCentre, y + 24,
        unlocked ? titleWords.unlocked : titleWords.progress.replace('{current}', String(progress.current)).replace('{target}', String(progress.target)), 10, 190).setOrigin(0.5, 0);
    });
    this.place(this.content, 'equipTitle', titleCentre, 276,
      new Button(this.scene, 0, 0, 156, 22, titleWords.choose, COLORS.book, () => {
        if (!this.scene.children.getByName('wardrobe')) new WardrobePanel(this.scene, 'titles');
      }).setFontSize(11));
  }
}
