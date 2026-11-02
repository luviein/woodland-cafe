import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import type { GameState } from '../logic/gameState';
import { addArt } from '../ui/art';
import { LeafText } from '../ui/LeafText';
import { VIEW, viewFrame } from '../art/sprites/sheetCritters';
import { Button } from '../ui/Button';
import { addGround, addStanding, addTree } from '../ui/sprites';
import { COLORS, TEXT, css } from '../ui/theme';
import { continueGame, readSave, startNewGame } from './gameStore';
import type { WorldMapRequest } from './WorldMapScene';

/**
 * The first screen (GAME_DESIGN.md §6.1): Continue from the one save slot,
 * or start a New game. A save that can't be loaded is explained here, never
 * half-loaded.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.confirmOpen = false; // a scene object is reused when started again
    const cx = BASE_WIDTH / 2;
    this.drawScene();
    // Light text with a dark outline, so it reads on the grass.
    const outlined = { stroke: css(COLORS.ink), strokeThickness: 4 };
    this.add
      .text(cx, 90, 'Woodland Cafe', { ...TEXT.heading, fontSize: '32px', color: css(COLORS.paper), ...outlined })
      .setOrigin(0.5);
    this.add
      .text(cx, 124, 'A cozy cafe for woodland critters', { ...TEXT.body, color: css(COLORS.paper), ...outlined })
      .setOrigin(0.5);

    const save = readSave();
    let primary: Button;
    if (save?.ok) {
      const saved = save.state;
      primary = new Button(this, cx, 196, 180, 34, 'Continue', COLORS.serve, () => this.continueFrom(saved));
      new LeafText(this, cx, 222, `Day ${saved.day} done · 🍃 ${saved.leaves}`, { ...TEXT.label, fontSize: '14px', stroke: css(COLORS.ink), strokeThickness: 3 }, 0.5, 0);
      new Button(this, cx, 270, 180, 30, 'New game', COLORS.reset, () => this.confirmNewGame(saved.day));
    } else {
      if (save && !save.ok) {
        // Broken or from a newer version: say why, and that New game replaces it.
        this.add
          .text(cx, 166, `${save.reason}\nNew game will replace it.`, {
            ...TEXT.body,
            color: css(COLORS.statusImpatient),
            stroke: css(COLORS.ink),
            strokeThickness: 3,
            align: 'center',
          })
          .setOrigin(0.5);
      }
      primary = new Button(this, cx, 220, 180, 34, 'New game', COLORS.serve, () => this.newGame());
    }

    // Enter presses the main button, through the button like other shortcuts.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat && !this.confirmOpen) primary.press();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey),
    );
  }

  /**
   * The picture behind the menu: the cafe cottage on the left, its owner
   * the hedgehog greeting a fox on the right, trees around. Everything at 2x
   * (whole-number scaling keeps the pixels square).
   */
  private drawScene(): void {
    addGround(this, 'grass');
    const ground = BASE_HEIGHT - 24;
    addTree(this, 24, ground - 30, 'pine');
    addTree(this, 196, ground - 40, 'oak');
    addTree(this, 616, ground - 36, 'pine');
    addStanding(this, 110, ground, 'cafeHouse').setScale(2);
    addTree(this, 586, ground + 8, 'oak');
    // The fox faces right (the art's way), toward the hedgehog, who faces it back with its left view.
    addArt(this, 460, ground, 'fox', viewFrame(VIEW.right)).setOrigin(0.5, 1).setScale(2);
    addArt(this, 520, ground, 'hedgehog', viewFrame(VIEW.left)).setOrigin(0.5, 1).setScale(2);
  }

  /** True while "Start a new game?" is showing, so Enter doesn't press Continue behind it. */
  private confirmOpen = false;

  private continueFrom(state: GameState): void {
    continueGame(this, state);
    // Between days, so the map: the cafe is where the next day starts.
    const request: WorldMapRequest = { current: 'cafe' };
    this.scene.start('WorldMapScene', request);
  }

  private newGame(): void {
    startNewGame(this);
    this.scene.start('FloorScene');
  }

  /** New game deletes the save, so ask first (Esc / No to back out). */
  private confirmNewGame(savedDay: number): void {
    this.confirmOpen = true;
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;
    const width = 360;
    const height = 120;
    const top = cy - height / 2;
    const dim = this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.5).setOrigin(0).setInteractive();
    const panel = this.add.rectangle(cx, cy, width, height, COLORS.paper).setStrokeStyle(3, COLORS.ink);
    const title = this.add.text(cx, top + 18, 'Start a new game?', TEXT.heading).setOrigin(0.5, 0);
    const note = this.add
      .text(cx, top + 42, `Your saved game (Day ${savedDay}) will be deleted.`, TEXT.body)
      .setOrigin(0.5, 0);
    const yes = new Button(this, cx - 70, top + height - 28, 120, 30, 'New game', COLORS.reset, () => this.newGame());
    const no = new Button(this, cx + 70, top + height - 28, 120, 30, 'Keep it', COLORS.serve, () => close());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') no.press();
    };
    const close = () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
      for (const o of [dim, panel, title, note, yes, no]) o.destroy();
      // After this key event is done, so the same Enter can't also press Continue.
      this.time.delayedCall(0, () => (this.confirmOpen = false));
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey),
    );
  }
}
