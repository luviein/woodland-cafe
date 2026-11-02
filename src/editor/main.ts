import { INGREDIENT_IDS, INGREDIENTS } from '../data/ingredients';
import './editor.css';
import { MODIFIER_IDS, MODIFIERS } from '../data/modifiers';
import { RECIPE_IDS, RECIPES } from '../data/recipes';
import {
  ARROW_TARGETS,
  customerProblems,
  grandmaProblems,
  TIP_IDS,
  TUTORIAL_STEPS,
  WAITS_FOR,
  FOLLOW_UPS_SHOWN,
  waitingLine,
  type CustomerTexts,
  type GrandmaTexts,
  type TextLine,
  type TipId,
  type TutorialStep,
} from '../data/texts/rules';
import { FITS, STEP_FIT, wrappedLines, type Fit } from './fit';

// The game's text editor (GAME_DESIGN.md §9.1), for `npm run dev` only:
// open /editor.html. It loads the two text files from the dev server's
// /__texts route (tools/textEditorApi.mjs), lets every line be edited, added,
// removed or moved, checks each line fits where the game shows it, refuses to
// save anything the game's rules (data/texts/rules.ts) find wrong, and saves
// straight into the files; the running game picks the new words up.
//
// Plain DOM, no framework: one page of lists at a time, rebuilt when lines
// are added, removed or moved, and updated in place while typing (so the
// text box keeps its focus).

type FileName = 'grandma.json' | 'customers.json';

let grandma: GrandmaTexts;
let customers: CustomerTexts;
/** What's on disk, to tell whether there are unsaved changes. */
const saved: Record<FileName, string> = { 'grandma.json': '', 'customers.json': '' };

// ---- Measuring text like the game does --------------------------------------

const measureCanvas = document.createElement('canvas').getContext('2d')!;
function fitWarning(text: string, fit: Fit): string | null {
  measureCanvas.font = fit.font;
  const lines = wrappedLines(text, fit.width, (s) => measureCanvas.measureText(s).width);
  return lines > fit.maxLines ? `Too long for ${fit.where}: ${lines} lines, room for ${fit.maxLines}.` : null;
}

// ---- Pages ------------------------------------------------------------------

interface Page {
  id: string;
  group: string;
  label: string;
  about: string;
  /** Builds the page's lists into `into`. */
  build: (into: HTMLElement) => void;
  /** True when something on the page is too long, to flag it in the list. */
  tooLong: () => boolean;
}

const STEP_LABELS: Record<TutorialStep, string> = {
  intro: 'Welcome',
  takeOrder: 'First customer',
  prep: 'Prep station',
  clean: 'Cleaning',
  freePlay: 'Off you go',
  summary: 'Day summary',
  map: 'Map tour',
  explore: 'Explore reminder',
  farewell: 'Farewell',
};
const TIP_LABELS: Record<TipId, string> = { decorate: 'Decorate', marketplace: 'Marketplace', forest: 'Forest' };

const stepTooLong = (key: TutorialStep | TipId, lines: TextLine[]) => lines.some((l) => fitWarning(l.text, STEP_FIT[key]));
const stringsTooLong = (lines: string[], fit: Fit) => lines.some((l) => fitWarning(l, fit));

