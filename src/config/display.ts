// Base (logical) resolution the whole game is designed at. Everything is laid
// out in these units, and the Scale Manager stretches the canvas to the window.
// 640x360 is 16:9 and scales by whole numbers to 1280x720 (x2), 1920x1080 (x3)
// and 2560x1440 (x4), so common screens get perfectly crisp pixels.
export const BASE_WIDTH = 640;
export const BASE_HEIGHT = 360;

// The cafe's grid: its floor, walls and furniture are 24x24, so the critters
// (about 30-38 tall) stand about 1.5 tiles high (GAME_DESIGN.md §8.2).
export const TILE_SIZE = 24;

// The outdoor ground and the map's grass are 16x16 art tiles; outdoor
// walking speeds are counted in these too.
export const GROUND_TILE = 16;
