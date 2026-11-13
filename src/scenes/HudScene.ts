import Phaser from 'phaser';
import { getSoundSettings, onSoundSettings, playSound, setSoundSettings } from '../audio/audio';
import { volumeLabel } from '../audio/soundSettings';
import { addArt } from '../ui/art';
import { Button } from '../ui/Button';
import { NotesPanel } from '../ui/NotesPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import inventoryWords from '../data/texts/inventory.json';
import { inventoryButton as inventoryButtonAt, notesButton as notesButtonAt, speakerButton } from '../ui/hudLayout';
import { arrangeable } from '../layout/arrangeable';
import { getGameState, watchGameState } from './gameStore';
import { COLORS, TEXT } from '../ui/theme';

/** The volume panel: opening up and to the right of the speaker button. */
const PANEL = { dx: 18, dy: -32, width: 176, height: 30 };
/** The slider's track, inside the panel. */
const TRACK = { left: 34, width: 100 };

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
  private inventory: { panel: InventoryPanel; paused: string[] } | null = null;
  private inventoryButton!: Button;
  private closingInventory = false;

  constructor() {
    super('HudScene');
  }

  create(): void {
    const icon = speakerButton();
    this.speakerIcon = addArt(this, 0, 0, 'speaker');
    const speaker = new Button(this, icon.x, icon.y, icon.size, icon.size, '', COLORS.book, () =>
      this.panel.setVisible(!this.panel.visible),
    ).setIcon(this.speakerIcon);

    // Only once Grandma has shown it at her farewell (GAME_DESIGN.md §5.9):
    // during the tutorial she does the explaining, and it would sit on her box.
    const notesAt = notesButtonAt();
    const notesButton = new Button(this, notesAt.x, notesAt.y, notesAt.size, notesAt.size, '?', COLORS.book, () =>
      this.toggleNotes(),
    );
    const inventoryAt = inventoryButtonAt();
    this.inventoryButton = new Button(this, inventoryAt.x, inventoryAt.y, inventoryAt.width, inventoryAt.height,
      '', COLORS.book, () => this.toggleInventory()).setIcon(addArt(this, 0, 0, 'gardenWorkTools', 2)).setVisible(false);
    this.inventoryButton.setName(inventoryWords.button);
    watchGameState(this, (state) => {
      notesButton.setVisible(state.tutorial === 'farewell' || state.tutorial === 'done');
      this.inventory?.panel.refresh(state);
    });
    // Esc closes the notes (the game underneath is paused, so it won't hear it).
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.notes) this.toggleNotes();
      else if (event.key === 'Escape' && this.inventory) this.toggleInventory();
    };
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onKey);

    this.createPanel(icon);
    // Arrange mode: the corner buttons, on every screen; the volume panel goes with the speaker.
    arrangeable(this, 'hud', 'speaker', icon, speaker, this.panel);
    arrangeable(this, 'hud', 'notes', notesAt, notesButton);
    arrangeable(this, 'hud', 'inventory', inventoryAt, this.inventoryButton);
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

  update(): void {
    const playing = this.scene.manager.getScenes(true).some(scene =>
      !['HudScene', 'BootScene', 'TitleScene'].includes(scene.scene.key));
    this.inventoryButton.setVisible(playing && getGameState(this).tutorial === 'done' && !this.notes && !this.inventory);
  }

  private toggleInventory(): void {
    if (this.closingInventory || this.notes) return;
    if (this.inventory) {
      this.closingInventory = true;
      const inventory = this.inventory;
      // Resume after the input event so closing cannot also click or leave the map below.
      this.time.delayedCall(0, () => {
        inventory.panel.destroy();
        for (const key of inventory.paused) if (this.scene.isPaused(key)) this.scene.resume(key);
        this.inventory = null;
        this.closingInventory = false;
      });
      return;
    }
    this.panel.setVisible(false);
    const paused = this.scene.manager.getScenes(true).filter(scene => scene !== this).map(scene => scene.scene.key);
    for (const key of paused) this.scene.pause(key);
    this.inventory = { panel: new InventoryPanel(this, () => this.toggleInventory()), paused };
  }

  /**
   * Opens or closes Grandma's notes. While open, every other running scene
   * is paused (nothing moves, no patience runs out) and resumed on close.
   */
  private toggleNotes(): void {
    if (this.inventory) return;
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
  private createPanel(speaker: { x: number; y: number }): void {
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

    const trackLeft = TRACK.left;
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

    this.panel = this.add
      .container(speaker.x + PANEL.dx, speaker.y + PANEL.dy, [bg, mute, track, this.fill, hit, this.knob, this.label])
      .setVisible(false);
  }

  /** Sets the volume from a screen x on the track (clamped to its ends). */
  private slideTo(screenX: number): void {
    const volume = Phaser.Math.Clamp((screenX - this.panel.x - TRACK.left) / TRACK.width, 0, 1);
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
    this.knob.setX(TRACK.left + Math.round(shown * TRACK.width));
    this.fill.setSize(Math.round(shown * TRACK.width), 4);
    this.label.setText(volumeLabel(settings));
  }
}