function pages(): Page[] {
  const list: Page[] = [];
  for (const step of TUTORIAL_STEPS) {
    list.push({
      id: `tutorial.${step}`,
      group: 'Grandma: tutorial',
      label: STEP_LABELS[step],
      about:
        `Shown in ${STEP_FIT[step].where}, one line at a time.` +
        (WAITS_FOR[step] === 'action'
          ? ' One line waits for the player (no Next) until they do what it asks: pick it with the Next / Waits switch.' +
            (FOLLOW_UPS_SHOWN.has(step)
              ? ' Lines after it show once they have, each with Next.'
              : ' The screen changes as soon as they do, so the waiting line has to be the last.')
          : ' Nothing to wait for here: every line has Next.'),
      build: (into) => into.append(grandmaLines(step, grandma.tutorial[step])),
      tooLong: () => stepTooLong(step, grandma.tutorial[step]),
    });
  }
  for (const tip of TIP_IDS) {
    list.push({
      id: `tips.${tip}`,
      group: 'Grandma: first-visit tips',
      label: TIP_LABELS[tip],
      about: `Shown once, the first time the player opens it, in ${STEP_FIT[tip].where}.`,
      build: (into) => into.append(grandmaLines(tip, grandma.tips[tip])),
      tooLong: () => stepTooLong(tip, grandma.tips[tip]),
    });
  }
  list.push({
    id: 'notes',
    group: 'Grandma: notes',
    label: 'All topics',
    about: 'The notebook behind the ? button: a topic per button, its lines shown together.',
    build: buildNotes,
    tooLong: () => grandma.notes.some((n) => notesPageWarning(n.lines) !== null),
  });
  for (const id of RECIPE_IDS) {
    list.push({
      id: `recipes.${id}`,
      group: 'Customers: orders',
      label: RECIPES[id].name,
      about: 'What a customer says to order it. Direct names the dish; a hint describes it for the player to work out.',
      build: (into) => buildDirectHint(into, customers.recipes[id]),
      tooLong: () => stringsTooLong([...customers.recipes[id].direct, ...customers.recipes[id].hint], FITS.bubble),
    });
  }
  for (const id of INGREDIENT_IDS.filter((id) => id !== 'bread')) {
    list.push({
      id: 'extraIngredients.' + id,
      group: 'Customers: extra ingredients',
      label: INGREDIENTS[id].name,
      about: 'An optional extra filling requested after the base recipe. Direct lines are used in game.',
      build: (into) => buildDirectHint(into, customers.extraIngredients[id]),
      tooLong: () => stringsTooLong(customers.extraIngredients[id].direct, FITS.bubble),
    });
  }
  for (const id of MODIFIER_IDS) {
    list.push({
      id: `modifiers.${id}`,
      group: 'Customers: extras',
      label: MODIFIERS[id].name,
      about: 'Said after the order, asking for this extra.',
      build: (into) => buildDirectHint(into, customers.modifiers[id]),
      tooLong: () => stringsTooLong([...customers.modifiers[id].direct, ...customers.modifiers[id].hint], FITS.bubble),
    });
  }
  list.push({
    id: 'doubleOrder',
    group: 'Customers: extras',
    label: 'Double order',
    about: 'Said before the order when they want two (with the Serving Tray).',
    build: (into) => buildDirectHint(into, customers.doubleOrder),
    tooLong: () => stringsTooLong(customers.doubleOrder.direct, FITS.bubble),
  });
  const moods = [
    ['perfect', 'Happy (perfect dish)'],
    ['close', 'So-so (close enough)'],
    ['wrong', 'Angry (wrong dish)'],
  ] as const;
  list.push({
    id: 'reactions',
    group: 'Customers: reactions',
    label: 'After serving',
    about: "What they say when served: the player's only feedback, so each mood should be easy to read.",
    build: (into) => {
      for (const [mood, title] of moods) into.append(stringLines(title, customers.reactions[mood], FITS.bubble));
    },
    tooLong: () => moods.some(([mood]) => stringsTooLong(customers.reactions[mood], FITS.bubble)),
  });
  list.push({
    id: 'gaveUp',
    group: 'Customers: reactions',
    label: 'Gave up',
    about: 'Said when they run out of patience while their order is being made.',
    build: (into) => into.append(stringLines('Lines', customers.gaveUp, FITS.bubble)),
    tooLong: () => stringsTooLong(customers.gaveUp, FITS.bubble),
  });
  return list;
}

// ---- Building blocks --------------------------------------------------------

