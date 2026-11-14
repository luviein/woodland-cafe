// Import the supplied board, retaining its decorations and clearing only live row fields.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const P=require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const raw=path.join(os.tmpdir(),'woodland-seed-shop.rgb');
cp.execFileSync('powershell.exe',['-ExecutionPolicy','Bypass','-File','.claude/skills/pixel-sprites/scripts/decode.ps1','art-templates/seed-shop-source.png',raw]);
const img=P.loadRaw(raw,1536,1024);
const background=([r,g,b])=>Math.max(r,g,b)<35;
// Flood from the exterior so dark outlines inside the board stay opaque.
const exterior=new Uint8Array(img.W*img.H),todo=[];
for(let x=0;x<img.W;x++){todo.push(x);todo.push((img.H-1)*img.W+x);}
for(let y=0;y<img.H;y++){todo.push(y*img.W);todo.push(y*img.W+img.W-1);}
while(todo.length){const at=todo.pop();if(at<0||at>=exterior.length||exterior[at])continue;
 const x=at%img.W,y=Math.floor(at/img.W);if(!background(img.px(x,y)))continue;
 exterior[at]=1;if(x>0)todo.push(at-1);if(x<img.W-1)todo.push(at+1);if(y>0)todo.push(at-img.W);if(y<img.H-1)todo.push(at+img.W);
}
const colours=P.palette(P.samplesOf(img,[{x0:0,y0:0,x1:1535,y1:1023}],{step:4,isBg:background}),48);
const nearest=c=>{let best=0,score=Infinity;colours.forEach((p,i)=>{const d=p.reduce((n,v,k)=>n+(v-c[k])**2,0);if(d<score){score=d;best=i;}});return best;};
const rowRanges=[[312,424],[434,545],[555,671],[682,801]];
const step=3;
// Protect the complete soft shadow geometrically. A darkness threshold kept
// the ink but erased the lighter shadow colours, leaving square gaps.
const lanternShadow=(x,y)=>{
 if(y<306||y>=330)return false;
 const half=y<=317?44:y<=323?38:30;
 return Math.abs(x-196)<=half||Math.abs(x-1340)<=half;
};
const frame=Array.from({length:342},(_,y)=>Array.from({length:512},(_,x)=>{
 const sx=x*step+1,originalY=Math.min(1023,y*step+1);if(exterior[originalY*1536+sx])return null;
 // Drop the whole row stack six native pixels, leaving the lanterns above it.
 let sy=originalY;
 const shifted=sx>=186&&sx<=1362&&originalY>=306&&originalY<=822;
 if(shifted){
  if(lanternShadow(sx,originalY))return nearest(img.px(sx,originalY));
  sy=originalY-18;
  if(sy<312)return nearest(img.px(1146,300));
 }
 const row=rowRanges.find(([top,bottom])=>sy>=top&&sy<=bottom-5);
 if(row){
  // Do not carry a second copy of the lantern bases down with the moved row.
  if(shifted&&row[0]===312&&lanternShadow(sx,sy))return nearest(img.px(684,sy));
  // Replace baked-in sample bags/names and prices/counts with the row's own paper.
  // The row border, centre divider and purchase button remain from the reference.
  if(sx>=210&&sx<=692)return nearest(img.px(684,sy));
  if(sx>=724&&sx<=1152)return nearest(img.px(1146,sy));
  if(sx>=1160&&sx<=1338)return nearest(img.px(1146,sy));
 }
 return nearest(img.px(sx,sy));
}));
// Rebuild the few pixels below each base as one continuous, fading shadow.
// The reference's old row line runs through this area; copying it would leave
// disconnected gold strips even after the original colour clipping is fixed.
const paper=img.px(1146,300);
for(const sourceX of [196,1340]){
 const cx=Math.round(sourceX/step),shade=img.px(sourceX,316);
 const base=[];
 for(let x=cx-16;x<=cx+16;x++){
  const colour=colours[frame[104][x]];
  if(colour&&colour[0]<180&&colour[1]<130)base.push(x);
 }
 if(base.length)for(let x=cx-16;x<=cx+16;x++)if(x<base[0]||x>base.at(-1))frame[104][x]=nearest(paper);
 for(let y=105;y<=109;y++)for(let x=cx-16;x<=cx+16;x++)frame[y][x]=nearest(paper);
 [1,0.65,0.4,0.2].forEach((strength,dy)=>{
  const half=[11,10,8,6][dy];
  const colour=nearest(paper.map((value,i)=>value+(shade[i]-value)*strength));
  for(let x=cx-half;x<=cx+half;x++)frame[105+dy][x]=colour;
 });
}
// Clearing reference text and shifting rectangular strips clipped the row corners.
// Rebuild the complete row surface and closed outlines, rather than patching edges.
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const lowerPaper=img.px(1146,822);
for(let y=110;y<=275;y++)for(let x=62;x<=454;x++)frame[y][x]=nearest(mix(paper,lowerPaper,(y-110)/165));
const rowBounds=[[110,147],[151,188],[191,230],[233,273]];
const rim=nearest([237,189,131]),glint=nearest([255,240,209]);
for(const [top,bottom] of rowBounds){
 const left=63,right=453,height=bottom-top+1;
 const inset=y=>{const end=Math.min(y,height-1-y);return end===0?4:end===1?2:end===2?1:0;};
 const inside=(x,y)=>y>=0&&y<height&&x>=left+inset(y)&&x<=right-inset(y);
 for(let y=0;y<height;y++)for(let x=left;x<=right;x++){
  if(!inside(x,y))continue;
  const edge=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>!inside(x+dx,y+dy));
  frame[top+y][x]=edge?rim:y===1||x===left+inset(y)+1?glint:nearest(mix([255,232,198],[255,223,180],y/(height-1)));
 }
 for(let y=top+8;y<=bottom-8;y++)frame[y][235]=rim;
}
const crop=(x0,y0,w,h)=>Array.from({length:Math.ceil(h/step)},(_,y)=>Array.from({length:Math.ceil(w/step)},(_,x)=>nearest(img.px(Math.min(x0+w-1,x0+x*step+1),Math.min(y0+h-1,y0+y*step+1)))));
const buy=crop(1164,328,168,84),disabled=crop(1164,448,168,84);
const badge=(x,y,w,h)=>{
 const grid=crop(x,y,w,h);
 // Keep the reference's rounded pill border but replace its sample status text.
 for(let j=4;j<grid.length-4;j++)for(let i=5;i<grid[j].length-5;i++)grid[j][i]=nearest([249,211,161]);
 return grid;
};
const lockedBadge=badge(852,458,284,64);
const ownedBadge=badge(872,336,188,64);
// Widen the count pill so the larger type still has padding as quantities grow.
for(const row of ownedBadge)while(row.length<81)row.splice(Math.floor(row.length/2),0,row[Math.floor(row.length/2)]);
// Add paper through the middle of the pill, retaining its original rounded border.
while(lockedBadge.length<30)lockedBadge.splice(Math.floor(lockedBadge.length/2),0,[...lockedBadge[Math.floor(lockedBadge.length/2)]]);
const imported=P.toRows([frame,buy,disabled,ownedBadge,lockedBadge],colours);
const art={seedShopBoard:{legend:imported.legend,frames:[imported.rows[0]]},seedShopBuy:{legend:imported.legend,frames:[imported.rows[1],imported.rows[2]]},
 seedShopOwnedBadge:{legend:imported.legend,frames:[imported.rows[3]]},seedShopLockedBadge:{legend:imported.legend,frames:[imported.rows[4]]}};
