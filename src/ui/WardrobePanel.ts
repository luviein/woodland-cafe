import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { changeAnimal, equip, type Outfit } from '../logic/wardrobe';
import { ANIMAL_NAMES, PLAYER_ANIMALS } from '../data/playerAnimals';
import { clothingArt } from '../data/clothingFits';
import { CLOTHING, CLOTHING_SLOTS, clothingIn, type ClothingId } from '../data/clothing';
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
  private readonly cape: Phaser.GameObjects.Image;
  private readonly shoes: Phaser.GameObjects.Image;
  private readonly critterImage: Phaser.GameObjects.Image;
  private readonly hat: Phaser.GameObjects.Image;
  private readonly coat: Phaser.GameObjects.Image;
  private readonly status: Phaser.GameObjects.Text;
  private readonly tabs: Button[];
  private readonly cards: {
    button: Button;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    outline: Phaser.GameObjects.Rectangle;
    worn: Phaser.GameObjects.Text;
  }[] = [];
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
    place('inventoryLabel', 446, 74, scene.add.text(0, 0, 'Your collection', TEXT.body).setOrigin(0.5));
    place('clothesRail', 446, 151, scene.add.rectangle(0, 0, 244, 3, COLORS.counterEdge));
    place('leftRailBracket', 328, 151, scene.add.rectangle(0, 0, 5, 9, 0xe9b64d).setStrokeStyle(1, COLORS.ink));
    place('rightRailBracket', 564, 151, scene.add.rectangle(0, 0, 5, 9, 0xe9b64d).setStrokeStyle(1, COLORS.ink));
    place('cabinetHandle', 300, 184, scene.add.rectangle(0, 0, 4, 14, 0xe9b64d).setStrokeStyle(1, COLORS.ink));
    place('title', 320, 33, scene.add.text(0, 0, 'Woodland wardrobe', { ...TEXT.heading, color: '#fff0cd', stroke: '#47312b', strokeThickness: 3 }).setOrigin(0.5));
    this.critterImage = place('previewBody', 172, 244, scene.add.image(0, 0, artKey('hedgehog')).setOrigin(0.5, 1).setScale(4));
    this.shoes = place('previewShoes', 172, 244, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1));
    this.coat = place('previewCoat', 172, 244, scene.add.image(0, 0, artKey('santaCoat')).setOrigin(0.5, 1).setScale(4));
    this.cape = place('previewCape', 172, 244, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1));
    this.hat = place('previewHat', 172, 244, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1).setScale(4));
    place('turnLeft', 110, 276, new Button(scene, 0, 0, 44, 26, '<', COLORS.book, () => this.turn(-1)));
    place('turnRight', 234, 276, new Button(scene, 0, 0, 44, 26, '>', COLORS.book, () => this.turn(1)));
    place('previewLabel', 172, 80, scene.add.text(0, 0, 'Fitting mirror', TEXT.body).setOrigin(0.5));
    this.tabs = [
      place('hatsTab', 358, 99, new Button(scene, 0, 0, 76, 24, 'Hats', COLORS.book, () => this.select('hat'))),
      place('topsTab', 446, 99, new Button(scene, 0, 0, 76, 24, 'Tops', COLORS.book, () => this.select('top'))),
      place('capesTab', 534, 99, new Button(scene, 0, 0, 76, 24, 'Capes', COLORS.book, () => this.select('cape'))),
      place('shoesTab', 402, 130, new Button(scene, 0, 0, 76, 24, 'Shoes', COLORS.book, () => this.select('shoes'))),
      place('animalTab', 490, 130, new Button(scene, 0, 0, 76, 24, 'Animal', COLORS.book, () => this.select('animal'))),
    ];
    for (let i = 0; i < 4; i++) {
      const x = 382 + (i % 2) * 128, y = 190 + Math.floor(i / 2) * 72;
      const button = place(`item.${i}.card`, x, y, new Button(scene, 0, 0, 116, 62, '', COLORS.paperEdge, () => this.toggleItem(i)));
      const outline = place(`item.${i}.outline`, x, y, scene.add.rectangle(0, 0, 116, 62).setFillStyle(0, 0).setStrokeStyle(3, COLORS.serve));
      const image = place(`item.${i}.picture`, x, y - 16, scene.add.image(0, 0, artKey('santaHat')).setScale(2));
      const label = place(`item.${i}.name`, x, y + 15, scene.add.text(0, 0, '', {
        ...TEXT.body, fontSize: '11px', align: 'center', wordWrap: { width: 104, useAdvancedWrap: true },
      }).setOrigin(0.5));
      const worn = place(`item.${i}.worn`, x + 50, y - 25, scene.add.text(0, 0, 'Worn', {
        ...TEXT.body, fontSize: '10px', color: '#294b33', fontStyle: 'bold',
      }).setOrigin(1, 0));
      this.cards.push({ button, image, label, outline, worn });
    }
    PLAYER_ANIMALS.forEach((animal, i) => {
      const x = 350, y = 164 + i * 35;
      const icon = place(`animal.${animal}.portrait`, x, y, scene.add.image(0, 0, artKey(animal)));
      const button = place(`animal.${animal}.choose`, 475, y, new Button(scene, 0, 0, 176, 26, ANIMAL_NAMES[animal], COLORS.serve, () => {
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

  private toggleItem(index: number): void {
    if (this.slot === 'animal') return;
    const item = clothingIn(this.slot)[index];
    if (!item) return;
    const state = getGameState(this.scene);
    const outfit = equip(state.outfit, this.slot, state.outfit[this.slot] === item ? null : item);
    setGameState(this.scene, { ...state, outfit });
    this.refresh();
  }

  private centreItem(image: Phaser.GameObjects.Image, animal: (typeof PLAYER_ANIMALS)[number], item: ClothingId): void {
    const sprite = SPRITE_ART[clothingArt(animal, item)];
    const pixels = sprite.frames[0];
    const points = pixels.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' ? [] : [{ x, y }]));
    if (!points.length) return;
    const size = spriteSize(sprite);
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    image.setOrigin((Math.min(...xs) + Math.max(...xs) + 1) / 2 / size.width, (Math.min(...ys) + Math.max(...ys) + 1) / 2 / size.height);
  }

  private turn(direction: number): void {
    this.view = (this.view + direction + 4) % 4;
    for (const layer of [this.critterImage, this.shoes, this.coat, this.cape, this.hat]) layer.setFrame(this.view * 3);
  }

  private refresh(): void {
    const { animal, outfit } = getGameState(this.scene);
    const frame = this.view * 3;
    const scale = Math.min(4, Math.floor(120 / spriteSize(SPRITE_ART[animal]).height));
    this.critterImage.setTexture(artKey(animal), frame).setScale(scale);
    const layers = { hat: this.hat, top: this.coat, cape: this.cape, shoes: this.shoes };
    for (const slot of CLOTHING_SLOTS) {
      const item = outfit[slot];
      layers[slot].setVisible(!!item).setScale(scale);
      if (item) layers[slot].setTexture(artKey(clothingArt(animal, item)), frame);
    }
    const choosingAnimal = this.slot === 'animal';
    const items = this.slot === 'animal' ? [] : clothingIn(this.slot);
    this.cards.forEach((card, i) => {
      const item = items[i];
      for (const object of Object.values(card)) object.setVisible(!!item);
      if (!item || this.slot === 'animal') return;
      const equipped = outfit[this.slot] === item;
      card.image.setTexture(artKey(clothingArt(animal, item)), 0);
      this.centreItem(card.image, animal, item);
      card.label.setText(CLOTHING[item].name);
      card.outline.setVisible(equipped);
      card.worn.setVisible(equipped);
    });
    for (const object of this.animalObjects) object.setVisible(choosingAnimal);
    this.animalButtons.forEach((button, i) => button.setEnabled(PLAYER_ANIMALS[i] !== animal));
    (['hat', 'top', 'cape', 'shoes', 'animal'] as const).forEach((slot, i) => this.tabs[i].setEnabled(this.slot !== slot));
    this.status.setText(`${ANIMAL_NAMES[animal]} · Saved with your game`);
  }
}
