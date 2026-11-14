// Preserve the supplied festive wrapping; replace only the printed crop.
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),ts=require('typescript');
const P=require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const raw=path.join(os.tmpdir(),'christmas-seed-packet.rgb');
cp.execFileSync('powershell.exe',['-ExecutionPolicy','Bypass','-File','.claude/skills/pixel-sprites/scripts/decode.ps1','art-templates/christmas-seed-packet-source.png',raw]);
const img=P.loadRaw(raw,1536,1024),box={x0:448,y0:156,x1:1067,y1:845};
const background=([r,g,b])=>Math.max(r,g,b)<28;
const outside=new Uint8Array(img.W*img.H),todo=[];
for(let x=box.x0;x<=box.x1;x++){todo.push([x,box.y0]);todo.push([x,box.y1]);}
for(let y=box.y0;y<=box.y1;y++){todo.push([box.x0,y]);todo.push([box.x1,y]);}
while(todo.length){const[x,y]=todo.pop(),key=y*img.W+x;
 if(x<box.x0||x>box.x1||y<box.y0||y>box.y1||outside[key]||!background(img.px(x,y)))continue;
 outside[key]=1;todo.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
}
// Two fitted masks follow the cap and stem, leaving the bow, cream label,
// holly leaves and berries intact. A large rectangle would cut into the holly.
const cropMask=(x,y)=>x>=632&&x<=855&&y>=446&&y<=573||x>=686&&x<=805&&y>=554&&y<=640;
const clean={...img,px:(x,y)=>{
 if(!cropMask(x,y))return img.px(x,y);
 const t=Math.max(0,Math.min(1,(y-446)/194));
 return [255,234-7*t,202-14*t];
}};
const colours=P.palette(P.samplesOf(clean,[box],{step:3,isBg:background}),40);
const colour=hex=>{
 const rgb=P.rgbOf(hex),found=colours.findIndex(p=>p.every((v,i)=>v===rgb[i]));
 if(found>=0)return found;colours.push(rgb);return colours.length-1;
};
const print={o:colour('#493026'),r:colour('#c94928'),h:colour('#ee7540'),k:colour('#9c3f2b'),g:colour('#547136'),c:colour('#ffe4b6'),s:colour('#d49c64'),w:colour('#fff0ca')};
const nearest=c=>{let best=0,score=Infinity;colours.forEach((p,i)=>{const d=p.reduce((n,v,k)=>n+(v-c[k])**2,0);if(d<score){score=d;best=i;}});return best;};
const base=(w,h)=>Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>{
 const sx=Math.floor(box.x0+(x+0.5)*(box.x1-box.x0+1)/w),sy=Math.floor(box.y0+(y+0.5)*(box.y1-box.y0+1)/h);
 return outside[sy*img.W+sx]?null:nearest(clean.px(sx,sy));
}));
const kitchen={};new Function('exports',ts.transpileModule(fs.readFileSync('src/art/sprites/kitchen.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(kitchen);
// At shop size, draw connected clusters rather than sampling tiny stitches
// and snowflakes into disconnected stripes. Keep the reference's wrapping.
const shopWrapper=()=>{
 const g=Array.from({length:27},()=>Array(24).fill(null));
 const ink={...print,R:colour('#e9583e'),D:colour('#a6322e'),Y:colour('#ffcf64'),B:colour('#b9782e'),G:colour('#879a45')};
 const run=(y,a,b,c)=>{for(let x=a;x<=b;x++)g[y][x]=ink[c];};
 const stamp=(x,y,rows)=>rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(c!=='.')g[y+j][x+i]=ink[c];}));
 for(let y=0;y<27;y++){
  const left=y<3?5:y<8?4:y<17?3:2;
  const right=y<2?20:y<8?22:y<24?21:20;
  run(y,left,right,'o');
  if(y>0&&y<26){run(y,left+1,right-1,'r');g[y][right-1]=ink.D;g[y][left+1]=ink.R;}
 }
 run(1,6,19,'R');run(2,5,21,'R');
 run(3,5,21,'r');for(const x of [6,9,12,15,18])g[3][x]=ink.Y;
 run(4,5,21,'c');run(5,5,21,'w');run(6,5,20,'c');
 run(7,5,20,'o');run(8,4,20,'g');
 // A cream label with deliberate stepped corners, clear of the side seams.
 for(let y=10;y<=22;y++)run(y,y===10||y===22?8:6,y===10||y===22?15:17,'c');
 run(11,7,16,'w');
 stamp(6,5,['ooo.....ooo','oYYoo.ooYYo','oYhYoYoYhYo','.oooYhYooo.','...oYoYo...','..oYY.YYo..','...oo.oo...']);
 stamp(5,20,['gGg.......gGg','.gGg.....gGg.','..gg..r..gg..','.....rRr.....']);
 run(24,3,19,'c');run(25,3,19,'w');
 for(const x of [5,8,11,14,17])g[23][x]=ink.Y;
 return g;
};
const grids=[],names=[];
// Eight-pixel prints need closed contours: point sampling loses the underside
// of the mushroom and reduces the chilli to a disconnected diagonal.
const shopPrints={
 Mushroom:['..oooo..','.orhhro.','orrrrrro','oooooooo','..occo..','..occo..','..oooo..','........'],
 Tomato:['...gg...','..oggo..','.orhhro.','orrrrrro','orrrrrro','.orrrro.','..oooo..','........'],
 Chilli:['.....gg.','....ogo.','...orro.','..orrro.','.orrro..','orrro...','oooo....','........'],
};
for(const small of [false,true])for(const crop of ['Mushroom','Tomato','Chilli']){
 const grid=small?shopWrapper():base(48,54),icon=kitchen.INGREDIENT_ICONS[crop.toLowerCase()].frames[0];
 const size=small?8:16,ox=small?8:15,oy=small?12:22;
 const ink=small?shopPrints[crop].map(row=>[...row]):Array.from({length:size},(_,y)=>Array.from({length:size},(_,x)=>icon[y][x]));
 ink.forEach((row,y)=>row.forEach((char,x)=>{
  if(char==='.')return;
  // Retain the ingredient's own shading instead of thickening every edge.
  if(grid[y+oy]?.[x+ox]===null||grid[y+oy]?.[x+ox]===undefined)throw Error('Crop lies outside the festive label');
  grid[y+oy][x+ox]=print[char];
 }));
 // The shop keeps the same padded 24x29 canvas as its ordinary packets.
 const padded=small?[Array(24).fill(null),...grid,Array(24).fill(null)]:grid;
 grids.push(padded);names.push(`seed${small?'Shop':''}Packet${crop}Christmas`);
}
const converted=P.toRows(grids,colours);
const art=Object.fromEntries(names.map((name,i)=>[name,{legend:converted.legend,frames:[P.despeck(converted.rows[i])]}]));
fs.writeFileSync('src/art/sprites/christmasSeedPackets.ts',"import type { PixelSprite } from '../pixelSprite';\n\n// Generated by tools/christmasSeedPackets.cjs from the supplied Christmas packet.\nexport const CHRISTMAS_SEED_PACKET_ART = "+JSON.stringify(art,null,2)+' satisfies Record<string, PixelSprite>;\n');
P.preview(path.join(os.tmpdir(),'christmas-packets-review.png'),Object.values(art).map(sprite=>({rows:sprite.frames[0],legend:sprite.legend})),{scale:6,perRow:3,background:'#ffe6c2'});
