import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { CHRISTMAS_VENDOR } from '../data/stallVendors';
import words from '../data/texts/christmasMerchant.json';
import { layoutPoint } from '../layout/positions';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

export type MerchantChoice = 'buy' | 'sell' | 'goodbye';

/** A framed conversation with the existing deer, rather than a new character. */
export class ChristmasMerchantPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, choose: (choice: MerchantChoice) => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('christmasMerchant');
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.35).setOrigin(0).setInteractive());
    const place = <T extends Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Image | Button>(name: string, x: number, y: number, object: T): T => {
      const at = layoutPoint('christmasDialogue', name, { x, y });
      object.setName(name).setPosition(at.x, at.y);
      this.add(object);
      arrangeable(scene, 'christmasDialogue', name, at, object);
      return object;
    };
    place('frame', 320, 267, scene.add.rectangle(0, 0, 608, 166, 0xa95f37).setStrokeStyle(4, COLORS.ink));
    place('paper', 320, 267, scene.add.rectangle(0, 0, 592, 150, 0xffd795).setStrokeStyle(2, 0xe9ac69));
    place('portraitFrame', 112, 264, scene.add.rectangle(0, 0, 128, 136, 0xbc7846).setStrokeStyle(3, COLORS.ink));
    place('portraitPaper', 112, 251, scene.add.rectangle(0, 0, 114, 98, 0xf2c57e).setStrokeStyle(2, 0xffe3a7));
    // Keep the familiar face, antlers and Santa hat at an integer pixel scale.
    place('portrait', 70, 204, addArt(scene, 0, 0, CHRISTMAS_VENDOR.art).setOrigin(0).setCrop(0, 0, 28, 28).setScale(3));
    place('nameplate', 112, 318, scene.add.rectangle(0, 0, 116, 20, 0xffdfaa).setStrokeStyle(2, 0xe9ac69));
    place('name', 112, 318, scene.add.text(0, 0, words.name, { ...TEXT.body, fontSize: '9px', fontStyle: 'bold' }).setOrigin(0.5));
    place('greeting', 198, 211, scene.add.text(0, 0, words.greeting, {
      ...TEXT.body, fontSize: '14px', wordWrap: { width: 390 }, lineSpacing: 4,
    }));
    let chosen = false;
    const finish = (choice: MerchantChoice) => {
      if (chosen) return;
      chosen = true;
      choose(choice);
    };
    (['buy', 'sell', 'goodbye'] as const).forEach((choice, i) => {
      place(`choice.${choice}`, 254 + i * 126, 311, new Button(scene, 0, 0, 110, 26,
        words[choice], choice === 'goodbye' ? COLORS.reset : COLORS.serve, () => finish(choice)).setFontSize(13));
    });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') finish('goodbye'); };
    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey));
    arrangeablePanel(scene, 'christmasDialogue', 'panel', this);
  }
}
