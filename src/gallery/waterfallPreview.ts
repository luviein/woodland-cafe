import { MAP_IMAGE, MAP_WATERFALL, MAP_WATERFALL_IMAGE } from '../assets/worldMap';

/** Review approved PNG frames directly, using the same timing and native footprint as gameplay. */
export function createWaterfallPreview() {
  const node = document.createElement('div');
  node.className = 'cards';
  const card = document.createElement('article'); card.className = 'card';
  const heading = document.createElement('h3'); heading.textContent = 'Map waterfall';
  const note = document.createElement('p');
  note.textContent = 'Six frames, 140 ms each, looping continuously. Nearest-neighbour water and foam; original rocks stay still. Sources: src/assets/worldMap/.';
  const canvas = document.createElement('canvas'); canvas.width = 368; canvas.height = 320;
  canvas.style.maxWidth = '100%'; canvas.style.imageRendering = 'pixelated';
  card.append(heading, canvas, note); node.append(card);
  const map = new Image(); map.src = MAP_IMAGE;
  const atlas = new Image(); atlas.src = MAP_WATERFALL_IMAGE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const animate = (time: number) => {
    if (!map.complete || !atlas.complete || !map.naturalWidth || !atlas.naturalWidth) return;
    const { width, height, x, y } = MAP_WATERFALL.display;
    const frame = Math.floor(time / MAP_WATERFALL.frameMs) % MAP_WATERFALL.count;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Enlarged crop of the map around the waterfall, then the native-size water overlay at 4×.
    ctx.drawImage(map, 400, 125, 240, 210, 0, 0, 368, 320);
    const left = Math.round((x - width / 2 - 400 * 640 / map.naturalWidth) * 4);
    const top = Math.round((y - height / 2 - 125 * 360 / map.naturalHeight) * 4);
    ctx.drawImage(atlas, frame * width, 0, width, height, left, top, width * 4, height * 4);
  };
  return { node, animate };
}
