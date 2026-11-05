import { gardenAnimationPose } from '../art/gardenAnimation';
import { spriteSize } from '../art/pixelSprite';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import { VIEW, viewFrame } from '../art/sprites/sheetCritters';
import { PLAYER_ANIMALS, ANIMAL_NAMES, type PlayerAnimal } from '../data/playerAnimals';
import { GARDEN_WORK_SECONDS, type GardenAction } from '../logic/gardenWork';

type Paint = (ctx: CanvasRenderingContext2D, name: ArtName, frame: number, x: number, y: number, scale: number) => void;

/** The same poses and durations as gameplay, with no game state or save writes. */
export function createGardenPreviews(paint: Paint) {
  const node = document.createElement('div'); node.className = 'garden-previews';
  const description = document.createElement('p');
  description.textContent = 'Planting, watering and harvesting share the back-facing tending motion. Their tools and effects differ. These previews use the gameplay poses and timings.';
  node.append(description);
  const controls = document.createElement('div'); controls.className = 'garden-preview-controls'; node.append(controls);
  const animal = document.createElement('select'); animal.setAttribute('aria-label', 'Gardening animal');
  PLAYER_ANIMALS.forEach(id => animal.add(new Option(ANIMAL_NAMES[id], id)));
  const speed = document.createElement('select'); speed.setAttribute('aria-label', 'Gardening preview speed');
  [['1', 'Normal speed'], ['0.5', 'Half speed'], ['0.25', 'Quarter speed']].forEach(([value, title]) => speed.add(new Option(title, value)));
  const pause = document.createElement('button'); pause.textContent = 'Pause'; pause.type = 'button';
  pause.setAttribute('aria-label', 'Pause gardening previews');
  let paused = false, elapsed = 0, previous: number | null = null;
  pause.onclick = () => { paused = !paused; pause.textContent = paused ? 'Play' : 'Pause'; pause.setAttribute('aria-label', paused ? 'Play gardening previews' : 'Pause gardening previews'); };
  const animalLabel = document.createElement('label'); animalLabel.append('Animal ', animal);
  const speedLabel = document.createElement('label'); speedLabel.append('Playback ', speed);
  controls.append(animalLabel, speedLabel, pause);
  const cards = document.createElement('div'); cards.className = 'cards'; node.append(cards);
  const descriptions = { plant: 'Trowel and falling seeds', water: 'Watering can and droplets', harvest: 'Basket and rising harvest glints' };
  const titles = { plant: 'Planting', water: 'Watering', harvest: 'Harvesting' };
  const actions = (['plant', 'water', 'harvest'] as const).map(action => {
    const card = document.createElement('div'); card.className = 'card';
    const heading = document.createElement('h3'); heading.textContent = `${titles[action]} (${GARDEN_WORK_SECONDS[action]}s)`;
    const detail = document.createElement('div'); detail.className = 'meta'; detail.textContent = descriptions[action];
    const canvas = document.createElement('canvas'); canvas.width = 288; canvas.height = 288;
    canvas.setAttribute('aria-label', `${titles[action]} animation preview`);
    card.append(heading, detail, canvas); cards.append(card);
    return { action, canvas };
  });
  // Cache the static ground instead of repainting thousands of grass pixels each frame.
  const backdrop = document.createElement('canvas'); backdrop.width = 288; backdrop.height = 288;
  const background = backdrop.getContext('2d')!;
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) paint(background, 'grass', (row + col) % 4, col * 48, row * 48, 3);
  paint(background, 'gardenSoil', 0, 24 * 3, 32 * 3, 3);

  function draw(canvas: HTMLCanvasElement, action: GardenAction, progress: number, working: boolean): void {
    const ctx = canvas.getContext('2d')!, scale = 3, x = 48, y = 48;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backdrop, 0, 0);
    const drawAt = (name: ArtName, frame: number, cx: number, cy: number) => {
      const size = spriteSize(SPRITE_ART[name]);
      paint(ctx, name, frame, Math.round(cx - size.width / 2) * scale, Math.round(cy - size.height / 2) * scale, scale);
    };
    if (action === 'plant' && !working) drawAt('gardenMushroom', 0, x, y - 4);
    if (action === 'water') drawAt('gardenMushroom', working ? 0 : 1, x, y - 4);
    if (action === 'harvest' && working) drawAt('gardenMushroom', 3, x, y - 4);
    const pose = gardenAnimationPose(action, progress), critter = animal.value as PlayerAnimal;
    const size = spriteSize(SPRITE_ART[critter]);
    paint(ctx, critter, viewFrame(VIEW.back), Math.round(x - size.width / 2) * scale, (y + 24 - size.height + (working ? pose.bodyY : 0)) * scale, scale);
    if (working) {
      drawAt('gardenWorkTools', pose.frame, x + pose.tool.x, y + pose.tool.y);
      pose.particles.forEach(p => drawAt('gardenWorkParticles', pose.frame, x + p.x, y + p.y));
      ctx.fillStyle = '#493026'; ctx.fillRect((x - 15) * scale, (y - 28) * scale, 30 * scale, 5 * scale);
      ctx.fillStyle = '#77a34d'; ctx.fillRect((x - 13) * scale, (y - 27) * scale, Math.floor(progress * 26) * scale, 2 * scale);
    }
    canvas.dataset.progress = progress.toFixed(4);
    canvas.dataset.animal = critter;
  }

  return { node, animate(time: number) {
    if (previous !== null && !paused) elapsed += (time - previous) * Number(speed.value);
    previous = time;
    actions.forEach(({ action, canvas }) => {
      const duration = GARDEN_WORK_SECONDS[action] * 1000, phase = elapsed % (duration + 600);
      draw(canvas, action, Math.min(1, phase / duration), phase < duration);
    });
  } };
}