/** Makes an element, sets its properties (e.g. className, onclick) and adds its children. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

/** A text box that grows with its text and reports each change. */
function textBox(value: string, onInput: (value: string) => void): HTMLTextAreaElement {
  const box = el('textarea', { value, rows: 1 });
  const grow = () => {
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight + 4}px`;
  };
  box.addEventListener('input', () => {
    onInput(box.value);
    grow();
  });
  requestAnimationFrame(grow);
  return box;
}

/** ↑ ↓ ✕ buttons that move or remove item `i` of `list`, then rebuild the page. */
function rowTools<T>(list: T[], i: number): HTMLElement[] {
  const swap = (a: number, b: number) => {
    [list[a], list[b]] = [list[b], list[a]];
    changed(true);
  };
  return [
    el('button', { title: 'Move up', disabled: i === 0, onclick: () => swap(i, i - 1) }, '↑'),
    el('button', { title: 'Move down', disabled: i === list.length - 1, onclick: () => swap(i, i + 1) }, '↓'),
    el('button', { title: 'Remove', onclick: () => (list.splice(i, 1), changed(true)) }, '✕'),
  ];
}

/** One row: number, text box (with its fit warning under it), tools. */
function row(i: number, value: string, fit: Fit | null, onInput: (v: string) => void, tools: HTMLElement[]): HTMLElement {
  const warn = el('div', { className: 'warn' });
  const showWarning = (text: string) => {
    const w = fit ? fitWarning(text, fit) : null;
    warn.textContent = w ?? '';
    box.classList.toggle('too-long', w !== null);
  };
  const box = textBox(value, (v) => {
    onInput(v);
    showWarning(v);
    changed(false);
  });
  showWarning(value);
  return el('div', { className: 'row' }, el('span', { className: 'num' }, `${i + 1}`), box, el('div', { className: 'tools' }, ...tools), warn);
}

/** Grandma's lines for a step or tip: text plus what her arrow points at. */
function grandmaLines(key: TutorialStep | TipId, lines: TextLine[]): HTMLElement {
  const group = el('div', { className: 'group' }, el('h3', {}, "Grandma's lines"));
  lines.forEach((line, i) => {
    const tools: HTMLElement[] = [];
    if (ARROW_TARGETS[key].length) {
      const pick = el('select', { title: 'What her arrow points at' });
      pick.append(el('option', { value: '' }, 'no arrow'), ...ARROW_TARGETS[key].map((t) => el('option', { value: t }, `→ ${t}`)));
      pick.value = line.arrow ?? '';
      pick.onchange = () => {
        if (pick.value) line.arrow = pick.value;
        else delete line.arrow;
        changed(false);
      };
      tools.push(pick);
    }
    // Action steps: Next, or wait for the player, chosen per line (one line waits).
    const waitsOn = waitingLine(key, lines);
    if (waitsOn >= 0) {
      const mode = el('select', { title: 'Next, or wait for the player to do it' });
      mode.append(el('option', { value: 'next' }, 'Next ▶'), el('option', { value: 'wait' }, '⏳ Waits'));
      mode.value = i === waitsOn ? 'wait' : 'next';
      mode.onchange = () => {
        for (const l of lines) delete l.waits;
        if (mode.value === 'wait') line.waits = true;
        changed(true);
      };
      tools.push(mode);
    }
    tools.push(...rowTools(lines, i));
    const r = row(i, line.text, STEP_FIT[key], (v) => (line.text = v), tools);
    if (i === waitsOn) r.append(el('div', { className: 'waits' }, '⏳ Shows without Next until the player does it.'));
    if (waitsOn >= 0 && i > waitsOn) r.append(el('div', { className: 'waits' }, 'Shown after the player has done it, with Next.'));
    group.append(r);
  });
  group.append(el('button', { className: 'add', onclick: () => (lines.push({ text: '' }), changed(true)) }, '+ Add a line'));
  return group;
}

/** A titled list of plain lines (customers' lines, a notes topic). */
function stringLines(title: string, lines: string[], fit: Fit | null): HTMLElement {
  const group = el('div', { className: 'group' }, el('h3', {}, title));
  lines.forEach((line, i) => group.append(row(i, line, fit, (v) => (lines[i] = v), rowTools(lines, i))));
  group.append(el('button', { className: 'add', onclick: () => (lines.push(''), changed(true)) }, '+ Add a line'));
  return group;
}

function buildDirectHint(into: HTMLElement, lines: { direct: string[]; hint: string[] }): void {
  into.append(stringLines('Direct (names it)', lines.direct, FITS.bubble), stringLines('Hint (describes it)', lines.hint, FITS.bubble));
}

/** A notes topic's lines are shown together, a blank line between each. */
function notesPageWarning(lines: string[]): string | null {
  measureCanvas.font = FITS.notes.font;
  const measure = (s: string) => measureCanvas.measureText(s).width;
  const total = lines.reduce((n, l) => n + wrappedLines(l, FITS.notes.width, measure), 0) + Math.max(0, lines.length - 1);
  return total > FITS.notes.maxLines ? `Too long for ${FITS.notes.where}: ${total} lines, room for ${FITS.notes.maxLines}.` : null;
}

function buildNotes(into: HTMLElement): void {
  grandma.notes.forEach((note, i) => {
    const title = el('input', { className: 'title-input', value: note.title, placeholder: 'Topic title' });
    title.oninput = () => {
      note.title = title.value;
      changed(false);
    };
    const warning = notesPageWarning(note.lines);
    const head = el(
      'div',
      { className: 'row' },
      el('span', { className: 'num' }, `${i + 1}`),
      title,
      el('div', { className: 'tools' }, ...rowTools(grandma.notes, i)),
    );
    if (warning) head.append(el('div', { className: 'warn' }, warning));
    into.append(head, stringLines('Lines', note.lines, null));
  });
  into.append(el('button', { onclick: () => (grandma.notes.push({ title: 'New topic', lines: [''] }), changed(true)) }, '+ Add a topic'));
}

// ---- The page ---------------------------------------------------------------

const root = document.getElementById('editor')!;
const status = el('span', { className: 'status' });
const saveButton = el('button', { className: 'primary', onclick: () => void save() }, 'Save');
const nav = el('nav');
const main = el('main');
let current = 'tutorial.intro';

/** Everything that stops a save: the game's rules, plus any line too long for where it's shown (the tests check that too). */
function problems(): string[] {
  return [...grandmaProblems(grandma), ...customerProblems(customers), ...tooLongProblems()];
}

function tooLongProblems(): string[] {
  const found: string[] = [];
  const check = (where: string, text: string, fit: Fit) => {
    const w = fitWarning(text, fit);
    if (w) found.push(`${where}: ${w}`);
  };
  for (const step of TUTORIAL_STEPS) grandma.tutorial[step].forEach((l, i) => check(`${STEP_LABELS[step]}, line ${i + 1}`, l.text, STEP_FIT[step]));
  for (const tip of TIP_IDS) grandma.tips[tip].forEach((l, i) => check(`${TIP_LABELS[tip]} tip, line ${i + 1}`, l.text, STEP_FIT[tip]));
  grandma.notes.forEach((n) => {
    const w = notesPageWarning(n.lines);
    if (w) found.push(`Notes "${n.title}": ${w}`);
  });
  const customerLines = [
    ...Object.entries(customers.recipes).flatMap(([id, l]) => [...l.direct, ...l.hint].map((t) => [`Order "${id}"`, t])),
    ...Object.entries(customers.modifiers).flatMap(([id, l]) => [...l.direct, ...l.hint].map((t) => [`Extra "${id}"`, t])),
    ...customers.doubleOrder.direct.map((t) => ['Double order', t]),
    ...Object.entries(customers.reactions).flatMap(([mood, l]) => l.map((t) => [`Reactions "${mood}"`, t])),
    ...customers.gaveUp.map((t) => ['Gave up', t]),
  ];
  for (const [where, text] of customerLines) check(where, text, FITS.bubble);
  return found;
}

function unsaved(): FileName[] {
  const now: Record<FileName, string> = { 'grandma.json': JSON.stringify(grandma), 'customers.json': JSON.stringify(customers) };
  return (Object.keys(now) as FileName[]).filter((f) => now[f] !== saved[f]);
}

/** After any edit: rebuild the page if lines were added, removed or moved; always refresh the rest. */
function changed(rebuild: boolean): void {
  if (rebuild) showPage();
  else refreshChrome();
}

function refreshChrome(): void {
  const issues = problems();
  const dirty = unsaved().length > 0;
  saveButton.disabled = !dirty || issues.length > 0;
  status.textContent = issues.length
    ? `Can't save yet: ${issues.length} problem${issues.length > 1 ? 's' : ''} (listed on the page)`
    : dirty
      ? 'Unsaved changes'
      : 'All saved';
  // The list of pages: sections (Grandma, Customers) holding groups
  // (Tutorial, Orders...), each folding open and shut. A flag marks a page,
  // and every group and section around it, where something needs a look.
  nav.replaceChildren();
  const sections = new Map<string, Map<string, HTMLElement[]>>();
  const flaggedFolds = new Set<string>();
  for (const page of pages()) {
    const [section, group] = page.group.split(': ');
    const key = page.id.split('.')[1] ?? page.id;
    const flagged = page.tooLong() || issues.some((p) => p.includes(`"${key}"`));
    const link = el('a', { className: page.id === current ? 'current' : '', onclick: () => ((current = page.id), showPage()) }, page.label);
    if (flagged) {
      link.append(flag());
      flaggedFolds.add(section).add(page.group);
    }
    if (!sections.has(section)) sections.set(section, new Map());
    const groups = sections.get(section)!;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(link);
  }
  for (const [section, groups] of sections) {
    const inner = [...groups].map(([group, links]) => fold(`${section}: ${group}`, group[0].toUpperCase() + group.slice(1), 'group', flaggedFolds, links));
    nav.append(fold(section, section, 'section', flaggedFolds, inner));
  }
  const box = main.querySelector('.problems');
  if (box) box.replaceWith(problemBox(issues));
}

