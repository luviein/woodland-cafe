// Where the one save slot lives (GAME_DESIGN.md §6.1). The game only talks
// to this small interface, so the desktop build (milestone 11) can swap the
// browser's localStorage for a file on disk without touching anything else.

export interface SaveSlot {
  /** The saved text, or null if there's no save (or it can't be reached). */
  read(): string | null;
  write(text: string): void;
  clear(): void;
}

const KEY = 'woodland-cafe-save';

/**
 * The browser's localStorage. It can throw (private browsing, storage full
 * or blocked), so every call is wrapped: a failed save logs a warning
 * instead of crashing the game mid-play.
 */
export function browserSaveSlot(): SaveSlot {
  return {
    read: () => {
      try {
        return window.localStorage.getItem(KEY);
      } catch {
        return null;
      }
    },
    write: (text) => {
      try {
        window.localStorage.setItem(KEY, text);
      } catch (e) {
        console.warn('Woodland Cafe: could not save the game', e);
      }
    },
    clear: () => {
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        // Nothing to clear if storage can't be reached.
      }
    },
  };
}

/** A slot in memory only, for tests. */
export function memorySaveSlot(initial: string | null = null): SaveSlot {
  let text = initial;
  return {
    read: () => text,
    write: (t) => (text = t),
    clear: () => (text = null),
  };
}
