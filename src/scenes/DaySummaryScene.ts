import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { summaryLines, type DayStats } from '../logic/dayStats';
import { Button } from '../ui/Button';
import { COLORS, TEXT } from '../ui/theme';
import { getGameState } from './gameStore';

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 220;

/** What the floor hands the summary when the day is over. */
export interface DaySummaryRequest {
  stats: DayStats;
  /** "Start next day" was pressed; the summary has already closed. */
  onNextDay: () => void;
}

/**
 * End-of-day summary, shown as an overlay on top of the (empty, closed)
 * floor, like the prep station. Milestone 5 swaps "Start next day" for
 * "Exit cafe", which opens the world map.
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
    this.add.text(cx, top + 20, `Day ${state.day} is over`, TEXT.heading).setOrigin(0.5, 0);
    this.add
      .text(cx - PANEL_WIDTH / 2 + 28, top + 56, summaryLines(this.request.stats, state.leaves), {
        ...TEXT.body,
        lineSpacing: 8,
      })
      .setOrigin(0, 0);

    const next = new Button(this, cx, top + PANEL_HEIGHT - 32, 176, 32, 'Start next day', COLORS.serve, () =>
      this.nextDay(),
    );
    // Enter works too, through the button like every other shortcut.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) next.press();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    });
  }

  private nextDay(): void {
    this.scene.stop();
    this.request.onNextDay();
  }
}