const flag = () => el('span', { className: 'flag', title: 'Something here needs a look' }, '⚠');

/** Which sections and groups are folded shut, remembered in this browser (just a convenience). */
const FOLDED_KEY = 'woodland-text-editor-folded';
const folded = new Set<string>(readFolded());
function readFolded(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** A heading that folds its contents open and shut (a <details> element). */
function fold(id: string, title: string, kind: 'section' | 'group', flagged: Set<string>, children: HTMLElement[]): HTMLElement {
  const summary = el('summary', {}, title);
  if (flagged.has(id)) summary.append(flag());
  const box = el('details', { className: kind, open: !folded.has(id) }, summary, ...children);
  box.addEventListener('toggle', () => {
    if (box.open) folded.delete(id);
    else folded.add(id);
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify([...folded]));
    } catch {
      // Not remembered this time; nothing else depends on it.
    }
  });
  return box;
}

function problemBox(issues: string[]): HTMLElement {
  if (!issues.length) return el('div', { className: 'problems', hidden: true });
  const list = el('ul');
  list.append(...issues.map((p) => el('li', {}, p)));
  return el('div', { className: 'problems' }, el('strong', {}, 'Fix these before saving:'), list);
}

function showPage(): void {
  const page = pages().find((p) => p.id === current) ?? pages()[0];
  main.replaceChildren(el('h2', {}, `${page.group}: ${page.label}`), el('p', { className: 'about' }, page.about), problemBox(problems()));
  page.build(main);
  refreshChrome();
}

