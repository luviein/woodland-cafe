// Shared crop silhouettes keep regular and mutation sprites consistent.
module.exports = function polishCrop(sprite, crop) {
  if (crop === 'tomato') {
    sprite = { ...sprite, frames: sprite.frames.map((frame, index) => {
      if (index < 2) return frame;
      const rows = frame.map(row => [...row]);
      // Ellipse extrema leave isolated-looking points. Flatten the exposed
      // sides and bottoms, then close both sides of each rim. The inner
      // extrema share the stalk's outline, but their coloured pixels must
      // still be inset just like the exposed outer edges.
      for (const [x,y] of [[3,14], [21,18], [7,18], [17,22]]) rows[y][x] = '.';
      for (const [x,y] of [[4,14], [10,14], [14,18], [20,18], [7,17], [17,21]]) rows[y][x] = 'o';
      return rows.map(row => row.join(''));
    }) };
  }
  if (crop === 'mushroom') {
    sprite = { ...sprite, frames: sprite.frames.map((frame, index) => {
      if (index === 0) return frame;
      const rows = frame.map(row => [...row].map(() => '.'));
      const mushrooms = index === 1 ? [[12,17,3]] : index === 2 ? [[12,15,5]] : [[8,17,5],[17,14,5]];
      for (const [cx,cy,radius] of mushrooms) {
        // Explicit dome widths avoid the ellipse's one-pixel spikes. Draw a
        // complete cap rim separately from its stem, including where they meet.
        for (let y = cy + 1; y <= cy + 6; y++) for (let x = cx - 2; x <= cx + 2; x++) {
          rows[y][x] = x === cx - 2 || x === cx + 2 || y === cy + 6 ? 'o' : 'c';
        }
        const widths = [radius - 2, radius - 1, radius, radius, radius, radius];
        widths.forEach((half,dy) => {
          const y = cy - 4 + dy;
          for (let x = cx - half; x <= cx + half; x++) {
            rows[y][x] = dy === 0 || dy === widths.length - 1 || x === cx - half || x === cx + half
              ? 'o' : index === 3 ? 'r' : 's';
          }
        });
        rows[cy - 2][cx - 2] = 'c';
        rows[cy - 2][cx - 1] = 'c';
      }
      return rows.map(row => row.join(''));
    }) };
  }

  if (crop === 'chilli') {
    sprite = { ...sprite, frames: sprite.frames.map((frame, stage) => {
      if (stage < 2) return frame;
      const rows = frame.map(row => [...row]);
      // Close the shoulder and taper the tip without leaving a gap by the stalk.
      for (const [x,y] of [[7,14],[17,18]]) {
        // Remove the old rectangular tip before drawing the new pointed end.
        for (let dy = 4; dy <= 5; dy++) for (let dx = 0; dx <= 1; dx++) rows[y+dy][x+dx] = '.';
        const pepper = ['ooooo','ogrro','oraro','orrro','.orro','.oro.','..o..'];
        pepper.forEach((row,dy) => [...row].forEach((char,dx) => {
          rows[y-2+dy][x-2+dx] = stage === 2 ? ({r:'g',a:'l'}[char] ?? char) : char;
        }));
      }
      return rows.map(row => row.join(''));
    }) };
  }
  return sprite;
};
