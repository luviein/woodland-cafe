import Phaser from 'phaser';
import words from '../data/texts/museum.json';
import { MUSEUM_CASE_PRICE, MUSEUM_EXPANSION_PRICES, MUSEUM_ROWS, museumColumns, museumDoor,
  canPlaceMuseumCase, placeMuseumCase, storeMuseumCase, buyMuseumCase, expandMuseum, displayMuseumCrop } from '../logic/museum';
import type { Point } from '../logic/layout';
import type { GameState } from '../logic/gameState';
import { moveInMuseum, museumWalkingRoute, MUSEUM_WALK_SPEED } from '../logic/museumWalking';
import { COLLECTION_ITEMS } from '../logic/cropCollection';
import { cropArtName } from '../logic/garden';
import type { ArtName } from '../art/spriteArt';
import { layoutPoint } from '../layout/positions';
import { arrangeable, sizeBox } from '../layout/arrangeable';
import { addArt } from '../ui/art';
import { createPlayerSprite } from '../ui/sprites';
import { Button } from '../ui/Button';
import { LeafText, LEAF } from '../ui/LeafText';
import { CropCollectionPanel } from '../ui/CropCollectionPanel';
import { MuseumExhibitPanel } from '../ui/MuseumExhibitPanel';
import { COLORS, TEXT } from '../ui/theme';
import { getGameState, setMuseumGameState, museumLeavesAvailable, watchGameState } from './gameStore';

const TILE = 24, FLOOR_TOP = -70;

export class MuseumScene extends Phaser.Scene {
  private room!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Container;
  private hover!: Phaser.GameObjects.Rectangle;
  private cell!: Point;
  private route: Point[] = [];
  private pendingCase: number | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private editing = false;
  private placing = false;
  private movingId: number | null = null;
  private modal: CropCollectionPanel | MuseumExhibitPanel | null = null;
  private level = 0;
  private arrangeButton!: Button;
  private buyButton!: Button;
  private expandButton!: Button;
  private expandLabel!: LeafText;
  private placeButton!: Button;
  private storeButton!: Button;
  private cancelButton!: Button;
  private wallet!: LeafText;
  private stored!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;

  constructor() { super('MuseumScene'); }

