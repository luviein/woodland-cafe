import Phaser from 'phaser';
import { getSoundSettings, onSoundSettings, playSound, setSoundSettings } from '../audio/audio';
import { volumeLabel } from '../audio/soundSettings';
import { BASE_HEIGHT } from '../config/display';
import { addArt } from '../ui/art';
import { Button } from '../ui/Button';
import { NotesPanel } from '../ui/NotesPanel';
import { COLORS, TEXT } from '../ui/theme';

/** The speaker button's centre: the bottom-left corner, clear of every screen's own buttons. */
const ICON = { x: 16, y: BASE_HEIGHT - 16, size: 22 };
/** Grandma's notes button, just right of the speaker. */
const NOTES_ICON = { x: ICON.x + ICON.size + 4, y: ICON.y };
const PANEL = { x: 34, y: BASE_HEIGHT - 48, width: 176, height: 30 };
const TRACK = { x: PANEL.x + 34, width: 100 };

/**
 * The corner buttons on every screen: the volume control (GAME_DESIGN.md
 * §8.4) and Grandma's notes (§5.9). A scene of its own, launched once at
 * boot and kept running: it's last in main.ts's scene list, so it's always
 * drawn on top, and taps on its few objects never reach the scene
 * underneath (Phaser gives a tap to the topmost thing hit).
 */
export class HudScene extends Phaser.Scene {
  private speakerIcon!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Container;
  private muteIcon!: Phaser.GameObjects.Image;
  private knob!: Phaser.GameObjects.Rectangle;
  private fill!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  /** Grandma's notes while open, and the scenes paused underneath meanwhile. */
  private notes: { panel: NotesPanel; paused: string[] } | null = null;

  constructor() {
    super('HudScene');
  }

  create(): void {
    this.speakerIcon = addArt(this, 0, 0, 'speaker');
    new Button(this, ICON.x, ICON.y, ICON.size, ICON.size, '', COLORS.book, () =>
      this.panel.setVisible(!this.panel.visible),
    ).setIcon(this.speakerIcon);

    new Button(this, NOTES_ICON.x, NOTES_ICON.y, ICON.size, ICON.size, '?', COLORS.book, () => this.toggleNotes());
    // Esc closes the notes (the game underneath is paused, so it won't hear it).
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.notes) this.toggleNotes();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);

    this.createPanel();
    // A tap anywhere else closes the panel. (Scene-wide: it hears taps
    // even when they land on the scene below.)
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.panel.setVisible(false);
    });

    this.show();
    // M (main.ts) can change the settings from anywhere: follow along.
    const stop = onSoundSettings(() => this.show());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
  }

  /**
   * Opens or closes Grandma's notes. While open, every other running scene
   * is paused (nothing moves, no patience runs out) and resumed on close.
   */
  private toggleNotes(): void {
    if (this.notes) {
      this.notes.panel.destroy();
      for (const key of this.notes.paused) this.scene.resume(key);
      this.notes = null;
      return;
    }
    this.panel.setVisible(false);
    const paused = this.scene.manager
      .getScenes(true)
      .filter((s) => s !== this)
      .map((s) => s.scene.key);
    for (const key of paused) this.scene.pause(key);
    this.notes = { panel: new NotesPanel(this, () => this.toggleNotes()), paused };
  }

  /** Mute button, then the slider track with its fill and knob, then "60%". */
  private createPanel(): void {
    const cy = PANEL.height / 2;
    const bg = this.add
      .rectangle(0, 0, PANEL.width, PANEL.height, COLORS.paper)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.ink)
      .setInteractive(); // so a tap between the controls doesn't count as "elsewhere"
    this.muteIcon = addArt(this, 0, 0, 'speaker');
    const mute = new Button(this, 16, cy, 22, 22, '', COLORS.book, () =>
      setSoundSettings({ ...getSoundSettings(), muted: !getSoundSettings().muted }),
    ).setIcon(this.muteIcon);

    const trackLeft = TRACK.x - PANEL.x;
    const track = this.add.rectangle(trackLeft, cy, TRACK.width, 4, COLORS.disabled).setOrigin(0, 0.5);
    this.fill = this.add.rectangle(trackLeft, cy, 0, 4, COLORS.serve).setOrigin(0, 0.5);
    // A taller invisible strip over the track, so it's easy to hit with a finger.
    const hit = this.add.zone(trackLeft - 6, 0, TRACK.width + 12, PANEL.height).setOrigin(0).setInteractive({ useHandCursor: true });
    this.knob = this.add.rectangle(trackLeft, cy, 8, 16, COLORS.paper).setStrokeStyle(2, COLORS.ink).setInteractive({ useHandCursor: true });
    this.input.setDraggable(this.knob);
    this.label = this.add.text(trackLeft + TRACK.width + 8, cy, '', TEXT.body).setOrigin(0, 0.5);

    // Tap the track to jump there; drag the knob to slide. Moving the slider
    // also unmutes: you clearly want to hear it.
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.slideTo(pointer.x));
    this.knob.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (pointer: Phaser.Input.Pointer) => this.slideTo(pointer.x));
    // A blip at the new volume once you let go, to hear what it sounds like.
    this.knob.on(Phaser.Input.Events.GAMEOBJECT_DRAG_END, () => playSound('tap'));
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => playSound('tap'));

    this.panel = this.add.container(PANEL.x, PANEL.y, [bg, mute, track, this.fill, hit, this.knob, this.label]).setVisible(false);
  }

  /** Sets the volume from a screen x on the track (clamped to its ends). */
  private slideTo(screenX: number): void {
    const volume = Phaser.Math.Clamp((screenX - TRACK.x) / TRACK.width, 0, 1);
    // Whole percents, so the label and the stored setting stay tidy.
    setSoundSettings({ volume: Math.round(volume * 100) / 100, muted: false });
  }

  /** Puts the icons, slider and label in line with the current settings. */
  private show(): void {
    const settings = getSoundSettings();
    const frame = settings.muted ? 1 : 0;
    this.speakerIcon.setFrame(frame);
    this.muteIcon.setFrame(frame);
    // Muted shows as 0, but the volume itself is kept, so unmuting brings it back.
    const shown = settings.muted ? 0 : settings.volume;
    this.knob.setX(TRACK.x - PANEL.x + Math.round(shown * TRACK.width));
    this.fill.setSize(Math.round(shown * TRACK.width), 4);
    this.label.setText(volumeLabel(settings));
  }
}