async function save(): Promise<void> {
  if (problems().length) return;
  saveButton.disabled = true;
  status.textContent = 'Saving...';
  const texts: Record<FileName, unknown> = { 'grandma.json': grandma, 'customers.json': customers };
  for (const file of unsaved()) {
    const res = await fetch(`/__texts/${file}`, { method: 'POST', body: JSON.stringify(texts[file]) });
    if (!res.ok) {
      status.textContent = `Couldn't save ${file}: ${await res.text()}`;
      saveButton.disabled = false;
      return;
    }
    saved[file] = JSON.stringify(texts[file]);
  }
  refreshChrome();
  status.textContent = 'Saved. The running game picks the new words up.';
}

async function load(): Promise<void> {
  const get = async (file: FileName) => {
    const res = await fetch(`/__texts/${file}`);
    if (!res.ok) throw new Error(`${file}: ${res.status}`);
    const text = await res.text();
    saved[file] = JSON.stringify(JSON.parse(text));
    return JSON.parse(text);
  };
  try {
    [grandma, customers] = await Promise.all([get('grandma.json'), get('customers.json')]);
  } catch {
    root.textContent = "Couldn't load the texts. The editor only works under `npm run dev`.";
    return;
  }
  root.append(el('header', {}, el('h1', {}, 'Woodland Cafe: text editor'), status, saveButton), nav, main);
  showPage();
}

// Leaving with unsaved changes asks first.
window.addEventListener('beforeunload', (event) => {
  if (unsaved().length) event.preventDefault();
});

void load();
