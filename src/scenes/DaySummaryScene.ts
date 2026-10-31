import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { ingredientLines, summaryLines, type DayStats } from '../logic/dayStats';
import { Button } from '../ui/Button';
import { COLORS, TEXT } from '../ui/theme';
import { getGameState } from './gameStore';

const PANEL_WIDTH = 520;
// Tall enough for the two wage lines too (dayStats.ts summaryLines).
const PANEL_HEIGHT = 330;
/** Where the "Ingredients used" column starts, from the panel's left edge. */
const SECOND_COLUMN_X = 330;

/** What the floor hands the summary when the day is over. */
export interface DaySummaryRequest {
  stats: DayStats;
  /** "Exit cafe" was pressed; the summary has already closed. */
  onExit: () => void;
}

/**
 * End-of-day summary, shown as an overlay on top of the (empty, closed)
 * floor, like the prep station. "Exit cafe" leads to the world map.
 */
export class DaySummaryScene extends Phaser.Scene {
  private request!: DaySummaryRequest;

  constructor() {
    super('DaySummaryScene');
  }

  init(request: DaySummaryRequest): void {
    this.request = request;
  }

  create(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;
    const state = getGameState(this);

    // Interactive so taps on the dim layer don't reach the floor below.
    this.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.5).setOrigin(0).setInteractive();
    this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, COLORS.paper).setStrokeStyle(3, COLORS.ink);

    const top = cy - PANEL_HEIGHT / 2;
    const left = cx - PANEL_WIDTH / 2;
    const body = { ...TEXT.body, lineSpacing: 8 };
    this.add.text(cx, top + 20, `Day ${state.day} is over`, TEXT.heading).setOrigin(0.5, 0);
    this.add.text(left + 24, top + 56, summaryLines(this.request.stats, state.leaves), body);
    // Second column: there are up to one line per ingredient, too many to
    // stack under the totals.
    this.add.text(left + SECOND_COLUMN_X, top + 56, 'Ingredients used', { ...TEXT.body, fontStyle: 'bold' });
    this.add.text(left + SECOND_COLUMN_X, top + 80, ingredientLines(this.request.stats), body);

    const exit = new Button(this, cx, top + PANEL_HEIGHT - 32, 144, 32, 'Exit cafe', COLORS.serve, () =>
      this.exit(),
    );
    // Enter works too, through the button like every other shortcut.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) exit.press();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    });
  }

  private exit(): void {
    this.scene.stop();
    this.request.onExit();
  }
}
