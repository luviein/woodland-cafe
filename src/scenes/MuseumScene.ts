import { museumWeightPlaque } from '../ui/museumWeightPlaque';
import { PlayerTitlePlate } from '../ui/PlayerTitlePlate';
import journalWords from '../data/texts/fieldJournal.json';
import { cropRecord } from '../logic/cropWeights';
import Phaser from 'phaser';
import words from '../data/texts/museum.json';
import { MUSEUM_CASE_PRICE, MUSEUM_EXPANSION_PRICES, MUSEUM_ROWS, museumColumns, museumDoor,
  canPlaceMuseumCase, placeMuseumCase, storeMuseumCase, buyMuseumCase, expandMuseum, displayMuseumCrop } from '../logic/museum';
import type { Point } from '../logic/layout';
import type { GameState } from '../logic/gameState';
import { moveInMuseum, museumCanStand, museumWalkingRoute, stepMuseumRoute, MUSEUM_WALK_SPEED } from '../logic/museumWalking';
import { COLLECTION_ITEMS } from '../logic/cropCollection';
import { cropArtName } from '../logic/garden';
import type { ArtName } from '../art/spriteArt';
import { layoutPoint } from '../layout/positions';
import { arrangeable, sizeBox } from '../layout/arrangeable';
import { addArt } from '../ui/art';
import { createPlayerSprite, setWalkingMotion } from '../ui/sprites';
import { Button } from '../ui/Button';
import { LeafText, LEAF } from '../ui/LeafText';
import { CropCollectionPanel } from '../ui/CropCollectionPanel';
import { MuseumExhibitPanel } from '../ui/MuseumExhibitPanel';
import { COLORS, TEXT } from '../ui/theme';
import { getGameState, setMuseumGameState, museumLeavesAvailable, watchGameState } from './gameStore';