  create(): void {
    this.editing = false; this.placing = false; this.movingId = null; this.modal = null;
    this.route = []; this.pendingCase = null;
    this.keys = (this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) ?? {}) as Record<string, Phaser.Input.Keyboard.Key>;
    const state = getGameState(this);
    this.level = state.museum.level; this.cell = museumDoor(state.museum);
    this.cameras.main.setBackgroundColor('#34231f');
    const at = layoutPoint('museum', 'room', { x: 320, y: 180 });
    this.room = this.add.container(at.x, at.y).setName('museumRoom');
    arrangeable(this, 'museum', 'room', at, this.room,
      ...sizeBox(this, at.x - museumColumns(state.museum) * TILE / 2 - 6, at.y - 132, museumColumns(state.museum) * TILE + 12, 260));
    this.player = createPlayerSprite(this, () => false);
    this.player.disableInteractive(); this.room.add(this.player);
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Text>(name: string, x: number, y: number, object: T): T => {
      const p = layoutPoint('museum', name, { x, y }); object.setName(name).setPosition(p.x, p.y).setDepth(2000);
      arrangeable(this, 'museum', name, p, object); return object;
    };
    const control = (name: string, x: number, y: number, width: number, text: string, click: () => void) =>
      place(name, x, y, new Button(this, 0, 0, width, 24, text, COLORS.book, click).setFontSize(11)).setData('museumControl', true);
    control('map', 40, 19, 60, words.map, () => { if (!this.modal) this.scene.start('WorldMapScene', { current: 'museum' }); });
    this.arrangeButton = control('arrange', 121, 19, 88, words.arrange, () => {
      this.editing = !this.editing; this.placing = false; this.movingId = null;
      this.route = []; this.pendingCase = null;
      if (!this.editing) this.cell = museumDoor(getGameState(this).museum);
      this.refresh(getGameState(this));
    });
    this.buyButton = control('buyCase', 254, 19, 136, '', () => this.commit(buyMuseumCase(getGameState(this))));
    this.buyButton.add(new LeafText(this, 0, 0, words.casePrice.replace('{price}', `${LEAF}${MUSEUM_CASE_PRICE}`), { ...TEXT.button, fontSize: '11px' }, 0.5, 0.5));
    this.expandButton = control('expand', 409, 19, 154, '', () => this.commit(expandMuseum(getGameState(this))));
    this.expandLabel = new LeafText(this, 0, 0, '', { ...TEXT.button, fontSize: '11px' }, 0.5, 0.5);
    this.expandButton.add(this.expandLabel);
    control('collection', 568, 19, 116, words.collection, () => {
      this.route = []; this.pendingCase = null;
      this.modal = new CropCollectionPanel(this, () => this.closeModal(), () => this.closeModal()).setDepth(5000);
    });
    this.placeButton = control('placeCase', 205, 321, 112, words.place, () => { this.placing = true; this.movingId = null; this.refresh(getGameState(this)); });
    this.storeButton = control('storeCase', 334, 321, 126, words.store, () => {
      if (this.movingId === null) return;
      const next = storeMuseumCase(getGameState(this), this.movingId);
      this.movingId = null; this.placing = false; this.commit(next);
    });
    this.cancelButton = control('cancel', 449, 321, 82, words.cancel, () => { this.movingId = null; this.placing = false; this.refresh(getGameState(this)); });
    this.wallet = place('wallet', 10, 321, new LeafText(this, 0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#ffe4b6' }, 0, 0.5));
    this.stored = place('stored', 630, 321, this.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#ffe4b6' }).setOrigin(1, 0.5));
    this.help = place('help', 320, 346, this.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#ffe4b6', align: 'center', wordWrap: { width: 610 } }).setOrigin(0.5));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.modal || over.some(object => object.getData('museumControl') || object.getData('museumCase'))) return;
      const tile = this.tileAt(pointer.x, pointer.y);
      if (!tile) return;
      if (this.editing) {
        if (!this.placing && this.movingId === null) return;
        const before = getGameState(this), after = placeMuseumCase(before, tile, this.movingId);
        if (after === before) { this.help.setText(words.invalid); return; }
        this.placing = false; this.movingId = null; this.commit(after);
      } else {
        const width = museumColumns(getGameState(this).museum);
        this.walk({ x: (pointer.x - this.room.x + width * TILE / 2 - 12) / TILE,
          y: (pointer.y - this.room.y - FLOOR_TOP - 24) / TILE });
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.showGuide(pointer));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.modal) this.closeModal();
      else {
        if (this.editing) this.cell = museumDoor(getGameState(this).museum);
        this.placing = false; this.movingId = null; this.editing = false; this.route = [];
        this.refresh(getGameState(this));
      }
    });
    watchGameState(this, next => this.refresh(next));
  }

  private commit(state: GameState): void { setMuseumGameState(this, state); }

  private local(p: Point): Point {
    return { x: p.x * TILE - museumColumns(getGameState(this).museum) * TILE / 2, y: FLOOR_TOP + p.y * TILE };
  }
  private tileAt(x: number, y: number): Point | null {
    const width = museumColumns(getGameState(this).museum);
    const tile = { x: Math.floor((x - this.room.x + width * TILE / 2) / TILE), y: Math.floor((y - this.room.y - FLOOR_TOP) / TILE) };
    return tile.x >= 0 && tile.x < width && tile.y >= 0 && tile.y < MUSEUM_ROWS ? tile : null;
  }

