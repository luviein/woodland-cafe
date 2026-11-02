import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { equip, type Outfit } from '../logic/wardrobe';
import { getGameState, setGameState } from '../scenes/gameStore';
import { artKey } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** A single panel owns its input and preview, leaving scenes to run the world. */
export class WardrobePanel extends Phaser.GameObjects.Container {
  private slot: keyof Outfit = 'hat';
  private view = 0;
  private readonly critterImage: Phaser.GameObjects.Image;
  private readonly hat: Phaser.GameObjects.Image;
  private readonly coat: Phaser.GameObjects.Image;
  private readonly item: Phaser.GameObjects.Image;
  private readonly status: Phaser.GameObjects.Text;
  private readonly itemName: Phaser.GameObjects.Text;
  private readonly action: Button;
  private readonly tabs: Button[];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setName('wardrobe').setDepth(100000);
    scene.add.existing(this);
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.65).setOrigin(0).setInteractive());
    // Every part has a named position; the complete panel can also move as a unit.
    const at = (name: string, x: number, y: number) => layoutPoint('wardrobe', name, { x, y });
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle>(name: string, x: number, y: number, object: T): T => {
      const p = at(name, x, y);
      object.setPosition(p.x, p.y);
      this.add(object);
      arrangeable(scene, 'wardrobe', name, p, object);
      return object;
    };
    place('frame', 320, 174, scene.add.rectangle(0, 0, 540, 294, COLORS.counterEdge).setStrokeStyle(3, COLORS.ink));
    place('portraitBackdrop', 192, 172, scene.add.rectangle(0, 0, 222, 210, COLORS.paperEdge).setStrokeStyle(2, COLORS.ink));
    place('inventoryBackdrop', 441, 172, scene.add.rectangle(0, 0, 252, 210, COLORS.paper).setStrokeStyle(2, COLORS.ink));
    place('title', 320, 46, scene.add.text(0, 0, 'Your woodland wardrobe', { ...TEXT.heading, color: '#fff0cd' }).setOrigin(0.5));
    this.critterImage = place('previewBody', 192, 226, scene.add.image(0, 0, artKey('hedgehog')).setOrigin(0.5, 1).setScale(4));
    this.coat = place('previewCoat', 192, 226, scene.add.image(0, 0, artKey('santaCoat')).setOrigin(0.5, 1).setScale(4));
    this.hat = place('previewHat', 192, 226, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1).setScale(4));
    place('turnLeft', 123, 252, new Button(scene, 0, 0, 44, 26, '<', COLORS.book, () => this.turn(-1)));
    place('turnRight', 261, 252, new Button(scene, 0, 0, 44, 26, '>', COLORS.book, () => this.turn(1)));
    place('previewLabel', 192, 87, scene.add.text(0, 0, 'Cafe owner', TEXT.body).setOrigin(0.5));
    this.tabs = [
      place('hatsTab', 379, 91, new Button(scene, 0, 0, 104, 28, 'Hats', COLORS.book, () => this.select('hat'))),
      place('topsTab', 501, 91, new Button(scene, 0, 0, 104, 28, 'Tops', COLORS.book, () => this.select('top'))),
    ];
    place('itemCard', 441, 159, scene.add.rectangle(0, 0, 100, 82, COLORS.paperEdge).setStrokeStyle(2, COLORS.counterEdge));
    this.item = place('item', 441, 162, scene.add.image(0, 0, artKey('santaHat')).setScale(2));
    this.itemName = place('itemName', 441, 216, scene.add.text(0, 0, '', TEXT.heading).setOrigin(0.5));
    this.action = place('equip', 441, 250, new Button(scene, 0, 0, 146, 28, '', COLORS.serve, () => {
      const state = getGameState(scene);
      const outfit = this.slot === 'hat'
        ? equip(state.outfit, 'hat', state.outfit.hat ? null : 'santaHat')
        : equip(state.outfit, 'top', state.outfit.top ? null : 'santaCoat');
      setGameState(scene, { ...state, outfit });
      this.refresh();
    }));
    this.status = place('status', 270, 298, scene.add.text(0, 0, '', { ...TEXT.label, fontSize: '11px' }).setOrigin(0.5));
    const close = () => {
      // Finish pointer dispatch before removing the dim layer, avoiding a walk-through tap.
      scene.time.delayedCall(0, () => this.destroy());
    };
    place('close', 526, 298, new Button(scene, 0, 0, 86, 26, 'Close', COLORS.reset, close));
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.repeat) close(); };
    scene.input.keyboard?.on('keydown', onKey);
    this.once('destroy', () => scene.input.keyboard?.off('keydown', onKey));
    arrangeablePanel(scene, 'wardrobe', 'panel', this);
    this.refresh();
  }

  private select(slot: keyof Outfit): void { this.slot = slot; this.refresh(); }

  private turn(direction: number): void {
    this.view = (this.view + direction + 4) % 4;
    for (const layer of [this.critterImage, this.coat, this.hat]) layer.setFrame(this.view * 3);
  }

  private refresh(): void {
    const outfit = getGameState(this.scene).outfit;
    this.hat.setVisible(!!outfit.hat);
    this.coat.setVisible(!!outfit.top);
    this.item.setTexture(artKey(this.slot === 'hat' ? 'santaHat' : 'santaCoat'), 0);
    this.item.setOrigin(0.5, this.slot === 'hat' ? 0.2 : 0.8);
    this.itemName.setText(this.slot === 'hat' ? 'Santa hat' : 'Santa coat');
    this.action.setText(outfit[this.slot] ? 'Remove' : 'Equip');
    this.tabs[0].setEnabled(this.slot !== 'hat');
    this.tabs[1].setEnabled(this.slot !== 'top');
    this.status.setText('Free starter outfit · Saved with your game');
  }
}
