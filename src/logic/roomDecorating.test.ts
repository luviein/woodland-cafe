import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { defaultFinishes, validFinishes } from '../data/roomFinishes';
import { moveCounter, paintFinish, paintFinishStroke, paintFinishStretch } from './roomDecorating';
import { parseLayout } from './layout';
import { roomProblems } from './roomPainter';
import { loadGame, saveGame } from './save';

describe('surface painting', () => {
  it('fills tiles crossed by a quick stroke while preserving the input', () => {
    const room = ['........'];
    const finishes = defaultFinishes(room);
    expect(paintFinishStroke(room, finishes, { x: 0, y: 0 }, { x: 7, y: 0 }, 'floor', 3)).toEqual(['33333333']);
    expect(finishes).toEqual(['00000000']);
  });

  it('fills connected surfaces round corners, stopping at structure and other surfaces', () => {
    const room = ['WWWWW', 'W.C.W', 'W.C.W', 'WWDWW'];
    const finishes = defaultFinishes(room);
    const wall = paintFinishStretch(room, finishes, { x: 0, y: 0 }, 'wall', 2);
    expect(wall).toEqual(['22222', '20002', '20002', '22022']);
    const floor = paintFinishStretch(room, wall, { x: 1, y: 1 }, 'floor', 7);
    expect(floor).toEqual(['22222', '27002', '27002', '22022']);
    expect(paintFinishStretch(room, finishes, { x: 2, y: 1 }, 'floor', 7)).toEqual(finishes);
    expect(finishes).toEqual(defaultFinishes(room));
  });
  it('changes only the selected surface finish and preserves structural markers', () => {
    const { room } = createNewGame();
    const original = [...room];
    const finishes = defaultFinishes(room);
    expect(paintFinish(room, finishes, { x: 2, y: 3 }, 'wall', 2)).toEqual(finishes);
    expect(paintFinish(room, finishes, { x: 2, y: 0 }, 'floor', 2)).toEqual(finishes);
    expect(paintFinish(room, finishes, { x: 19, y: 2 }, 'floor', 2)).toEqual(finishes);
    const painted = paintFinish(room, finishes, { x: 19, y: 3 }, 'floor', 7);
    expect(painted[3][19]).toBe('7');
    expect(room).toEqual(original);
    expect(finishes[3][19]).toBe('0');
    expect(validFinishes(painted, room)).toBe(true);
    expect(validFinishes(['broken'], room)).toBe(false);
  });

  it('saves finishes and defaults older games without them', () => {
    const state = createNewGame();
    state.roomFinishes = paintFinish(state.room, state.roomFinishes, { x: 3, y: 0 }, 'wall', 4);
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
    const file = JSON.parse(saveGame(state));
    delete file.state.roomFinishes;
    file.version = 7;
    expect(loadGame(JSON.stringify(file))).toEqual({ ok: true, state: { ...state, roomFinishes: defaultFinishes(state.room) } });
    file.state.roomFinishes = ['bad'];
    expect(loadGame(JSON.stringify(file)).ok).toBe(false);
  });
});

describe('moving the service counter', () => {
  it('moves all service spots and counter decorations together without mutating the original', () => {
    const state = createNewGame();
    const furniture = { ...state.furniture, placed: [...state.furniture.placed, { design: 'snowGlobe' as const, x: 16, y: 2 }] };
    const result = moveCounter(state.room, furniture, { x: 18, y: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    const layout = parseLayout(result.room);
    expect(layout.counterSpot).toEqual({ x: 18, y: 1 });
    expect(layout.orderSpot).toEqual({ x: 18, y: 3 });
    expect(layout.queueSpots[0]).toEqual({ x: 20, y: 4 });
    expect(result.furniture.placed.at(-1)).toEqual({ design: 'snowGlobe', x: 15, y: 2 });
    expect(furniture.placed.at(-1)?.x).toBe(16);
    expect(roomProblems(result.room, result.furniture.placed, false)).toEqual([]);
  });

  it('refuses out-of-room and furniture-blocking moves', () => {
    const state = createNewGame();
    expect(moveCounter(state.room, state.furniture, { x: 30, y: 1 }).ok).toBe(false);
    expect(moveCounter(state.room, state.furniture, { x: 19, y: 0 }).ok).toBe(false);
    const furniture = { ...state.furniture, placed: [...state.furniture.placed, { design: 'christmasTree' as const, x: 18, y: 1 }] };
    expect(moveCounter(state.room, furniture, { x: 18, y: 1 }).ok).toBe(false);
  });
});
