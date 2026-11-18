import { afterEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { createNewGame } from '../../logic/gameState';

const root = vi.hoisted(() => ({ render: vi.fn(), unmount: vi.fn() }));
vi.mock('react-dom/client', () => ({ createRoot: () => root }));

import { JournalCropOverlay } from './JournalCropOverlay';

function fixture() {
  root.render.mockClear(); root.unmount.mockClear();
  const host = { className: '', style: {} as Record<string, string>, setAttribute: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('document', { createElement: () => host, body: { append: vi.fn() } });
  const events = { on: vi.fn(), once: vi.fn(), off: vi.fn() };
  const active = vi.fn(() => true);
  const owner = { visible: true, parentContainer: null } as unknown as Phaser.GameObjects.Container;
  const png = vi.fn(() => 'data:image/png;base64,existing');
  const scene = {
    textures: { getBase64: png }, events,
    sys: { isActive: active, isVisible: () => true },
    game: { events, canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) } },
    cameras: { main: { getWorldPoint: (x: number, y: number) => ({ x: x / 2 + 10, y: y / 2 + 20 }) } },
  } as unknown as Phaser.Scene;
  return { scene, owner, host, events, active, png };
}

afterEach(() => vi.unstubAllGlobals());

describe('journal DOM overlay lifecycle', () => {
  it('removes the React root, DOM and scene listeners exactly once on spread close', () => {
    const test = fixture();
    const overlay = new JournalCropOverlay(test.scene, test.owner, [], createNewGame());
    overlay.destroy(); overlay.destroy();
    expect(root.unmount).toHaveBeenCalledTimes(1);
    expect(test.host.remove).toHaveBeenCalledTimes(1);
    expect(test.events.off).toHaveBeenCalledWith('postrender', expect.any(Function));
    expect(test.events.off).toHaveBeenCalledWith('shutdown', overlay.destroy);
  });

  it('follows canvas scaling and the public camera transform, then hides below a paused scene', () => {
    const test = fixture();
    const zone = { getWorldTransformMatrix: () => ({ transformPoint: () => ({ x: 130, y: 110 }) }) } as unknown as Phaser.GameObjects.Zone;
    const overlay = new JournalCropOverlay(test.scene, test.owner, [{ id: 'golden.mushroom', zone }], createNewGame());
    const rendered = root.render.mock.calls[0][0] as { props: { children: { props: { cardRef: (element: HTMLDivElement) => void } }[] } };
    const row = { style: {} } as HTMLDivElement;
    rendered.props.children[0].props.cardRef(row);
    expect(test.host.style.left).toBe('10px');
    expect(test.host.style.transform).toBe('scale(2, 2)');
    expect(row.style.transform).toBe('translate(240px, 180px)');
    test.active.mockReturnValue(false);
    test.events.on.mock.calls[0][1]();
    expect(test.host.style.visibility).toBe('hidden');
    overlay.destroy();
  });

  it('reuses the unchanged PNG snapshots across repeated journal openings', () => {
    const test = fixture();
    new JournalCropOverlay(test.scene, test.owner, [], createNewGame()).destroy();
    new JournalCropOverlay(test.scene, test.owner, [], createNewGame()).destroy();
    expect(test.png).toHaveBeenCalledTimes(6);
    expect(root.unmount).toHaveBeenCalledTimes(2);
  });
});