  private refresh(state: GameState): void {
    if (state.museum.level !== this.level) {
      const shift = (state.museum.level - this.level) * 2;
      this.cell = { ...this.cell, x: this.cell.x + shift };
      this.route = this.route.map(point => ({ ...point, x: point.x + shift }));
      this.level = state.museum.level;
    }
    for (const child of [...this.room.list]) if (child !== this.player) child.destroy();
    const width = museumColumns(state.museum), left = -width * TILE / 2;
    this.room.add(this.add.rectangle(0, -2, width * TILE + 12, 260, 0x493026).setDepth(-300));
    this.room.add(this.add.rectangle(0, -2, width * TILE + 8, 256, 0xa56646).setDepth(-290));
    const add = (x: number, y: number, art: ArtName, depth: number, bottom = false) => {
      const image = addArt(this, x, y, art).setOrigin(0.5, bottom ? 1 : 0.5).setDepth(depth); this.room.add(image); return image;
    };
    for (let x = 0; x < width; x++) {
      add(left + x * TILE + 12, FLOOR_TOP - 28, 'museumWall', -200);
      for (let y = 0; y < MUSEUM_ROWS; y++) {
        const runner = x === width / 2 - 1 || x === width / 2;
        add(left + x * TILE + 12, FLOOR_TOP + y * TILE + 12, runner ? 'museumRunner' : 'museumFloor', -100).setFrame(runner && x === width / 2 ? 1 : 0);
      }
    }
    for (const sign of [-1, 1]) {
      add(sign * (width * TILE / 2 - 20), FLOOR_TOP - 18, 'museumWindow', -180);
      add(sign * (width * TILE / 2 - 57), FLOOR_TOP - 28, 'museumBanner', -170);
      add(sign * 63, FLOOR_TOP - 13, 'museumLamp', -160);
      add(sign * (width * TILE / 2 - 14), FLOOR_TOP + 21, 'museumPlant', 20, true);
      for (let distance = 39; distance < width * TILE / 2 - 12; distance += 26) add(sign * distance, FLOOR_TOP + MUSEUM_ROWS * TILE + 5, 'museumRope', 300, true);
    }
    const title = this.add.text(0, FLOOR_TOP - 43, words.title, { ...TEXT.heading, fontSize: '14px', backgroundColor: '#f2cea0', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(-150);
    this.room.add(title);
    if (this.editing) {
      const grid = this.add.graphics().lineStyle(1, 0xffe1a4, 0.35).setDepth(0);
      for (let x = 0; x <= width; x++) grid.lineBetween(left + x * TILE, FLOOR_TOP, left + x * TILE, FLOOR_TOP + MUSEUM_ROWS * TILE);
      for (let y = 0; y <= MUSEUM_ROWS; y++) grid.lineBetween(left, FLOOR_TOP + y * TILE, -left, FLOOR_TOP + y * TILE);
      this.room.add(grid);
    }
    for (const item of state.museum.cases) {
      const p = this.local(item), group = this.add.container(p.x + 12, p.y + 24).setDepth(p.y + 24).setName(`museumCase.${item.id}`);
      group.add(addArt(this, 0, 0, 'museumCase').setOrigin(0.5, 1));
      const exhibit = COLLECTION_ITEMS.find(entry => entry.id === item.exhibit);
      if (exhibit) group.add(addArt(this, 0, -10, cropArtName(exhibit.crop, exhibit.variant) as ArtName).setOrigin(0.5, 1));
      group.add(addArt(this, 0, 0, 'museumGlass').setOrigin(0.5, 1));
      if (this.editing && item.id === this.movingId) group.add(this.add.rectangle(0, -16, 26, 34, 0, 0).setStrokeStyle(2, 0xffd56d));
      group.setInteractive(new Phaser.Geom.Rectangle(-12, -32, 24, 32), Phaser.Geom.Rectangle.Contains).setData('museumCase', item.id);
      group.on('pointerup', () => {
        if (this.modal) return;
        if (this.editing) { this.movingId = item.id; this.placing = false; this.refresh(getGameState(this)); }
        else this.walk(item, item.id);
      });
      this.room.add(group);
    }
    this.hover = this.add.rectangle(0, 0, 24, 24, 0x6eac52, 0.45).setStrokeStyle(1, 0xffffff).setDepth(900).setVisible(false);
    this.room.add(this.hover);
    const p = this.local(this.cell); this.player.setPosition(Math.round(p.x), Math.round(p.y)).setVisible(!this.editing).setDepth(p.y + 24);
    this.room.sort('depth'); this.refreshControls(state); this.modal?.refresh(state);
  }

  private refreshControls(state: GameState): void {
    this.arrangeButton.setText(this.editing ? words.done : words.arrange);
    const budget = museumLeavesAvailable(this);
    this.buyButton.setEnabled(budget >= MUSEUM_CASE_PRICE);
    const price = MUSEUM_EXPANSION_PRICES[state.museum.level];
    this.expandButton.setEnabled(price !== undefined && budget >= price);
    this.expandLabel.setText(price === undefined ? words.fullyExpanded : words.expandPrice.replace('{price}', `${LEAF}${price}`));
    this.placeButton.setVisible(this.editing).setEnabled(state.museum.storedCases > 0);
    this.storeButton.setVisible(this.editing).setEnabled(this.movingId !== null);
    this.cancelButton.setVisible(this.editing);
    this.wallet.setText(words.wallet.replace('{amount}', `${LEAF}${budget}`));
    this.stored.setText(words.stored.replace('{amount}', String(state.museum.storedCases)));
    this.help.setText(!this.editing ? state.museum.cases.length ? words.walkHelp : words.starterHelp
      : this.placing || this.movingId !== null ? words.placingHelp : words.arrangeHelp);
  }

  private showGuide(pointer: Phaser.Input.Pointer): void {
    const tile = this.tileAt(pointer.x, pointer.y);
    this.hover.setVisible(!this.modal && this.editing && (this.placing || this.movingId !== null) && !!tile);
    if (!tile) return;
    const p = this.local(tile), valid = canPlaceMuseumCase(getGameState(this).museum, tile, this.movingId);
    this.hover.setPosition(p.x + 12, p.y + 12).setFillStyle(valid ? 0x6eac52 : 0xd35444, 0.5);
  }

  private walk(to: Point, caseId: number | null = null): void {
    const route = museumWalkingRoute(getGameState(this).museum, this.cell, to, caseId);
    if (route === null) return;
    this.route = route; this.pendingCase = caseId;
  }

  update(_time: number, delta: number): void {
    if (this.modal || this.editing) return;
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    const down = (a: string, b: string) => !typing && !!(this.keys[a]?.isDown || this.keys[b]?.isDown);
    const direction = { x: Number(down('D', 'RIGHT')) - Number(down('A', 'LEFT')), y: Number(down('S', 'DOWN')) - Number(down('W', 'UP')) };
    const length = Math.hypot(direction.x, direction.y), step = Math.min(delta, 50) * MUSEUM_WALK_SPEED / 1000 / TILE;
    if (length) {
      this.route = []; this.pendingCase = null;
      this.cell = moveInMuseum(getGameState(this).museum, this.cell, { x: direction.x / length * step, y: direction.y / length * step });
    } else {
      if (!this.route.length) return;
      const next = this.route[0], dx = next.x - this.cell.x, dy = next.y - this.cell.y, distance = Math.hypot(dx, dy);
      if (distance <= step) { this.cell = { ...next }; this.route.shift(); }
      else this.cell = { x: this.cell.x + dx / distance * step, y: this.cell.y + dy / distance * step };
    }
    const position = this.local(this.cell);
    this.player.setPosition(Math.round(position.x), Math.round(position.y));
    this.player.setDepth(this.player.y + 24); this.room.sort('depth');
    if (!this.route.length) {
      if (this.pendingCase !== null) {
        const id = this.pendingCase; this.pendingCase = null;
        const panel = new MuseumExhibitPanel(this, id, exhibit => this.commit(displayMuseumCrop(getGameState(this), id, exhibit)), () => this.closeModal());
        this.modal = panel; panel.refresh(getGameState(this));
      }
    }
  }

  private closeModal(): void {
    const modal = this.modal;
    this.time.delayedCall(0, () => { if (this.modal === modal) { modal?.destroy(); this.modal = null; } });
  }
}
