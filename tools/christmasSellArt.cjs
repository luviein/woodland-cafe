// Import the supplied selling board; clear only fields drawn live by the UI.
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const P=require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const decode=(source,file,w,h)=>{const raw=path.join(os.tmpdir(),file);cp.execFileSync('powershell.exe',['-ExecutionPolicy','Bypass','-File','.claude/skills/pixel-sprites/scripts/decode.ps1',source,raw]);return P.loadRaw(raw,w,h);};
const img=decode('art-templates/christmas-sell-board-source.png','christmas-sell-board.rgb',1615,974);
const ticket=decode('art-templates/christmas-ticket-source.png','christmas-ticket.rgb',1536,1024);
const dark=c=>Math.max(...c)<35;
// Flood only the exterior: dark outlines inside the board remain opaque.
function exterior(image){const seen=new Uint8Array(image.W*image.H),todo=[];
 for(let x=0;x<image.W;x++)todo.push(x,(image.H-1)*image.W+x);
 for(let y=0;y<image.H;y++)todo.push(y*image.W,y*image.W+image.W-1);
 while(todo.length){const at=todo.pop();if(seen[at]||!dark(image.px(at%image.W,Math.floor(at/image.W))))continue;
 seen[at]=1;const x=at%image.W,y=Math.floor(at/image.W);if(x)todo.push(at-1);if(x<image.W-1)todo.push(at+1);if(y)todo.push(at-image.W);if(y<image.H-1)todo.push(at+image.W);}
 return seen;
}
const outside=exterior(img);
const clean=(x,y)=>{
 // Keep the lanterns and their complete shadows outside every live field.
 if(x>=500&&x<=1090&&y>=195&&y<=302)return img.px(1085,y);
 for(const left of [149,598,1046]){
  if(x>=left+170&&x<=left+255&&y>=550&&y<=587)return [249,210,159];
  if(x>=left+20&&x<=left+402&&y>=590&&y<=746)return img.px(left+12,y);
 }
 if(x>=470&&x<=1176&&y>=805&&y<=878)return img.px(470,y);
 return img.px(x,y);
};
// Three source pixels make one native pixel; even canvas dimensions avoid half-pixel placement.
const board=Array.from({length:326},(_,y)=>Array.from({length:540},(_,x)=>{
 const sx=x*3+1,sy=y*3+1;if(sx>=img.W||sy>=img.H||outside[sy*img.W+sx])return null;return clean(sx,sy);
}));
const cut=(x0,y0,w,h)=>Array.from({length:Math.ceil(h/3)},(_,y)=>Array.from({length:Math.ceil(w/3)},(_,x)=>img.px(Math.min(img.W-1,x0+x*3+1),Math.min(img.H-1,y0+y*3+1))));
const one=cut(174,663,180,75),all=cut(365,663,180,75);
const green=grid=>grid.map(row=>row.map(c=>c[2]>c[0]+20&&c[2]>c[1]+6? [Math.round(c[0]*0.52),Math.round(c[1]*0.9+25),Math.round(c[2]*0.5)]:c));
const samples=board.flat().filter(Boolean).filter((_,i)=>i%5===0);
const colours=P.palette([...samples,...one.flat(),...all.flat(),...green(one).flat()],48);
const nearest=c=>{let index=0,score=Infinity;colours.forEach((p,i)=>{const d=p.reduce((n,v,k)=>n+(v-c[k])**2,0);if(d<score){score=d;index=i;}});return index;};
const grids=[board,green(one),one,green(all),all].map(g=>g.map(row=>row.map(c=>c===null?null:nearest(c))));
const converted=P.toRows(grids,colours);
const art={christmasSellBoard:{legend:converted.legend,frames:[converted.rows[0]]},christmasSellOne:{legend:converted.legend,frames:converted.rows.slice(1,3)},christmasSellAll:{legend:converted.legend,frames:converted.rows.slice(3,5)}};
const ticketBox={x0:306,y0:192,x1:1211,y1:831};
const ticketColours=P.palette(P.samplesOf(ticket,[ticketBox],{step:4,isBg:dark}),24);
for(const width of [30,20]){
 const small=P.shrink(ticket,ticketBox,width,ticketColours,{isBg:dark,outlineShare:0.18});
 const data=P.toRows([small.grid],ticketColours);
 art[width===30?'christmasTicket':'christmasTicketSmall']={legend:data.legend,frames:[P.despeck(data.rows[0])]};
}
fs.writeFileSync('src/art/sprites/christmasSell.ts',"import type { PixelSprite } from '../pixelSprite';\n\n// Generated from the supplied selling board and ticket by tools/christmasSellArt.cjs.\nexport const CHRISTMAS_SELL_ART = "+JSON.stringify(art,null,2)+' satisfies Record<string, PixelSprite>;\n');
P.preview(path.join(os.tmpdir(),'christmas-sell-board-review.png'),[{rows:converted.rows[0],legend:converted.legend}],{scale:2,background:'#506e3e'});
P.preview(path.join(os.tmpdir(),'christmas-sell-details-review.png'),Object.values(art).slice(1).flatMap(s=>s.frames.map(rows=>({rows,legend:s.legend}))),{scale:6,perRow:2,background:'#ffe1b8'});
