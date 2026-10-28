// Base (logical) resolution the whole game is designed at. Everything is laid
// out in these units, and the Scale Manager stretches the canvas to the window.
// 640x360 is 16:9 and scales by whole numbers to 1280x720 (x2), 1920x1080 (x3)
// and 2560x1440 (x4), so common screens get perfectly crisp pixels.
export const BASE_WIDTH = 640;
export const BASE_HEIGHT = 360;

// Every grid (cafe floor, UI layout) uses this tile size.
export const TILE_SIZE = 16;
