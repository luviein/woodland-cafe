import words from '../data/texts/wardrobe.json';
import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { changeAnimal, type Outfit } from '../logic/wardrobe';
import { toggleClothing } from '../logic/clothingShop';
import { ANIMAL_NAMES, PLAYER_ANIMALS } from '../data/playerAnimals';
import { clothingArt } from '../data/clothingFits';
import { CLOTHING, CLOTHING_SLOTS, clothingIn, type ClothingId } from '../data/clothing';
import { spriteSize } from '../art/pixelSprite';
import { SPRITE_ART } from '../art/spriteArt';
import { getGameState, setGameState } from '../scenes/gameStore';
import { addArt, artKey } from './art';
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
  private readonly tabSkins: Phaser.GameObjects.Image[] = [];
  private readonly animalSkins: Phaser.GameObjects.Image[] = [];
  private readonly cards: {
    button: Button;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    outline: Phaser.GameObjects.Image;
    badge: Phaser.GameObjects.Image;
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
      object.setName(name).setPosition(p.x, p.y);
      this.add(object);
      arrangeable(scene, 'wardrobe', name, p, object);
      return object;
    };
    place('board', 320, 180, addArt(scene, 0, 0, 'wardrobeBoard'));
    // The reference's rug is the shared foot baseline for the body and all layers.
    this.critterImage = place('previewBody', 205, 234, scene.add.image(0, 0, artKey('hedgehog')).setOrigin(0.5, 1));
    this.shoes = place('previewShoes', 205, 234, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1));
    this.coat = place('previewCoat', 205, 234, scene.add.image(0, 0, artKey('santaCoat')).setOrigin(0.5, 1));
    this.cape = place('previewCape', 205, 234, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1));
    this.hat = place('previewHat', 205, 234, scene.add.image(0, 0, artKey('santaHat')).setOrigin(0.5, 1));
    place('turnLeft', 147, 267, new Button(scene, 0, 0, 33, 30, '', COLORS.book, () => this.turn(-1)).setBackgroundVisible(false));
    place('turnRight', 251, 267, new Button(scene, 0, 0, 33, 30, '', COLORS.book, () => this.turn(1)).setBackgroundVisible(false));
    const tabSpecs = [
      ['hatsTab', 'hat', 'wardrobeTabHats', 353, 112],
      ['topsTab', 'top', 'wardrobeTabTops', 426, 112],
      ['capesTab', 'cape', 'wardrobeTabCapes', 499, 112],
      ['shoesTab', 'shoes', 'wardrobeTabShoes', 390, 139],
      ['animalTab', 'animal', 'wardrobeTabAnimal', 467, 139],
    ] as const;
    this.tabs = tabSpecs.map(([name, slot, art, x, y]) => {
      this.tabSkins.push(place(name + '.art', x, y, addArt(scene, 0, 0, art)));
      return place(name, x, y, new Button(scene, 0, 0, slot === 'animal' ? 73 : 69, 24, '', COLORS.book,
        () => this.select(slot)).setBackgroundVisible(false));
    });
    for (let i = 0; i < 4; i++) {
      const x = 370 + i % 2 * 113, y = 190 + Math.floor(i / 2) * 59;
      const button = place(`item.${i}.card`, x, y, new Button(scene, 0, 0, 108, 52, '', COLORS.paperEdge, () => this.toggleItem(i)).setBackgroundVisible(false));
      const outline = place(`item.${i}.outline`, x, y, addArt(scene, 0, 0, 'wardrobeCard'));
      const image = place(`item.${i}.picture`, x, y - 10, scene.add.image(0, 0, artKey('santaHat')));
      const label = place(`item.${i}.name`, x, y + 14, scene.add.text(0, 0, '', {
        ...TEXT.body, fontSize: '10px', align: 'center', wordWrap: { width: 98, useAdvancedWrap: true },
      }).setOrigin(0.5));
      const badge = place(`item.${i}.badge`, x + 43, y - 21, addArt(scene, 0, 0, 'wardrobeBadge'));
      const worn = place(`item.${i}.worn`, x + 43, y - 21, scene.add.text(0, 0, '', {
        ...TEXT.body, fontSize: '9px', color: '#493026', fontStyle: 'bold',
      }).setOrigin(0.5));
      this.cards.push({ button, image, label, outline, badge, worn });
    }
    PLAYER_ANIMALS.forEach((animal, i) => {
      const x = 330 + i % 2 * 113, y = 177 + Math.floor(i / 2) * 27;
      const sprite = SPRITE_ART[animal], size = spriteSize(sprite);
      const top = sprite.frames[0].findIndex(row => row.replaceAll('.', '').length > 0);
      // Native head crops keep seven choices legible without shrinking their pixels.
      const icon = place(`animal.${animal}.portrait`, x, y - 12 - top, scene.add.image(0, 0, artKey(animal)).setOrigin(0.5, 0)
        .setCrop(Math.max(0, Math.floor((size.width - 24) / 2)), top, Math.min(24, size.width), 24));
      const skin = place(`animal.${animal}.art`, x + 52, y, addArt(scene, 0, 0, 'wardrobeChoiceButton'));
      const button = place(`animal.${animal}.choose`, x + 52, y, new Button(scene, 0, 0, 69, 24, ANIMAL_NAMES[animal], COLORS.book, () => {
        setGameState(scene, changeAnimal(getGameState(scene), animal)); this.refresh();
      }).setFontSize(10).setBackgroundVisible(false));
      this.animalObjects.push(icon, skin, button); this.animalButtons.push(button); this.animalSkins.push(skin);
    });
    this.status = place('status', 121, 317, scene.add.text(0, 0, '', { ...TEXT.label, fontSize: '10px', color: '#ffe6b5' }).setOrigin(0, 0.5));
    const close = () => {
      // Finish pointer dispatch before removing the dim layer, avoiding a walk-through tap.
      scene.time.delayedCall(0, () => this.destroy());
    };
    place('close', 508, 316, new Button(scene, 0, 0, 78, 26, '', COLORS.reset, close).setBackgroundVisible(false));
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
    setGameState(this.scene, toggleClothing(state, item));
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
    image.setScale(Math.max(1, Math.min(2, Math.floor(94 / (Math.max(...xs) - Math.min(...xs) + 1)), Math.floor(24 / (Math.max(...ys) - Math.min(...ys) + 1)))));
  }

  private turn(direction: number): void {
    this.view = (this.view + direction + 4) % 4;
    for (const layer of [this.critterImage, this.shoes, this.coat, this.cape, this.hat]) layer.setFrame(this.view * 3);
  }

  private refresh(): void {
    const { animal, outfit, ownedClothing } = getGameState(this.scene);
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
      const owned = ownedClothing.includes(item);
      card.button.setEnabled(owned);
      card.image.setAlpha(owned ? 1 : 0.35);
      card.image.setTexture(artKey(clothingArt(animal, item)), 0);
      this.centreItem(card.image, animal, item);
      card.label.setText(CLOTHING[item].name);
      card.outline.setFrame(equipped ? 1 : 0);
      card.badge.setVisible(equipped || !owned);
      card.worn.setText(owned ? words.worn : words.locked).setFontSize(owned ? 10 : 8).setVisible(equipped || !owned);
    });
    for (const object of this.animalObjects) object.setVisible(choosingAnimal);
    this.animalButtons.forEach((button, i) => {
      button.setEnabled(PLAYER_ANIMALS[i] !== animal);
      this.animalSkins[i].setFrame(PLAYER_ANIMALS[i] === animal ? 1 : 0);
    });
    (['hat', 'top', 'cape', 'shoes', 'animal'] as const).forEach((slot, i) => {
      this.tabs[i].setEnabled(this.slot !== slot); this.tabSkins[i].setFrame(this.slot === slot ? 1 : 0);
    });
    this.status.setText(words.status.replace('{animal}', ANIMAL_NAMES[animal]));
  }
}
