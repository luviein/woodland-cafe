// Remove two conversion specks projecting into the gap between the ears.
// Keep both inner ear outlines intact. Run before wardrobeCritters.cjs.
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/art/sprites/sheetCritters.ts');
const before = '.asjjjlsao.oasljjjsa..';
const after = '.asjjjlsa...asljjjsa..';
const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
if (!source.includes(before) && !source.includes(after)) throw Error('Rabbit ear row changed; inspect before applying this fix');
fs.writeFileSync(file, source.split(before).join(after));
