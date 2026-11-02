import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { changeAnimal, equip, type Outfit } from '../logic/wardrobe';
import { ANIMAL_NAMES, PLAYER_ANIMALS } from '../data/playerAnimals';
import { CLOTHING_FITS } from '../data/clothingFits';
import { spriteSize } from '../art/pixelSprite';
import { SPRITE_ART } from '../art/spriteArt';
import { getGameState, setGameState } from '../scenes/gameStore';
import { artKey } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** A single panel owns its input and preview, leaving scenes to run the world. */
export class WardrobePanel extends Phaser.GameObjects.Container {
  private slot: keyof Outfit | 'animal' = 'hat';
  private view = 0;
  private readonly critterImage: Phaser.GameObjects.Image;
  private readonly hat: Phaser.GameObjects.Image;
  private readonly coat: Phaser.GameObjects.Image;
  private readonly item: Phaser.GameObjects.Image;
  private readonly status: Phaser.GameObjects.Text;
  private readonly itemName: Phaser.GameObjects.Text;
  private readonly action: Button;
  private readonly tabs: Button[];
  private readonly itemCard: Phaser.GameObjects.Rectangle;
  private readonly animalObjects: (Phaser.GameObjects.Image | Button)[] = [];
  private readonly animalButtons: Button[] = [];

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
    place('cabinetShadow', 323, 183, scene.add.rectangle(0, 0, 596, 336, COLORS.overlay, 0.35));
    place('frame', 320, 180, scene.add.rectangle(0, 0, 596, 336, COLORS.counter).setStrokeStyle(4, COLORS.ink));
    place('cabinetInset', 320, 180, scene.add.rectangle(0, 0, 582, 322, COLORS.counter).setStrokeStyle(2, COLORS.paperEdge));
    place('cornice', 320, 53, scene.add.rectangle(0, 0, 564, 4, COLORS.counterEdge));
    place('centrePost', 300, 179, scene.add.rectangle(0, 0, 8, 246, COLORS.counterEdge));
    place('bottomRail', 320, 304, scene.add.rectangle(0, 0, 564, 4, COLORS.counterEdge));
    place('mirrorFrame', 172, 179, scene.add.rectangle(0, 0, 244, 238, COLORS.counterEdge).setStrokeStyle(2, COLORS.ink));
    place('portraitBackdrop', 172, 179, scene.add.rectangle(0, 0, 232, 226, 0xc5d6c7).setStrokeStyle(2, COLORS.paperEdge));
    place('mirrorGlint', 64, 121, scene.add.rectangle(0, 0, 3, 98, 0xe5eee0));
    place('mirrorSill', 172, 253, scene.add.rectangle(0, 0, 210, 3, COLORS.counterEdge));
    place('inventoryBackdrop', 446, 179, scene.add.rectangle(0, 0, 284, 238, COLORS.paper).setStrokeStyle(3, COLORS.counterEdge));
    place('inventoryLabel', 446, 77, scene.add.text(0, 0, 'Your collection', TEXT.body).setOrigin(0.5));
    place('clothesRail', 446, 126, scene.add.rectangle(0, 0, 244, 3, COLORS.counterEdge));
    place('leftRailBracket', 328, 126, scene.add.rectangle(0, 0, 5, 9, 0xe9b64d).setStrokeStyle(1, COLORS.ink));
    place('rightRailBracket', 564, 126, scene.add.rectangle(0, 0, 5, 9, 0xe9b64d).setStrokeStyle(1, COLORS.ink));
    place('cabinetHandle', 300, 184, scene.add.rectangle(0, 0, 4, 14, 0xe9b64d).setStrokeStyle(1, COLORS.ink));
    place('title', 320, 33, scene.add.text(0, 0, 'Woodland wardrobe', { ...TEXT.heading, color: '#fff0cd', stroke: '#47312b', strokeThickness: 3 }).setOrigin(0.5));
    this.critterImage = place('previewBody', 172, 244, scene.add.image(0, 0, artKey('hedgehog')).setOrigin(0.5, 1).setScale(4));
    this.coat = place('previewCoat', 172, 244, scene.add.image(0, 0, artKey('santaCoat')).setOrigin(0.5, 1).setScale(4));
    this.hat = place('previewHat', 172, 244, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1).setScale(4));
    place('turnLeft', 110, 276, new Button(scene, 0, 0, 44, 26, '<', COLORS.book, () => this.turn(-1)));
    place('turnRight', 234, 276, new Button(scene, 0, 0, 44, 26, '>', COLORS.book, () => this.turn(1)));
    place('previewLabel', 172, 80, scene.add.text(0, 0, 'Fitting mirror', TEXT.body).setOrigin(0.5));
    this.tabs = [
      place('hatsTab', 358, 105, new Button(scene, 0, 0, 76, 28, 'Hats', COLORS.book, () => this.select('hat'))),
      place('topsTab', 446, 105, new Button(scene, 0, 0, 76, 28, 'Tops', COLORS.book, () => this.select('top'))),
      place('animalTab', 534, 105, new Button(scene, 0, 0, 76, 28, 'Animal', COLORS.book, () => this.select('animal'))),
    ];
    this.itemCard = place('itemCard', 446, 177, scene.add.rectangle(0, 0, 132, 94, COLORS.paperEdge).setStrokeStyle(2, COLORS.counterEdge));
    this.item = place('item', 446, 177, scene.add.image(0, 0, artKey('santaHat')).setScale(2));
    this.itemName = place('itemName', 446, 239, scene.add.text(0, 0, '', TEXT.heading).setOrigin(0.5));
    this.action = place('equip', 446, 276, new Button(scene, 0, 0, 146, 28, '', COLORS.serve, () => {
      if (this.slot === 'animal') return;
      const state = getGameState(scene);
      const outfit = this.slot === 'hat'
        ? equip(state.outfit, 'hat', state.outfit.hat ? null : 'santaHat')
        : equip(state.outfit, 'top', state.outfit.top ? null : 'santaCoat');
      setGameState(scene, { ...state, outfit });
      this.refresh();
    }));
    PLAYER_ANIMALS.forEach((animal, i) => {
      const x = 382 + (i % 2) * 128, y = 151 + Math.floor(i / 2) * 74;
      const icon = place(`animal.${animal}.portrait`, x, y, scene.add.image(0, 0, artKey(animal)));
      const button = place(`animal.${animal}.choose`, x, y + 34, new Button(scene, 0, 0, 112, 26, ANIMAL_NAMES[animal], COLORS.serve, () => {
        setGameState(scene, changeAnimal(getGameState(scene), animal));
        this.refresh();
      }));
      this.animalObjects.push(icon, button);
      this.animalButtons.push(button);
    });
    this.status = place('status', 247, 325, scene.add.text(0, 0, '', { ...TEXT.label, fontSize: '11px' }).setOrigin(0.5));
    const close = () => {
      // Finish pointer dispatch before removing the dim layer, avoiding a walk-through tap.
      scene.time.delayedCall(0, () => this.destroy());
    };
    place('close', 550, 325, new Button(scene, 0, 0, 86, 26, 'Close', COLORS.reset, close));
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.repeat) close(); };
    scene.input.keyboard?.on('keydown', onKey);
    this.once('destroy', () => scene.input.keyboard?.off('keydown', onKey));
    arrangeablePanel(scene, 'wardrobe', 'panel', this);
    this.refresh();
  }

  private select(slot: keyof Outfit | 'animal'): void { this.slot = slot; this.refresh(); }

  private turn(direction: number): void {
    this.view = (this.view + direction + 4) % 4;
    for (const layer of [this.critterImage, this.coat, this.hat]) layer.setFrame(this.view * 3);
  }

  private refresh(): void {
    const { animal, outfit } = getGameState(this.scene);
    const fit = CLOTHING_FITS[animal];
    const frame = this.view * 3;
    // Keep tall ears and antlers below the portrait label, using whole pixels.
    const scale = Math.min(4, Math.floor(120 / spriteSize(SPRITE_ART[animal]).height));
    this.critterImage.setTexture(artKey(animal), frame).setScale(scale);
    this.coat.setTexture(artKey(fit.santaCoat), frame).setScale(scale);
    this.hat.setTexture(artKey(fit.santaHat), frame).setScale(scale);
    this.hat.setVisible(!!outfit.hat);
    this.coat.setVisible(!!outfit.top);
    const choosingAnimal = this.slot === 'animal';
    for (const object of [this.itemCard, this.item, this.itemName, this.action]) object.setVisible(!choosingAnimal);
    for (const object of this.animalObjects) object.setVisible(choosingAnimal);
    this.animalButtons.forEach((button, i) => button.setEnabled(PLAYER_ANIMALS[i] !== animal));
    if (this.slot !== 'animal') {
      this.item.setTexture(artKey(this.slot === 'hat' ? fit.santaHat : fit.santaCoat), 0);
      this.item.setOrigin(0.5, this.slot === 'hat' ? 0.2 : 0.8);
      this.itemName.setText(this.slot === 'hat' ? 'Santa hat' : 'Santa coat');
      this.action.setText(outfit[this.slot] ? 'Remove' : 'Equip');
    }
    this.tabs[0].setEnabled(this.slot !== 'hat');
    this.tabs[1].setEnabled(this.slot !== 'top');
    this.tabs[2].setEnabled(this.slot !== 'animal');
    this.status.setText(`${ANIMAL_NAMES[animal]} · Saved with your game`);
  }
}
