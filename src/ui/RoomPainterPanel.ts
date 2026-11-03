import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { FLOOR_FINISHES, WALL_FINISHES, finishArt, type RoomSurface } from '../data/roomFinishes';
import { buildLayout } from '../logic/furniture';
import { paintFinish } from '../logic/roomDecorating';
import { artKey } from './art';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import type { Point } from '../logic/layout';
import { getGameState, setGameState } from '../scenes/gameStore';
import { addCafeCanvas, drawCafeTiles } from './cafeTiles';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

const PREVIEW_SCALE = 0.75;

/** A draft stays local until Apply, so Cancel never changes the saved cafe. */
export class RoomPainterPanel extends Phaser.GameObjects.Container {
  private finishes: string[];
  private surface: RoomSurface = 'floor';
  private style = 0;
  private history: string[][] = [];
  private stroke: string[] | null = null;
  private canvas: Phaser.GameObjects.RenderTexture;
  private status: Phaser.GameObjects.Text;
  private undo: Button;
  private swatches: { button: Button; image: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private tabs: Button[] = [];
  private grid: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(100000).setName('roomPainter');
    this.finishes = [...getGameState(scene).roomFinishes];
    this.add(scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.wall).setOrigin(0).setInteractive());
    const place = <T extends Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject>(name: string, x: number, y: number, object: T): T => {
      const point = layoutPoint('roomPainter', name, { x, y });
      object.setPosition(point.x, point.y);
      this.add(object);
      arrangeable(scene, 'roomPainter', name, point, object);
      return object;
    };
    place('title', 320, 15, scene.add.text(0, 0, 'Paint your cafe', TEXT.heading).setOrigin(0.5));
    this.canvas = addCafeCanvas(scene).setScale(PREVIEW_SCALE);
    this.grid = scene.add.zone(0, 0, 576 * PREVIEW_SCALE, 288 * PREVIEW_SCALE).setOrigin(0).setInteractive();
    const preview = scene.add.container(0, 0, [this.canvas, this.grid]);
    place('preview', 12, 44, preview);
    (['floor', 'wall'] as const).forEach((surface, i) => {
      this.tabs.push(place(surface + 'Tab', 487 + i * 94, 46,
        new Button(scene, 0, 0, 86, 23, surface === 'floor' ? 'Floor' : 'Wall', COLORS.book, () => {
          this.finishStroke(); this.surface = surface; this.style = 0; this.refresh();
        })));
    });
    for (let i = 0; i < FLOOR_FINISHES.length; i++) {
      const button = place('swatch-' + i, 487 + i % 2 * 94, 88 + Math.floor(i / 2) * 49,
        new Button(scene, 0, 0, 86, 43, '', COLORS.book, () => {
          this.finishStroke(); this.style = i; this.refresh();
        }));
      const image = scene.add.image(0, -6, artKey('floor')).setDisplaySize(24, 24);
      const label = scene.add.text(0, 13, '', { ...TEXT.label, fontSize: '9px' }).setOrigin(0.5);
      button.add([image, label]);
      this.swatches.push({ button, image, label });
    }
    this.status = place('status', 14, 270, scene.add.text(0, 0, '', { ...TEXT.label, wordWrap: { width: 612 } }));
    this.undo = place('undoAction', 180, 334, new Button(scene, 0, 0, 100, 28, 'Undo', COLORS.book, () => this.undoStroke()));
    place('cancel', 452, 334, new Button(scene, 0, 0, 100, 28, 'Cancel', COLORS.reset, close));
    place('apply', 568, 334, new Button(scene, 0, 0, 112, 28, 'Apply', COLORS.serve, () => {
      this.finishStroke();
      setGameState(scene, { ...getGameState(scene), roomFinishes: [...this.finishes] });
      close();
    }));
    const paint = (pointer: Phaser.Input.Pointer) => {
      if (!this.stroke) return;
      const local = this.grid.getWorldTransformMatrix().applyInverse(pointer.worldX, pointer.worldY);
      const tile: Point = { x: Math.floor(local.x / (TILE_SIZE * PREVIEW_SCALE)), y: Math.floor(local.y / (TILE_SIZE * PREVIEW_SCALE)) };
      this.finishes = paintFinish(getGameState(scene).room, this.finishes, tile, this.surface, this.style);
      this.refresh();
    };
    this.grid.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.finishStroke(); this.stroke = [...this.finishes]; paint(pointer);
    });
    const move = (pointer: Phaser.Input.Pointer) => { if (pointer.isDown) paint(pointer); else this.finishStroke(); };
    const up = () => this.finishStroke();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); this.undoStroke(); }
    };
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, move);
    scene.input.on(Phaser.Input.Events.POINTER_UP, up);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, up);
    scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, key);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off(Phaser.Input.Events.POINTER_MOVE, move);
      scene.input.off(Phaser.Input.Events.POINTER_UP, up);
      scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, up);
      scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, key);
    });
    arrangeablePanel(scene, 'roomPainter', 'panel', this);
    this.refresh();
  }

  private finishStroke(): void {
    if (this.stroke && this.stroke.join() !== this.finishes.join()) this.history.push(this.stroke);
    this.stroke = null;
    this.undo?.setEnabled(this.history.length > 0);
  }

  private undoStroke(): void {
    this.finishStroke();
    const previous = this.history.pop();
    if (previous) this.finishes = previous;
    this.refresh();
  }

  private refresh(): void {
    const state = getGameState(this.scene);
    drawCafeTiles(this.canvas, buildLayout(state.furniture, state.room), { x: 0, y: 0 }, state.furniture.placed, this.finishes);
    this.status.setText('Choose a finish, then drag over ' + (this.surface === 'floor' ? 'floor tiles.' : 'wall tiles.') + '\nCounter and queue stay in place. Move the counter from Decorate.');
    this.undo.setEnabled(this.history.length > 0);
    const names = this.surface === 'floor' ? FLOOR_FINISHES : WALL_FINISHES;
    this.tabs.forEach((button, i) => button.setAlpha((this.surface === 'floor' ? 0 : 1) === i ? 1 : 0.65));
    this.swatches.forEach(({ button, image, label }, i) => {
      button.setVisible(i < names.length).setAlpha(i === this.style ? 1 : 0.65);
      if (i < names.length) {
        image.setTexture(artKey(finishArt(this.surface, i)), 0);
        label.setText(names[i]);
      }
    });
  }
}
