import { PREP_LAYER_IMAGES, PREP_LAYER_LAYOUT } from '../assets/prep';

/** Inspect supplied PNGs directly; the regular sprite cards below also retain code fallbacks. */
export function createPrepLayerPreviews(): HTMLElement {
  const group = document.createElement('div'); group.className = 'cards';
  for (const [name, url] of Object.entries(PREP_LAYER_IMAGES)) {
    const card = document.createElement('article'); card.className = 'card';
    const title = document.createElement('h3'); title.textContent = name;
    const image = document.createElement('img'); image.src = url; image.alt = name;
    image.width = PREP_LAYER_LAYOUT.width * 4; image.height = PREP_LAYER_LAYOUT.height * 4;
    image.style.imageRendering = 'pixelated'; image.style.maxWidth = '100%';
    const note = document.createElement('p');
    note.textContent = 'Approved centre strip. Transparent checkerboard removal; original source preserved in src/assets/prep/source/.';
    card.append(title, image, note); group.append(card);
  }
  return group;
}