// Smaller native copies leave padding without fractional runtime scaling.
const ts=require('typescript'),packets={};
new Function('exports',ts.transpileModule(fs.readFileSync('src/art/sprites/seedPackets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(packets);
const kitchen={};
new Function('exports',ts.transpileModule(fs.readFileSync('src/art/sprites/kitchen.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(kitchen);
function polishPacket(rows,sourceLegend,crop){
 const legend={...sourceLegend};
 const colour=hex=>{
  const existing=Object.keys(legend).find(key=>legend[key]===hex);if(existing)return existing;
  const key=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz'].find(key=>!(key in legend));
  if(!key)throw Error('Packet palette exhausted');legend[key]=hex;return key;
 };
 const ink=colour('#493026'),paper=colour('#ffd09a'),shade=colour('#e6a46b'),light=colour('#ffe4b6'),fold=colour('#b56d42');
 const filled=P.fillHoles(rows,paper),mask=filled.map(row=>[...row].map(c=>c!=='.'));
 const on=(x,y)=>mask[y]?.[x]??false;
 const clean=filled.map((row,y)=>[...row].map((char,x)=>{
  if(!on(x,y))return '.';
  // One connected contour replaces the double-thick sampled dark pixels.
  if([[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>!on(x+dx,y+dy)))return ink;
  if(y<6)return char==='o'?shade:char;
  if(y===6)return fold;
  if(y===7)return shade;
  const left=mask[y].indexOf(true),right=mask[y].lastIndexOf(true);
  if(y>=25)return x>right-4?fold:shade;
  if(x===left+1||x>=right-2)return shade;
  if(x===left+2)return light;
  return paper;
 }));
 // Native ingredient pictures retain every outline, stem and mushroom spot;
 // resampling the larger packet illustrations broke those single-pixel details.
 const print={o:ink,r:colour('#c94928'),h:colour('#ee7540'),k:colour('#9c3f2b'),
  g:colour('#547136'),c:light,s:colour('#d49c64'),w:colour('#fff0ca')};
 const icon=kitchen.INGREDIENT_ICONS[crop.toLowerCase()];
 icon.frames[0].forEach((row,y)=>[...row].forEach((char,x)=>{
  if(char==='.')return;
  const px=x+5,py=y+9;
  if(!on(px,py)||!on(px-1,py)||!on(px+1,py)||!on(px,py-1)||!on(px,py+1))throw Error(crop+' illustration touches the bag rim');
  if(!print[char])throw Error('Unknown crop print colour '+char);
  clean[py][px]=print[char];
 }));
 return {legend,frames:[clean.map(row=>row.join(''))]};
}
for(const crop of ['Mushroom','Tomato','Chilli']){
 const packet=packets.SEED_PACKET_ART['seedPacket'+crop],source=packet.frames[0],w=24,h=29;
 const small=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>source[Math.floor((y+0.5)*source.length/h)][Math.floor((x+0.5)*source[0].length/w)]).join(''));
 art['seedShopPacket'+crop]=polishPacket(small,packet.legend,crop);
}
fs.writeFileSync('src/art/sprites/seedShop.ts',"import type { PixelSprite } from '../pixelSprite';\n\n// Generated by tools/seedShopArt.cjs from the supplied board.\nexport const SEED_SHOP_ART = "+JSON.stringify(art,null,2)+' satisfies Record<string, PixelSprite>;\n');
P.preview(path.join(os.tmpdir(),'seed-shop-board-review.png'),[{rows:imported.rows[0],legend:imported.legend}],{scale:2,background:'#506e3e'});
P.preview(path.join(os.tmpdir(),'seed-shop-details-review.png'),Object.entries(art).filter(([name])=>name!=='seedShopBoard').flatMap(([,sprite])=>sprite.frames.map(rows=>({rows,legend:sprite.legend}))),{scale:5,perRow:3,background:'#ffe1b8'});
