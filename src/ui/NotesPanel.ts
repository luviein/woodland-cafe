import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { NOTES } from '../data/tutorial';
import { addArt } from './art';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

const WIDTH = 520;
const HEIGHT = 280;
const TOPIC = { width: 132, height: 26, gap: 4 };

/**
 * Grandma's notes (GAME_DESIGN.md §5.9): everything she explained, by
 * topic, to read again any time. Topics down the left, the chosen one's
 * lines on the right. Drawn by the HUD scene over everything; the scene
 * that opens it pauses the game underneath.
 */
export class NotesPanel extends Phaser.GameObjects.Container {
  private readonly notesText: Phaser.GameObjects.Text;
  private readonly topics: Button[] = [];

  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, 0, 0);
    const left = (BASE_WIDTH - WIDTH) / 2;
    const top = (BASE_HEIGHT - HEIGHT) / 2;

    // Interactive so taps on the dim layer don't reach anything underneath.
    const dim = scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.6).setOrigin(0).setInteractive();
    const panel = scene.add.rectangle(left, top, WIDTH, HEIGHT, COLORS.paper).setOrigin(0).setStrokeStyle(3, COLORS.ink);
    const portrait = addArt(scene, left + 12, top + 6, 'badger').setOrigin(0);
    const title = scene.add.text(left + 48, top + 22, "Grandma's notes", TEXT.heading).setOrigin(0, 0.5);

    const textLeft = left + 24 + TOPIC.width;
    // The small font, so the longest topic still fits the panel.
    this.notesText = scene.add.text(textLeft, top + 64, '', {
      ...TEXT.label,
      color: TEXT.body.color,
      wordWrap: { width: left + WIDTH - 16 - textLeft, useAdvancedWrap: true },
      lineSpacing: 3,
    });

    NOTES.forEach((note, i) => {
      const y = top + 64 + TOPIC.height / 2 + i * (TOPIC.height + TOPIC.gap);
      this.topics.push(
        new Button(scene, left + 12 + TOPIC.width / 2, y, TOPIC.width, TOPIC.height, note.title, COLORS.book, () =>
          this.showTopic(i),
        ),
      );
    });
    const close = new Button(scene, left + WIDTH - 56, top + 22, 88, 26, 'Close', COLORS.reset, onClose);

    this.add([dim, panel, portrait, title, this.notesText, ...this.topics, close]);
    scene.add.existing(this);
    this.showTopic(0);
  }

  /** Shows one topic's lines, and marks its button as the one picked. */
  private showTopic(index: number): void {
    this.notesText.setText(NOTES[index].lines.join('\n\n'));
    this.topics.forEach((button, i) => button.setAlpha(i === index ? 1 : 0.7));
  }
}
