import { MAP_FLOWER, MAP_FLOWER_IMAGE, MAP_IMAGE } from '../assets/worldMap';

/** Before/after at game resolution, enlarged with nearest-neighbour for pixel review. */
export function createMapFlowerPreview(): HTMLElement {
  const group = document.createElement('div'); group.className = 'cards';
  const map = new Image(), flower = new Image();
  const canvases: HTMLCanvasElement[] = [];
  for (const heading of ['Original map flowers', 'Approved petals and precise stems']) {
    const card = document.createElement('article'); card.className = 'card';
    const label = document.createElement('h3'); label.textContent = heading;
    const canvas = document.createElement('canvas'); canvas.width = 250; canvas.height = 250;
    canvas.style.imageRendering = 'pixelated';
    card.append(label, canvas); group.append(card); canvases.push(canvas);
  }
  const render = () => {
    if (!map.complete || !flower.complete || !map.naturalWidth || !flower.naturalWidth) return;
    const before = document.createElement('canvas'); before.width = 640; before.height = 360;
    before.getContext('2d')!.drawImage(map, 0, 0, 640, 360);
    canvases.forEach((canvas, index) => {
      const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 250, 250);
      ctx.drawImage(before, 204, 265, 50, 50, 0, 0, 250, 250);
      if (index === 1) {
        const { x, y, width, height } = MAP_FLOWER.display;
        ctx.drawImage(flower, (x - 204) * 5, (y - 265) * 5, width * 5, height * 5);
      }
    });
  };
  map.onload = render; flower.onload = render;
  map.src = MAP_IMAGE; flower.src = MAP_FLOWER_IMAGE;
  return group;
}
