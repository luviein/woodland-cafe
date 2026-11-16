import Phaser from 'phaser';
import words from '../data/texts/playerName.json';
import { normalisePlayerName } from '../logic/playerName';
import { layoutPoint } from '../layout/positions';
import { arrangeable } from '../layout/arrangeable';
import { BASE_WIDTH, BASE_HEIGHT } from '../config/display';

/** A real input supports selection, paste and mobile keyboards without dependencies. */
export function promptPlayerName(scene: Phaser.Scene, accept: (name: string) => void, cancel: () => void): void {
  const point = layoutPoint('title', 'playerNamePrompt', { x: 320, y: 180 });
  const anchor = scene.add.zone(point.x, point.y, 340, 202);
  arrangeable(scene, 'title', 'playerNamePrompt', point, anchor);
  const dim = document.createElement('div');
  Object.assign(dim.style, { position: 'fixed', inset: '0', background: '#211916aa', zIndex: '1000' });
  const form = document.createElement('form');
  form.id = 'player-name-form';
  form.setAttribute('role', 'dialog');
  form.setAttribute('aria-modal', 'true');
  form.setAttribute('aria-labelledby', 'player-name-heading');
  Object.assign(form.style, {
    position: 'absolute', width: '340px', boxSizing: 'border-box', padding: '20px 24px',
    background: '#f8e3ba', border: '4px solid #704435', outline: '3px solid #c18a5c',
    color: '#493026', fontFamily: 'Consolas, monospace', textAlign: 'center',
    transformOrigin: 'center', boxShadow: '4px 5px 0 #291d28',
  });
  const heading = document.createElement('h2');
  heading.id = 'player-name-heading'; heading.textContent = words.heading;
  Object.assign(heading.style, { margin: '0 0 10px', fontSize: '20px' });
  const hint = document.createElement('p'); hint.textContent = words.hint;
  Object.assign(hint.style, { margin: '0 0 12px', fontSize: '12px', lineHeight: '1.4' });
  const input = document.createElement('input');
  input.setAttribute('aria-label', words.label); input.autocomplete = 'off'; input.spellcheck = false;
  Object.assign(input.style, { width: '100%', boxSizing: 'border-box', padding: '8px', font: '16px Consolas, monospace', color: '#493026', background: '#fff2d5', border: '2px solid #704435' });
  const note = document.createElement('p'); note.textContent = words.rules;
  note.id = 'player-name-note'; note.setAttribute('aria-live', 'polite'); input.setAttribute('aria-describedby', note.id);
  Object.assign(note.style, { fontSize: '11px', minHeight: '28px', margin: '8px 0', lineHeight: '1.3' });
  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', justifyContent: 'center', gap: '16px' });
  const yes = document.createElement('button'), no = document.createElement('button');
  yes.type = 'submit'; yes.textContent = words.confirm;
  no.type = 'button'; no.textContent = words.cancel;
  for (const button of [yes, no]) Object.assign(button.style, { padding: '8px 12px', font: 'bold 13px Consolas, monospace', color: '#fff2d5', border: '2px solid #493026', background: button === yes ? '#43864b' : '#b74932', cursor: 'pointer' });
  actions.append(yes, no); form.append(heading, hint, input, note, actions); dim.append(form); document.body.append(dim);
  let finished = false;
  const position = () => {
    const rect = scene.game.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / BASE_WIDTH, rect.height / BASE_HEIGHT);
    form.style.left = `${rect.left + anchor.x * rect.width / BASE_WIDTH}px`;
    form.style.top = `${rect.top + anchor.y * rect.height / BASE_HEIGHT}px`;
    form.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };
  const cleanup = () => { dim.remove(); anchor.destroy(); scene.events.off(Phaser.Scenes.Events.POST_UPDATE, position); };
  const finish = (name: string | null) => {
    if (finished) return; finished = true;
    cleanup(); scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    // Don't let the same Enter/pointer event also activate the title menu.
    scene.time.delayedCall(0, () => name === null ? cancel() : accept(name));
  };
  const validate = () => { const valid = normalisePlayerName(input.value) !== null; yes.disabled = !valid; yes.style.opacity = valid ? '1' : '.5'; note.textContent = input.value && !valid ? words.invalid : words.rules; };
  input.addEventListener('input', validate);
  form.addEventListener('submit', event => { event.preventDefault(); const name = normalisePlayerName(input.value); if (name !== null) finish(name); });
  no.addEventListener('click', () => finish(null));
  dim.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); finish(null); }
    if (event.key === 'Tab') {
      const focusable = [input, ...(!yes.disabled ? [yes] : []), no];
      const index = focusable.indexOf(document.activeElement as HTMLInputElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); no.focus(); }
      else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); input.focus(); }
    }
  });
  dim.addEventListener('keyup', event => event.stopPropagation());
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, position);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  validate(); position(); input.focus();
}
