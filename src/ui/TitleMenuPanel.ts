import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

/** Shared title overlays keep their dim layer fixed when moved in Arrange mode. */
export class TitleMenuPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, private readonly panelName: string, heading: string) {
    super(scene, 0, 0);
    const dim = scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.6).setOrigin(0).setInteractive();
    this.add(dim);
    const box = this.point('box', 320, 180);
    this.add(scene.add.rectangle(box.x, box.y, 360, 240, COLORS.paper).setStrokeStyle(3, COLORS.ink).setInteractive());
    this.text('heading', 320, 84, heading, true);
    scene.add.existing(this);
    this.setDepth(100);
  }

  point(name: string, x: number, y: number) {
    return layoutPoint('title', `${this.panelName}.${name}`, { x, y });
  }

  text(name: string, x: number, y: number, text: string, heading = false): Phaser.GameObjects.Text {
    const point = this.point(name, x, y);
    const object = this.scene.add.text(point.x, point.y, text, {
      ...(heading ? TEXT.heading : TEXT.body), align: 'center',
      wordWrap: { width: 312 }, lineSpacing: 4,
    }).setOrigin(0.5, 0);
    this.add(object);
    return object;
  }

  button(name: string, x: number, y: number, label: string, action: () => void, color: number = COLORS.book): Button {
    const point = this.point(name, x, y);
    const button = new Button(this.scene, point.x, point.y, 180, 30, label, color, action);
    this.add(button);
    return button;
  }

  finishLayout(): void {
    arrangeablePanel(this.scene, 'title', this.panelName, this);
  }
}
