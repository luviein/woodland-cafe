import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH, TILE_SIZE } from '../config/display';
import { CAFE_ROOM } from '../data/cafeRoom';
import { arrangeable, arrangeablePanel } from '../layout/arrangeable';
import { layoutPoint } from '../layout/positions';
import { parseLayout, type Point, type TileKind } from '../logic/layout';
import { paintRoom, roomProblems, ROOM_BRUSHES, type RoomBrush } from '../logic/roomPainter';
import { getGameState, setGameState } from '../scenes/gameStore';
import { addCafeCanvas, drawCafeTiles } from './cafeTiles';
import { Button } from './Button';
import { COLORS, TEXT } from './theme';

const NAMES = ['Floor', 'Wall', 'Counter', 'Door', 'Player', 'Order', 'Queue 1', 'Queue 2', 'Queue 3', 'Queue 4', 'Queue 5', 'Queue 6', 'Queue 7', 'Queue 8', 'Queue 9'];
const PREVIEW_SCALE = 0.75;

/** A draft stays local until Apply, so Cancel never changes the saved cafe. */
export class RoomPainterPanel extends Phaser.GameObjects.Container {
  private rows: string[];
  private history: string[][] = [];
  private stroke: string[] | null = null;
  private brush: RoomBrush = '.';
  private canvas: Phaser.GameObjects.RenderTexture;
  private markers: Phaser.GameObjects.Container;
  private status: Phaser.GameObjects.Text;
  private apply: Button;
  private undo: Button;
  private brushes: Button[] = [];
  private grid: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, close: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(100000).setName('roomPainter');
    this.rows = [...getGameState(scene).room];
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
    this.markers = scene.add.container(0, 0).setScale(PREVIEW_SCALE);
    this.grid = scene.add.zone(0, 0, 576 * PREVIEW_SCALE, 288 * PREVIEW_SCALE).setOrigin(0).setInteractive();
    const preview = scene.add.container(0, 0, [this.canvas, this.markers, this.grid]);
    place('preview', 12, 44, preview);
    ROOM_BRUSHES.forEach((brush, index) => {
      const button = place(`brush-${brush}`, 487 + index % 2 * 94, 48 + Math.floor(index / 2) * 28,
        new Button(scene, 0, 0, 86, 23, NAMES[index], COLORS.book, () => {
          this.finishStroke(); this.brush = brush; this.refresh();
        }));
      this.brushes.push(button);
    });
    this.status = place('status', 14, 270, scene.add.text(0, 0, '', { ...TEXT.label, wordWrap: { width: 612 } }));
    this.undo = place('undo', 68, 334, new Button(scene, 0, 0, 100, 28, 'Undo', COLORS.book, () => this.undoStroke()));
    place('cancel', 452, 334, new Button(scene, 0, 0, 100, 28, 'Cancel', COLORS.reset, close));
    this.apply = place('apply', 568, 334, new Button(scene, 0, 0, 112, 28, 'Apply', COLORS.serve, () => {
      this.finishStroke();
      if (roomProblems(this.rows, getGameState(scene).furniture.placed, false).length) return;
      setGameState(scene, { ...getGameState(scene), room: [...this.rows] });
      close();
    }));
    const paint = (pointer: Phaser.Input.Pointer) => {
      if (!this.stroke) return;
      const local = this.grid.getWorldTransformMatrix().applyInverse(pointer.worldX, pointer.worldY);
      const tile: Point = { x: Math.floor(local.x / (TILE_SIZE * PREVIEW_SCALE)), y: Math.floor(local.y / (TILE_SIZE * PREVIEW_SCALE)) };
      this.rows = paintRoom(this.rows, tile, this.brush);
      this.refresh();
    };
    this.grid.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.finishStroke(); this.stroke = [...this.rows]; paint(pointer);
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
    if (this.stroke && this.stroke.join() !== this.rows.join()) this.history.push(this.stroke);
    this.stroke = null;
    this.undo?.setEnabled(this.history.length > 0);
  }

  private undoStroke(): void {
    this.finishStroke();
    const previous = this.history.pop();
    if (previous) this.rows = previous;
    this.refresh();
  }

  private refresh(): void {
    // Build the preview without parsing the draft: missing markers are allowed
    // while painting, but the ordinary layout parser rejects those drafts.
    const layout = parseLayout(CAFE_ROOM);
    const kinds: Record<string, TileKind> = { W: 'wall', C: 'counter', D: 'door' };
    layout.tiles = this.rows.map(row => [...row].map(char => kinds[char] ?? 'floor'));
    layout.orderSpot = { x: -100, y: -100 };
    layout.queueSpots = [];
    const furniture = getGameState(this.scene).furniture;
    drawCafeTiles(this.canvas, layout, { x: 0, y: 0 }, furniture.placed);
    this.markers.removeAll(true);
    this.rows.forEach((row, y) => [...row].forEach((char, x) => {
      if ('.WC'.includes(char)) return;
      this.markers.add(this.scene.add.text(x * TILE_SIZE + 12, y * TILE_SIZE + 12, char, {
        ...TEXT.label, color: '#ffffff', backgroundColor: '#422a30', fontSize: '12px',
      }).setOrigin(0.5));
    }));
    const problems = roomProblems(this.rows, furniture.placed, false);
    this.status.setText(problems[0] ?? 'Drag to paint. Door / Player / Order and queue numbers move to the chosen tile.\nApply saves your cafe; Cancel keeps the previous room.');
    this.apply.setEnabled(problems.length === 0);
    this.undo.setEnabled(this.history.length > 0);
    this.brushes.forEach((button, i) => button.setAlpha(ROOM_BRUSHES[i] === this.brush ? 1 : 0.65));
  }
}