const TILE = 24, FLOOR_TOP = -70;
const CASE_DRAG_THRESHOLD = 4;
interface CaseDrag { id: number; pointerId: number; start: Point; offset: Point; active: boolean }

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
  private caseDrag: CaseDrag | null = null;
  private caseGhost: Phaser.GameObjects.Container | null = null;
  private ignoredCaseRelease: number | null = null;
  private grabOffset: Point = { x: 0, y: 16 };
  private modal: CropCollectionPanel | MuseumExhibitPanel | null = null;
  private titlePlate!: PlayerTitlePlate;
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
    this.caseDrag = null; this.caseGhost = null; this.ignoredCaseRelease = null;
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
    setWalkingMotion(this.player, { x: 0, y: 0 });
    this.player.disableInteractive(); this.room.add(this.player);
    const place = <T extends Phaser.GameObjects.Container | Phaser.GameObjects.Text>(name: string, x: number, y: number, object: T): T => {
      const p = layoutPoint('museum', name, { x, y }); object.setName(name).setPosition(p.x, p.y).setDepth(2000);
      arrangeable(this, 'museum', name, p, object); return object;
    };
    const control = (name: string, x: number, y: number, width: number, text: string, click: () => void) =>
      place(name, x, y, new Button(this, 0, 0, width, 24, text, COLORS.book, click).setFontSize(11)).setData('museumControl', true);
    control('map', 40, 19, 60, words.map, () => { if (!this.modal) this.scene.start('WorldMapScene', { current: 'museum' }); });
    this.arrangeButton = control('arrange', 121, 19, 88, words.arrange, () => {
      if (this.editing) { this.finishArranging(); return; }
      this.editing = true; this.placing = false; this.movingId = null;
      this.route = []; this.pendingCase = null;
      this.refresh(getGameState(this));
    });
    this.buyButton = control('buyCase', 254, 19, 136, '', () => this.commit(buyMuseumCase(getGameState(this))));
    this.buyButton.add(new LeafText(this, 0, 0, words.casePrice.replace('{price}', `${LEAF}${MUSEUM_CASE_PRICE}`), { ...TEXT.button, fontSize: '11px' }, 0.5, 0.5));
    this.expandButton = control('expand', 409, 19, 154, '', () => this.commit(expandMuseum(getGameState(this))));
    this.expandLabel = new LeafText(this, 0, 0, '', { ...TEXT.button, fontSize: '11px' }, 0.5, 0.5);
    this.expandButton.add(this.expandLabel);
    control('collection', 568, 19, 116, journalWords.title, () => {
      this.route = []; this.pendingCase = null;
      this.modal = new CropCollectionPanel(this, () => this.closeModal(), () => this.closeModal()).setDepth(5000);
    });
    const titleAt = layoutPoint('museum', 'playerTitle', { x: 320, y: 323 });
    this.titlePlate = new PlayerTitlePlate(this).setPosition(titleAt.x, titleAt.y).setDepth(800);
    arrangeable(this, 'museum', 'playerTitle', titleAt, this.titlePlate);
    this.placeButton = control('placeCase', 205, 321, 112, words.place, () => {
      this.clearCasePreview(); this.placing = true; this.movingId = null;
      this.createCasePreview({ x: 0, y: 16 }); this.moveCasePreview(this.input.activePointer);
      this.updateSelection(); this.refreshControls(getGameState(this));
    });
    this.storeButton = control('storeCase', 334, 321, 126, words.store, () => {
      if (this.movingId === null) return;
      const next = storeMuseumCase(getGameState(this), this.movingId);
      this.clearCasePreview();
      this.movingId = null; this.placing = false; this.commit(next);
    });
    this.cancelButton = control('cancel', 449, 321, 82, words.cancel, () => this.finishArranging());
    this.wallet = place('wallet', 10, 321, new LeafText(this, 0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#ffe4b6' }, 0, 0.5));
    this.stored = place('stored', 630, 321, this.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#ffe4b6' }).setOrigin(1, 0.5));
    this.help = place('help', 320, 346, this.add.text(0, 0, '', { ...TEXT.body, fontSize: '10px', color: '#ffe4b6', align: 'center', wordWrap: { width: 610 } }).setOrigin(0.5));
    this.input.on('pointerdown', () => { this.ignoredCaseRelease = null; });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.ignoredCaseRelease === pointer.id) { this.ignoredCaseRelease = null; return; }
      if (this.caseDrag) {
        if (pointer.id !== this.caseDrag.pointerId) return;
        const active = this.caseDrag.active; this.caseDrag = null;
        if (active) this.dropCasePreview(pointer, true, over.some(object => object.getData('museumControl')));
        return;
      }
      if (this.modal || over.some(object => object.getData('museumControl') || object.getData('museumCase'))) return;
      if (this.editing && this.caseGhost) { this.dropCasePreview(pointer, false); return; }
      const tile = this.tileAt(pointer.x, pointer.y);
      if (!tile) return;
      if (this.editing) return;
      const width = museumColumns(getGameState(this).museum);
      this.walk({ x: (pointer.x - this.room.x + width * TILE / 2 - 12) / TILE,
        y: (pointer.y - this.room.y - FLOOR_TOP - 24) / TILE });
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.modal || !this.editing) return;
      const drag = this.caseDrag;
      if (drag && drag.pointerId !== pointer.id) return;
      if (drag && !drag.active && Math.hypot(pointer.x - drag.start.x, pointer.y - drag.start.y) >= CASE_DRAG_THRESHOLD) {
        drag.active = true; this.movingId = drag.id; this.placing = false;
        this.createCasePreview(drag.offset); this.updateSelection(); this.refreshControls(getGameState(this));
      }
      if (this.caseGhost) this.moveCasePreview(pointer);
      else this.showGuide(pointer);
    });
    this.input.on('pointerupoutside', () => this.cancelCasePreview());
    const onBlur = () => { if (this.caseGhost || this.caseDrag) this.cancelCasePreview(); };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.modal) this.closeModal();
      else this.finishArranging();
    });
    watchGameState(this, next => this.refresh(next));
  }

  private commit(state: GameState): void { setMuseumGameState(this, state); }

  private finishArranging(): void {
    this.clearCasePreview();
    this.placing = false; this.movingId = null; this.editing = false;
    this.route = []; this.pendingCase = null;
    const state = getGameState(this);
    if (!museumCanStand(state.museum, this.cell)) this.cell = museumDoor(state.museum);
    this.refresh(state);
  }

  private updateSelection(): void {
    for (const item of getGameState(this).museum.cases) {
      const group = this.room.getByName(`museumCase.${item.id}`) as Phaser.GameObjects.Container | null;
      const outline = group?.getByName('selection') as Phaser.GameObjects.Rectangle | null;
      outline?.setVisible(this.editing && item.id === this.movingId);
    }
    this.hover.setVisible(false);
  }

  private moveCase(id: number): void {
    if (!getGameState(this).museum.cases.some(item => item.id === id)) return;
    this.editing = true; this.placing = false; this.movingId = id;
    this.route = []; this.pendingCase = null;
    this.refresh(getGameState(this));
    this.movingId = id; this.createCasePreview({ x: 0, y: 16 }); this.updateSelection();
    this.closeModal();
  }

  private addWeightPlaque(group: Phaser.GameObjects.Container, grams: number): void {
    // The plaque travels with the case, including its Arrange preview.
    group.add(museumWeightPlaque(this, grams));
  }

  private createCasePreview(offset: Point): void {
    this.caseGhost?.destroy(); this.grabOffset = offset;
    const item = getGameState(this).museum.cases.find(item => item.id === this.movingId);
    const p = this.local(item ?? museumDoor(getGameState(this).museum));
    const ghost = this.add.container(p.x + 12, p.y + 24).setAlpha(0.8).setDepth(1000).setName('museumCasePreview');
    ghost.add(addArt(this, 0, 0, 'museumCase').setOrigin(0.5, 1));
    const exhibit = COLLECTION_ITEMS.find(entry => entry.id === item?.exhibit);
    if (exhibit) ghost.add(addArt(this, 0, -10, cropArtName(exhibit.crop, exhibit.variant) as ArtName).setOrigin(0.5, 1));
    ghost.add(addArt(this, 0, 0, 'museumGlass').setOrigin(0.5, 1));
    if (exhibit) this.addWeightPlaque(ghost, cropRecord(getGameState(this), exhibit.id));
    ghost.add(this.add.rectangle(0, -16, 36, 36, 0, 0).setName('dropOutline').setStrokeStyle(2, 0x6eac52));
    this.caseGhost = ghost; this.room.add(ghost); this.room.sort('depth');
    if (item) (this.room.getByName(`museumCase.${item.id}`) as Phaser.GameObjects.Container | null)?.setAlpha(0.25);
  }

  private caseDropPoint(pointer: Phaser.Input.Pointer): Point {
    const width = museumColumns(getGameState(this).museum);
    return { x: Math.round((pointer.x - this.room.x + this.grabOffset.x + width * TILE / 2 - 12) / TILE),
      y: Math.round((pointer.y - this.room.y + this.grabOffset.y - FLOOR_TOP - 24) / TILE) };
  }

  private moveCasePreview(pointer: Phaser.Input.Pointer): void {
    if (!this.caseGhost) return;
    this.caseGhost.setPosition(Math.round(pointer.x - this.room.x + this.grabOffset.x), Math.round(pointer.y - this.room.y + this.grabOffset.y));
    const tile = this.caseDropPoint(pointer), p = this.local(tile);
    const valid = canPlaceMuseumCase(getGameState(this).museum, tile, this.movingId);
    (this.caseGhost.getByName('dropOutline') as Phaser.GameObjects.Rectangle).setStrokeStyle(2, valid ? 0x6eac52 : 0xd35444);
    this.hover.setVisible(!!this.tileAt(pointer.x, pointer.y)).setPosition(p.x + 12, p.y + 12).setFillStyle(valid ? 0x6eac52 : 0xd35444, 0.45);
    for (const image of this.caseGhost.list) if (image instanceof Phaser.GameObjects.Image) image.setTint(valid ? 0xffffff : 0xffaaaa);
  }

  private clearCasePreview(): void {
    // Esc/blur can cancel before the mouse is released: that release must not walk or drop.
    if (this.caseDrag && this.input.activePointer.isDown) this.ignoredCaseRelease = this.caseDrag.pointerId;
    this.caseGhost?.destroy(); this.caseGhost = null; this.caseDrag = null;
    for (const item of getGameState(this).museum.cases) {
      const group = this.room.getByName(`museumCase.${item.id}`) as Phaser.GameObjects.Container | null;
      group?.setAlpha(1);
    }
    this.hover?.setVisible(false);
  }

  private cancelCasePreview(): void {
    this.clearCasePreview(); this.movingId = null; this.placing = false;
    this.updateSelection(); this.refreshControls(getGameState(this));
  }

  private dropCasePreview(pointer: Phaser.Input.Pointer, dragged: boolean, onControl = false): void {
    const state = getGameState(this), tile = this.caseDropPoint(pointer);
    const valid = !onControl && canPlaceMuseumCase(state.museum, tile, this.movingId);
    if (!valid) {
      if (dragged || onControl) this.cancelCasePreview();
      else this.moveCasePreview(pointer);
      if (!onControl) this.help.setText(words.invalid);
      return;
    }
    const next = placeMuseumCase(state, tile, this.movingId);
    this.clearCasePreview(); this.movingId = null; this.placing = false;
    if (next !== state) this.commit(next);
    else { this.updateSelection(); this.refreshControls(state); }
  }

  private local(p: Point): Point {
    return { x: p.x * TILE - museumColumns(getGameState(this).museum) * TILE / 2, y: FLOOR_TOP + p.y * TILE };
  }
  private tileAt(x: number, y: number): Point | null {
    const width = museumColumns(getGameState(this).museum);
    const tile = { x: Math.floor((x - this.room.x + width * TILE / 2) / TILE), y: Math.floor((y - this.room.y - FLOOR_TOP) / TILE) };
    return tile.x >= 0 && tile.x < width && tile.y >= 0 && tile.y < MUSEUM_ROWS ? tile : null;
  }

  private refresh(state: GameState): void {
    if (this.caseGhost || this.caseDrag) { this.clearCasePreview(); this.movingId = null; this.placing = false; }
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
      if (exhibit) this.addWeightPlaque(group, cropRecord(state, exhibit.id));
      group.add(this.add.rectangle(0, -16, 34, 34, 0, 0).setName('selection').setStrokeStyle(2, 0xffd56d)
        .setVisible(this.editing && item.id === this.movingId));
      group.setInteractive(new Phaser.Geom.Rectangle(-16, -32, 32, 32), Phaser.Geom.Rectangle.Contains).setData('museumCase', item.id);
      group.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event?: { stopPropagation(): void }) => {
        this.ignoredCaseRelease = null;
        if (this.modal || !this.editing || this.caseGhost) return;
        event?.stopPropagation();
        this.caseDrag = { id: item.id, pointerId: pointer.id, start: { x: pointer.downX, y: pointer.downY },
          offset: { x: this.room.x + group.x - pointer.downX, y: this.room.y + group.y - pointer.downY }, active: false };
      });
      group.on('pointerup', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event?: { stopPropagation(): void }) => {
        // Selection must not become a floor drop on the same click.
        event?.stopPropagation();
        if (this.ignoredCaseRelease === pointer.id) { this.ignoredCaseRelease = null; return; }
        if (this.modal) return;
        if (this.editing) {
          const drag = this.caseDrag; this.caseDrag = null;
          if (drag?.active || this.caseGhost) { this.dropCasePreview(pointer, !!drag?.active); return; }
          if (!drag || drag.id !== item.id) return;
          this.movingId = item.id; this.placing = false;
          this.createCasePreview(drag.offset); this.updateSelection(); this.refreshControls(getGameState(this));
        }
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
    this.titlePlate.setVisible(!this.editing && state.journal.equippedTitle !== null);
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
    setWalkingMotion(this.player, { x: 0, y: 0 });
    if (this.modal || this.editing) return;
    const before = { ...this.cell };
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    const down = (a: string, b: string) => !typing && !!(this.keys[a]?.isDown || this.keys[b]?.isDown);
    const direction = { x: Number(down('D', 'RIGHT')) - Number(down('A', 'LEFT')), y: Number(down('S', 'DOWN')) - Number(down('W', 'UP')) };
    const length = Math.hypot(direction.x, direction.y), step = Math.min(delta, 50) * MUSEUM_WALK_SPEED / 1000 / TILE;
    if (length) {
      this.route = []; this.pendingCase = null;
      this.cell = moveInMuseum(getGameState(this).museum, this.cell, { x: direction.x / length * step, y: direction.y / length * step });
    } else {
      if (!this.route.length) return;
      const moved = stepMuseumRoute(this.cell, this.route, step);
      this.cell = moved.position; this.route = moved.route;
    }
    setWalkingMotion(this.player, { x: (this.cell.x - before.x) * TILE, y: (this.cell.y - before.y) * TILE });
    const position = this.local(this.cell);
    this.player.setPosition(Math.round(position.x), Math.round(position.y));
    this.player.setDepth(this.player.y + 24); this.room.sort('depth');
    if (!this.route.length) {
      if (this.pendingCase !== null) {
        const id = this.pendingCase; this.pendingCase = null;
        const panel = new MuseumExhibitPanel(this, id, exhibit => this.commit(displayMuseumCrop(getGameState(this), id, exhibit)),
          () => this.moveCase(id), () => this.closeModal());
        this.modal = panel; panel.refresh(getGameState(this));
      }
    }
  }

  private closeModal(): void {
    const modal = this.modal;
    this.time.delayedCall(0, () => { if (this.modal === modal) { modal?.destroy(); this.modal = null; } });
  }
}
