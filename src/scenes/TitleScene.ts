import Phaser from 'phaser';
import landing from '../assets/title/source/landing.png';
import words from '../data/texts/title.json';
import { getSoundSettings, onSoundSettings, setSoundSettings } from '../audio/audio';
import { volumeLabel } from '../audio/soundSettings';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import { arrangeable } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import type { GameState } from '../logic/gameState';
import { Button } from '../ui/Button';
import { LeafText } from '../ui/LeafText';
import { promptPlayerName } from '../ui/PlayerNamePrompt';
import { TitleMenuPanel } from '../ui/TitleMenuPanel';
import { COLORS, TEXT } from '../ui/theme';
import { continueGame, readSave, startNewGame, setGameState } from './gameStore';
import type { WorldMapRequest } from './WorldMapScene';

const at = (name: string, x: number, y: number) => layoutPoint('title', name, { x, y });
const LANDING_KEY = 'title:landing';

/** Approved illustration with hit areas; save choices stay behind Start Game. */
export class TitleScene extends Phaser.Scene {
  private panel: TitleMenuPanel | null = null;
  private confirmOpen = false;
  private closingPanel = false;

  constructor() {
    super('TitleScene');
  }

  preload(): void {
    this.load.image(LANDING_KEY, landing);
  }

  create(): void {
    this.panel = null;
    this.confirmOpen = false;
    this.closingPanel = false;
    // The illustration is full-resolution artwork, like the journal images.
    this.textures.get(LANDING_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = at('landing', 320, 180);
    const art = this.add.image(background.x, background.y, LANDING_KEY).setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    arrangeable(this, 'title', 'landing', background, art);

    const start = this.menuButton('startGame', 320, 198, 182, 34, () => this.showStartMenu());
    this.menuButton('settings', 320, 237, 158, 30, () => this.showSettings());
    this.menuButton('credits', 320, 273, 158, 30, () => this.showMessage('creditsPanel', words.credits, words.creditsBody));
    this.menuButton('quit', 320, 310, 158, 30, () => this.showMessage('quitPanel', words.quit, words.quitBody));

    // Gameplay controls would cover the supplied border and must not intercept menu clicks.
    const hudWasActive = this.scene.isActive('HudScene');
    const hudWasVisible = this.scene.isVisible('HudScene');
    if (hudWasActive) this.scene.pause('HudScene');
    this.scene.setVisible(false, 'HudScene');
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter' && !this.confirmOpen) start.press();
      if (event.key === 'Escape' && this.panel) this.closePanel();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);
      if (hudWasActive && this.scene.isPaused('HudScene')) this.scene.resume('HudScene');
      this.scene.setVisible(hudWasVisible, 'HudScene');
    });
  }

  private menuButton(name: string, x: number, y: number, width: number, height: number, action: () => void): Button {
    const point = at(name, x, y);
    // The supplied PNG already contains the button, icon and text.
    const button = new Button(this, point.x, point.y, width, height, '', COLORS.paper, () => {
      if (!this.confirmOpen) action();
    }).setBackgroundVisible(false);
    button.setName(name);
    arrangeable(this, 'title', name, point, button);
    return button;
  }

  private openPanel(name: string, heading: string): TitleMenuPanel {
    this.confirmOpen = true;
    const panel = new TitleMenuPanel(this, name, heading);
    this.panel = panel;
    return panel;
  }

  private backButton(panel: TitleMenuPanel): void {
    panel.button('back', 320, 272, words.back, () => this.closePanel(), COLORS.reset);
    panel.finishLayout();
  }

  private closePanel(after?: () => void): void {
    if (!this.panel || this.closingPanel) return;
    this.closingPanel = true;
    // Defer destruction so the release/key that closes a panel cannot also press the menu below.
    this.time.delayedCall(0, () => {
      this.panel?.destroy();
      this.panel = null;
      this.closingPanel = false;
      this.confirmOpen = false;
      after?.();
    });
  }

  private showStartMenu(): void {
    const panel = this.openPanel('startPanel', words.start);
    const save = readSave();
    if (save?.ok) {
      const saved = save.state;
      const point = panel.point('saved', 320, 124);
      panel.add(new LeafText(this, point.x, point.y,
        words.saved.replace('{day}', String(saved.day)).replace('{leaves}', String(saved.leaves)),
        { ...TEXT.body, fontSize: '14px' }, 0.5, 0));
      panel.button('continue', 320, 166, words.continue, () => this.closePanel(() => this.continueFrom(saved)), COLORS.serve);
      panel.button('newGame', 320, 216, words.newGame, () => this.closePanel(() => this.confirmNewGame(saved.day)), COLORS.reset);
    } else {
      panel.text('note', 320, 122, save ? words.unreadable.replace('{reason}', save.reason) : words.empty).setFontSize(12);
      panel.button('newGame', 320, 216, words.newGame,
        () => this.closePanel(() => save ? this.confirmNewGame(null) : this.newGame()), COLORS.serve);
    }
    this.backButton(panel);
  }

  private showSettings(): void {
    const panel = this.openPanel('settingsPanel', words.settings);
    const label = panel.text('volume', 320, 122, '');
    const point = panel.point('slider', 320, 166);
    const track = this.add.rectangle(point.x, point.y, 180, 6, COLORS.disabled);
    const fill = this.add.rectangle(point.x - 90, point.y, 0, 6, COLORS.serve).setOrigin(0, 0.5);
    const knob = this.add.rectangle(point.x, point.y, 10, 18, COLORS.paper).setStrokeStyle(2, COLORS.ink);
    const hit = this.add.zone(point.x, point.y, 200, 28).setInteractive({ useHandCursor: true });
    panel.add([track, fill, knob, hit]);
    this.input.setDraggable(hit);
    const slide = (pointer: Phaser.Input.Pointer) => {
      const local = hit.getWorldTransformMatrix().applyInverse(pointer.worldX, pointer.worldY);
      const volume = Math.round(Phaser.Math.Clamp((local.x + 90) / 180, 0, 1) * 100) / 100;
      setSoundSettings({ volume, muted: false });
    };
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, slide);
    hit.on(Phaser.Input.Events.GAMEOBJECT_DRAG, slide);
    const mute = panel.button('mute', 320, 216, '', () => {
      const settings = getSoundSettings();
      setSoundSettings({ ...settings, muted: !settings.muted });
    });
    panel.text('hint', 320, 190, words.soundHint).setFontSize(10);
    this.backButton(panel);
    const refresh = () => {
      const settings = getSoundSettings();
      const volume = settings.muted ? 0 : settings.volume;
      label.setText(words.volume.replace('{volume}', volumeLabel(settings)));
      mute.setText(settings.muted ? words.unmute : words.mute);
      // Track coordinates include any Arrange offset applied to the panel's children.
      fill.setPosition(track.x - 90, track.y).setSize(Math.round(180 * volume), 6);
      knob.setPosition(track.x - 90 + Math.round(180 * volume), track.y);
    };
    const stop = onSoundSettings(refresh);
    panel.once(Phaser.GameObjects.Events.DESTROY, stop);
    refresh();
  }

  private showMessage(name: string, heading: string, body: string): void {
    const panel = this.openPanel(name, heading);
    panel.text('body', 320, 124, body).setFontSize(12);
    this.backButton(panel);
  }

  private continueFrom(state: GameState): void {
    if (!state.playerName) {
      this.askName(name => {
        const named = { ...state, playerName: name };
        continueGame(this, named);
        setGameState(this, named);
        this.continueFrom(named);
      });
      return;
    }
    continueGame(this, state);
    const request: WorldMapRequest = { current: 'cafe' };
    this.scene.start('WorldMapScene', request);
  }

  private newGame(): void {
    this.askName(name => {
      startNewGame(this, name);
      this.scene.start('FloorScene');
    });
  }

  private askName(accept: (name: string) => void): void {
    this.confirmOpen = true;
    promptPlayerName(this, name => { this.confirmOpen = false; accept(name); }, () => { this.confirmOpen = false; });
  }

  private confirmNewGame(savedDay: number | null): void {
    const panel = this.openPanel('confirmPanel', words.confirm);
    panel.text('note', 320, 130, savedDay === null ? words.replaceUnreadable : words.replace.replace('{day}', String(savedDay))).setFontSize(12);
    panel.button('newGame', 320, 212, words.newGame, () => this.closePanel(() => this.newGame()), COLORS.reset);
    panel.button('keep', 320, 272, words.keep, () => this.closePanel());
    panel.finishLayout();
  }
}
