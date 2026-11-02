import SAVED_ROOM from './cafeRoom.json';

/** Shared by the game and painter; an open cafe keeps its existing Layout. */
export const CAFE_ROOM: readonly string[] = [...SAVED_ROOM];

// Accept a painter save without reloading a running day. New scene visits
// build a fresh layout from these rows, while the current day stays intact.
if (import.meta.hot) {
  import.meta.hot.accept('./cafeRoom.json', module => {
    if (module) (CAFE_ROOM as string[]).splice(0, CAFE_ROOM.length, ...module.default);
  });
}
