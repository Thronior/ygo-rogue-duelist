// Shareable end-of-run tablet, drawn on canvas so the on-screen card and the copied PNG are identical.
// Stone and crack textures: Poly Haven "Grey Plaster 02" and "Cracked Concrete" (CC0), see assets/CREDITS.md.
import {replayVersion} from './replay-version.js';
import {saveDeckImage} from './save-deck-image.js';
import {curseIconFile} from './experience-ui.js';
export const RUN_CARD_SIZE={width:1080,height:1350};
const W=1080,H=1350,L=80,R=1000,BOSS_EVERY=3;// BOSS_EVERY mirrors content.py.
// Android has no Impact, so the card bundles Bebas Neue (SIL OFL 1.1, notice inside the font file) as the fallback.
const DISPLAY='Impact,"YGO Display","Arial Black",sans-serif',UI='Arial,"Helvetica Neue",sans-serif',SERIF='Georgia,"Noto Serif",serif';
// Challenge level colours from the level badges in mobile.css: [light, dark, edge].
const LEVEL_COLORS={'-1':['#3a5866','#1c2f38','#7fa3b0'],0:['#31966c','#104a36','#72deb1'],1:['#368cd0','#173c89','#85c9ff'],2:['#9860cf','#4b2379','#d5a5ff'],3:['#d14f70','#7d183c','#ff95b1'],4:['#dc853d','#8b3c12','#ffc18c'],5:['#d9a441','#8a5612','#ffe182'],6:['#448ebc','#1f5a80','#b8ecff']};
const LOSS={rim:28,frame:[[0,'#a3aeb7'],[.5,'#7c8892'],[1,'#56616b']],
 tint:'rgba(14,32,42,.46)',glow:'rgba(160,182,196,.1)',panel:'rgba(10,25,34,.86)',line:'rgba(98,137,148,.8)',row:'rgba(25,49,61,.92)',
 ink:'#e8f3f1',soft:'#a9c1c8',accent:'#ff838a',good:'#85ceaa',bad:'#ff838a',edgeLight:'rgba(240,244,248,.55)',edgeDark:'rgba(0,0,0,.6)'};

function rgb(hex){const n=parseInt(hex.slice(1),16);return [n>>16,n>>8&255,n&255]}
function rgba(hex,a){return `rgba(${rgb(hex).join(',')},${a})`}
function mix(a,b,k){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('')}
// A won run's tablet is polished metal in the colour of the challenge level it cleared.
function winStyle(level){
 const [a,b,edge]=LEVEL_COLORS[level]||LEVEL_COLORS[0],shine=mix(edge,'#ffffff',.65);
 // The top two levels get a rarity-style foil on top of the metal: gold glitter, then prismatic secret-rare foil.
 return {rim:44,frame:[[0,b],[.18,edge],[.34,a],[.5,shine],[.66,a],[.84,edge],[1,b]],metal:[a,edge,shine],flair:level===6?'prism':level===5?'glitter':null,
  tint:'rgba(14,34,46,.42)',glow:rgba(a,.22),panel:'rgba(10,27,37,.84)',line:rgba(edge,.55),row:'rgba(25,49,61,.9)',
  ink:'#f4f8f8',soft:mix(edge,'#e8f3f1',.55),accent:edge,good:edge,bad:'#ff838a',edgeLight:'rgba(255,255,255,.9)',edgeDark:rgba(mix(b,'#000000',.4),.85)}
}

function addRR(ctx,x,y,w,h,r){ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function addPoly(ctx,pts){pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath()}
function addCircle(ctx,x,y,r){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);ctx.closePath()}
function path(ctx,add){ctx.beginPath();add(ctx)}
function roman(n){if(!(n>0)||n>3999)return String(n);let s='';for(const [v,r] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=r;n-=v}return s}
function layer(){const c=document.createElement('canvas');c.width=W;c.height=H;return c}
function gradient(ctx,stops,x0,y0,x1,y1){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>g.addColorStop(o,c));return g}

function text(ctx,t,str,x,y,o={}){
 ctx.save();let size=o.size||20;const family=o.family||UI,weight=o.weight||'bold',f=s=>`${weight} ${s}px ${family}`;
 if('letterSpacing' in ctx)ctx.letterSpacing=(o.spacing||0)+'px';ctx.font=f(size);
 if(o.fit)while(size>(o.min||14)&&ctx.measureText(str).width>o.fit){size-=2;ctx.font=f(size)}
 let s=String(str);if(o.max&&ctx.measureText(s).width>o.max){while(s.length>1&&ctx.measureText(s+'…').width>o.max)s=s.slice(0,-1);s=s.trimEnd()+'…'}
 ctx.textAlign=o.align||'left';ctx.textBaseline='alphabetic';
 ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillText(s,x,y+Math.max(1.5,size/20));
 if(o.glow){ctx.shadowColor=o.glow;ctx.shadowBlur=26}
 ctx.fillStyle=o.color||t.ink;ctx.fillText(s,x,y);ctx.restore()
}
function wrap(ctx,str,max,size,weight='normal'){ctx.save();ctx.font=`${weight} ${size}px ${UI}`;const lines=[];let line='';for(const w of String(str).split(/\s+/)){const next=line?line+' '+w:w;if(line&&ctx.measureText(next).width>max){lines.push(line);line=w}else line=next}if(line)lines.push(line);
 // Never leave one short word alone on the last line.
 const n=lines.length;if(n>1&&lines[n-1].length<5){const prev=lines[n-2].split(' ');if(prev.length>1){lines[n-1]=prev.pop()+' '+lines[n-1];lines[n-2]=prev.join(' ')}}
 ctx.restore();return lines}
function panel(ctx,t,x,y,w,h,r=8){ctx.save();path(ctx,c=>addRR(c,x,y,w,h,r));ctx.fillStyle=t.panel;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=t.line;ctx.stroke();ctx.restore()}
function heading(ctx,t,str,cx,y){text(ctx,t,str,cx,y,{size:20,spacing:2,align:'center',color:t.accent})}

function slabShape(won,rand){
 const m=14;
 if(won)return ctx=>addRR(ctx,m,m,W-2*m,H-2*m,18);
 // Broken top-right corner; small chips elsewhere, bottom kept nearly straight.
 const p=[[m,m+10],[m+10,m],[W-196,m],[W-166,m+24],[W-132,m+16],[W-104,m+56],[W-70,m+46],[W-m,m+98],[W-m,612],[W-m-7,624],[W-m-2,632],[W-m,646],[W-m,H-m-9],[W-m-9,H-m]];
 for(const [cx,cw,cd] of [[930,26,7],[742,18,5],[505,34,9],[268,20,6],[120,14,4]]){const j=rand()*.3;p.push([cx+cw/2,H-m],[cx+cw*(.1+j),H-m-cd],[cx-cw*.25,H-m-cd*.55],[cx-cw/2,H-m])}
 p.push([m+9,H-m],[m,H-m-9],[m,790],[m+8,778],[m+3,770],[m,756]);
 return ctx=>addPoly(ctx,p)
}

// The game's own page background, darkened the same way the app does.
function backdrop(ctx,img){
 ctx.fillStyle='#06121a';ctx.fillRect(0,0,W,H);
 if(img){const s=Math.max(W/img.width,H/img.height);ctx.drawImage(img,(W-img.width*s)/2,(H-img.height*s)/2,img.width*s,img.height*s)}
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(4,16,24,.45)');g.addColorStop(1,'rgba(4,16,24,.7)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
}
function tablet(ctx,d,t,shape,tex){
 const f=t.rim+14,field=c=>addRR(c,f,f,W-2*f,H-2*f,d.won?10:4);
 // Frame band: the slab minus its see-through field.
 ctx.save();ctx.beginPath();shape(ctx);field(ctx);ctx.clip('evenodd');
 ctx.fillStyle=gradient(ctx,t.frame,0,0,W,H);ctx.fillRect(0,0,W,H);
 if(d.won){
  const s=gradient(ctx,[[0,'rgba(255,255,255,0)'],[.4,'rgba(255,255,255,0)'],[.47,'rgba(255,255,255,.75)'],[.54,'rgba(255,255,255,0)'],[.78,'rgba(255,255,255,0)'],[.82,'rgba(255,255,255,.5)'],[.86,'rgba(255,255,255,0)']],0,0,W,H*.7);
  ctx.globalCompositeOperation='screen';ctx.fillStyle=s;ctx.fillRect(0,0,W,H);
  if(t.flair)frameFoil(ctx,t,f)
 }else{
  if(tex.stone){ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.35;ctx.drawImage(tex.stone,0,0,W,H);ctx.globalAlpha=1}
  if(tex.cracks){ctx.globalCompositeOperation='multiply';ctx.drawImage(tex.cracks,0,0,W,H)}
 }
 ctx.restore();
 // See-through field tinted with the tablet's material.
 ctx.save();path(ctx,field);ctx.clip();ctx.fillStyle=t.tint;ctx.fillRect(0,0,W,H);
 const g=ctx.createRadialGradient(W/2,180,20,W/2,300,900);g.addColorStop(0,t.glow);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(!d.won&&tex.cracks)fractures(ctx,tex.cracks);
 if(t.flair)fieldFoil(ctx,t,field);
 ctx.restore();
 // Step from the frame down into the field.
 ctx.save();path(ctx,field);ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.55)';ctx.stroke();ctx.translate(-1.5,-1.5);path(ctx,field);ctx.lineWidth=1.5;ctx.strokeStyle=d.won?'rgba(255,255,255,.7)':'rgba(220,230,236,.35)';ctx.stroke();ctx.restore()
}
function sparkle(ctx,x,y,r){ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.quadraticCurveTo(x,y,x,y+r);ctx.quadraticCurveTo(x,y,x-r,y);ctx.quadraticCurveTo(x,y,x,y-r);ctx.fill()}
function frameFoil(ctx,t,f){
 let s=0x5eed;const rand=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};
 ctx.save();
 if(t.flair==='prism'){
  // Secret-rare foil: a rainbow wash plus fine diagonal foil lines.
  ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.95;
  ctx.fillStyle=gradient(ctx,[[0,'#ff6b8a'],[.17,'#ffd36b'],[.34,'#7dffb2'],[.5,'#6bd5ff'],[.67,'#a98cff'],[.84,'#ff7ad9'],[1,'#ff6b8a']],0,0,W,H);ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1.5;ctx.beginPath();
  for(let k=-H;k<W;k+=7){ctx.moveTo(k,0);ctx.lineTo(k+H,H)}ctx.stroke()
 }
 // Glitter scattered over the frame band.
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=t.flair==='prism'?'#f2fdff':'#fff6d2';
 for(let i=0;i<1400;i++){const x=14+rand()*(W-28),y=14+rand()*(H-28);if(x>f&&x<W-f&&y>f&&y<H-f)continue;ctx.globalAlpha=.35+rand()*.65;ctx.fillRect(x,y,1.2+rand()*2,1.2+rand()*2)}
 for(let i=0;i<120;i++){const x=14+rand()*(W-28),y=14+rand()*(H-28);if(x>f&&x<W-f&&y>f&&y<H-f)continue;ctx.globalAlpha=.6+rand()*.4;sparkle(ctx,x,y,4+rand()*rand()*17)}
 ctx.restore()
}
function fieldFoil(ctx,t,field){
 ctx.save();
 if(t.flair==='glitter'){
  // Faint rays of light fanning out from behind the title.
  ctx.fillStyle=rgba(t.accent,.07);for(let i=0;i<32;i++){const a=i/32*Math.PI*2;ctx.beginPath();ctx.moveTo(W/2,140);ctx.arc(W/2,140,1700,a,a+Math.PI/64);ctx.fill()}
 }else{
  const g=gradient(ctx,[[0,'rgba(255,255,255,0)'],[.3,'rgba(255,120,200,.08)'],[.42,'rgba(120,230,255,.12)'],[.54,'rgba(140,255,190,.08)'],[.66,'rgba(255,255,255,0)']],0,0,W,H);
  ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'
 }
 // Light spilling in from the frame onto the field.
 ctx.beginPath();ctx.rect(-200,-200,W+400,H+400);field(ctx);ctx.shadowColor=rgba(t.accent,.6);ctx.shadowBlur=70;ctx.fillStyle='#000';ctx.fill('evenodd');
 ctx.restore()
}
function fractures(ctx,img){
 // The crack map as faint light lines across the glassy field, strongest by the broken corner.
 const c=layer(),x=c.getContext('2d');x.drawImage(img,0,0,W,H);x.globalCompositeOperation='difference';x.fillStyle='#fff';x.fillRect(0,0,W,H);
 x.globalCompositeOperation='destination-in';const m=x.createRadialGradient(W-60,60,40,W-60,60,1400);m.addColorStop(0,'rgba(0,0,0,1)');m.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=m;x.fillRect(0,0,W,H);
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.32;ctx.drawImage(c,0,0);ctx.restore()
}
function edges(ctx,d,t,shape){
 // Outer bevel: lit along the top-left, dark along the bottom-right.
 ctx.save();path(ctx,shape);ctx.clip();const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,t.edgeLight);g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1,t.edgeDark);
 path(ctx,shape);ctx.lineWidth=d.won?10:7;ctx.strokeStyle=g;ctx.stroke();ctx.restore();
 ctx.save();path(ctx,shape);ctx.lineWidth=1.5;ctx.strokeStyle='rgba(0,0,0,.85)';ctx.stroke();ctx.restore()
}

function header(ctx,d,t){
 if(d.eyebrow)text(ctx,t,d.eyebrow,W/2,104,{size:22,spacing:3,align:'center',color:d.won?t.accent:t.bad});
 text(ctx,t,d.title,W/2,d.eyebrow?166:150,{size:62,family:DISPLAY,weight:'normal',spacing:1,fit:R-L,min:36,align:'center',color:d.won?'#ffe066':t.ink,glow:t.flair&&rgba(t.accent,.85)});
}

function niche(c,x,y,w,h){const a=64;c.moveTo(x,y+a);c.quadraticCurveTo(x,y,x+w/2,y);c.quadraticCurveTo(x+w,y,x+w,y+a);c.lineTo(x+w,y+h);c.lineTo(x,y+h);c.closePath()}
function portrait(ctx,d,t,x,y,w,h){
 const add=c=>niche(c,x,y,w,h);
 ctx.save();path(ctx,add);ctx.clip();ctx.fillStyle=t.panel;ctx.fillRect(x,y,w,h);
 const glow=ctx.createRadialGradient(x+w/2,y+h*.42,10,x+w/2,y+h*.42,w*.75);glow.addColorStop(0,d.won?rgba(t.metal[1],.4):'rgba(133,206,170,.16)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x,y,w,h);
 const img=d.portrait;if(img){const s=Math.min((w-10)/img.width,(h-8)/img.height),iw=img.width*s,ih=img.height*s;ctx.drawImage(img,x+(w-iw)/2,y+h-ih,iw,ih)}
 ctx.restore();
 ctx.save();path(ctx,add);ctx.lineWidth=d.won?4:2;ctx.strokeStyle=d.won?gradient(ctx,[[0,t.metal[2]],[.5,t.metal[0]],[1,t.metal[1]]],0,y,0,y+h):t.line;ctx.stroke();ctx.restore()
}

function identity(ctx,d,t,x,y,w){
 text(ctx,t,d.name.toUpperCase(),x,y+60,{size:66,family:DISPLAY,weight:'normal',spacing:1,fit:w,min:34});
 if(d.subtitle)text(ctx,t,d.subtitle,x,y+98,{size:24,weight:'normal',color:t.soft,max:w});
 const ty=y+(d.subtitle?136:112);text(ctx,t,'VICTORIES',x,ty,{size:19,spacing:2,color:t.soft});text(ctx,t,`${d.victories} / ${d.runLength}`,x+w,ty+1,{size:28,align:'right'});
 const step=w/d.runLength;
 for(let i=0;i<d.runLength;i++){
  const duel=d.duels[i]?.name?d.duels[i]:null,boss=(i+1)%BOSS_EVERY===0,cx=x+step*(i+.5),cy=ty+30,r=boss?13:9;
  ctx.save();path(ctx,boss?c=>addPoly(c,[[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]]):c=>addCircle(c,cx,cy,r));
  if(duel){ctx.fillStyle=duel.won?t.good:t.bad;ctx.shadowColor=duel.won?t.good:t.bad;ctx.shadowBlur=d.won?10:0;ctx.fill()}
  else{ctx.lineWidth=2;ctx.strokeStyle=t.line;ctx.stroke()}ctx.restore()
 }
 // Attribute block of the character sheet.
 const gy=ty+56,gap=8,bw=(w-gap*2)/3,bh=d.subtitle?72:80,pad=(bh-72)/2;
 d.stats.forEach(([label,value],i)=>{
  const bx=x+(i%3)*(bw+gap),by=gy+Math.floor(i/3)*(bh+gap);panel(ctx,t,bx,by,bw,bh,6);
  text(ctx,t,value,bx+bw/2,by+pad+40,{size:d.subtitle?33:36,align:'center',fit:bw-16,min:20});
  text(ctx,t,label,bx+bw/2,by+pad+62,{size:15,spacing:.5,align:'center',color:t.soft,fit:bw-12,min:12})
 })
}

function defeat(ctx,d,t,x,y,w,h){
 panel(ctx,t,x,y,w,h);const o=d.outcome;heading(ctx,t,'CAUSE OF DEFEAT',x+w/2,y+36);
 const slot=o.card?{x:x+18,y:y+56,w:126,h:184}:null,tx=slot?x+158:x+22,tw=x+w-14-tx;
 if(slot)ctx.drawImage(o.card,slot.x,slot.y,slot.w,slot.h);
 let ly=y+78;wrap(ctx,o.lead,tw,18).slice(0,5).forEach(s=>{text(ctx,t,s,tx,ly,{size:18,weight:'normal',color:o.cardName?t.soft:t.ink});ly+=23});
 if(o.cardName){ly+=8;wrap(ctx,o.cardName,tw,26,'bold').slice(0,3).forEach(s=>{text(ctx,t,s,tx,ly,{size:26,max:tw});ly+=30})}
 if(o.amount){ly+=36;text(ctx,t,o.amount,tx,ly,{size:46,color:t.bad,fit:tw,min:22});text(ctx,t,'DAMAGE',tx,ly+26,{size:17,spacing:1,color:t.soft})}
 text(ctx,t,o.detail,x+w/2,y+h-20,{size:19,align:'center',weight:'normal',color:t.soft,max:w-26})
}
// The deck from the final duel, laid out like the game's deck export: monsters by ATK, then spells, traps, Extra Deck.
function finalDeck(ctx,d,t,x,y,w,h){
 panel(ctx,t,x,y,w,h);const {main=[],extra=[]}=d.deck||{};
 heading(ctx,t,`FINAL DECK · ${main.length}${extra.length?` + ${extra.length} EXTRA`:''}`,x+w/2,y+36);
 const ax=x+14,ay=y+52,aw=w-28,ah=h-64,g=4,split=extra.length?10:0;let best=null;
 for(let cols=4;cols<=16;cols++){
  const cw=(aw-g*(cols-1))/cols,ch=cw*1.46,rows=Math.ceil(main.length/cols)+Math.ceil(extra.length/cols),used=rows*ch+Math.max(0,rows-1)*g+split;
  if(used<=ah){best={cols,cw,ch,used};break}
 }
 if(!best)return;
 const {cols,cw,ch,used}=best;let top=ay+(ah-used)/2;
 const lay=list=>{list.forEach((img,i)=>{const row=Math.floor(i/cols),inRow=Math.min(cols,list.length-row*cols),ox=ax+(aw-(inRow*cw+(inRow-1)*g))/2,cx=ox+(i%cols)*(cw+g),cy=top+row*(ch+g);
  ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=3;ctx.shadowOffsetY=1.5;ctx.fillStyle='#0b1820';ctx.fillRect(cx,cy,cw,ch);ctx.restore();if(img)ctx.drawImage(img,cx,cy,cw,ch)});
  return Math.ceil(list.length/cols)*(ch+g)};
 top+=lay(main);
 if(extra.length){top+=split-g;lay(extra)}
}

function relicGrid(ctx,d,t,x,y,w,h){
 panel(ctx,t,x,y,w,h);const total=d.relics.reduce((n,r)=>n+(r.count||1),0);heading(ctx,t,`RELICS · ${total}`,x+w/2,y+36);
 h-=curseStrip(ctx,t,d.curses||[],x,y+h,w);
 const n=d.relics.length,slots=[];if(!n){text(ctx,t,'No relics this run',x+w/2,y+h/2+8,{size:22,align:'center',weight:'normal',color:t.soft});return slots}
 // The gap is a sixth of the icon (14px at full size), so long relic lists shrink evenly instead of leaving wide gaps.
 const ax=x+24,ay=y+58,aw=w-48,ah=h-78,k=1/6;let best={s:0,cols:1};
 for(let cols=1;cols<=n;cols++){const rows=Math.ceil(n/cols),s=Math.min(aw/(cols+k*(cols-1)),ah/(rows+k*(rows-1)),84);if(s>best.s)best={s,cols}}
 const {s,cols}=best,rows=Math.ceil(n/cols),g=s*k;
 d.relics.forEach((r,i)=>{const row=Math.floor(i/cols),inRow=row===rows-1?n-row*cols:cols,ox=ax+(aw-(inRow*s+(inRow-1)*g))/2;slots.push({r,x:ox+(i-row*cols)*(s+g),y:ay+(ah-(rows*s+(rows-1)*g))/2+row*(s+g),s})});
 return slots
}
// The curses bosses added this loop, at the foot of the relic panel, drawn like the duel's curse buttons.
// Returns the height it takes.
const CURSE_EDGE={enemy_power:'#ffd06c',drain:'#af8fff'};
function curseStrip(ctx,t,curses,x,bottom,w){
 if(!curses.length)return 0;
 const g=10,n=curses.length,s=Math.max(26,Math.min(46,(w-56-(n-1)*g)/n)),strip=s+64,top=bottom-strip;
 ctx.save();ctx.strokeStyle='rgba(255,110,120,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+24,top);ctx.lineTo(x+w-24,top);ctx.stroke();ctx.restore();
 text(ctx,t,`BOSS CURSES · ${curses.reduce((sum,c)=>sum+c.count,0)}`,x+w/2,top+26,{size:15,spacing:2,align:'center',color:'#ff8a92'});
 const ox=x+(w-(n*s+(n-1)*g))/2,oy=top+40;
 curses.forEach((c,i)=>{
  const cx=ox+i*(s+g),pad=s*.14;
  ctx.save();path(ctx,p=>addRR(p,cx,oy,s,s,7));ctx.fillStyle='rgba(73,25,43,.85)';ctx.fill();
  ctx.lineWidth=1.5;ctx.strokeStyle=CURSE_EDGE[c.key]||'#dc879a';if(c.key==='hunger')ctx.setLineDash([4,3]);ctx.stroke();ctx.restore();
  if(c.img){ctx.save();ctx.imageSmoothingEnabled=false;if(c.key==='hunger'&&'filter' in ctx)ctx.filter='hue-rotate(72deg) saturate(1.25)';ctx.drawImage(c.img,cx+pad,oy+pad,s-2*pad,s-2*pad);ctx.restore()}
  if(c.count>1){const bx=cx+s-3,by=oy+3;ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=4;ctx.shadowOffsetY=2;path(ctx,p=>addCircle(p,bx,by,12));ctx.fillStyle='#ff8a92';ctx.fill();ctx.restore();
   ctx.save();ctx.font=`bold 13px ${UI}`;ctx.textAlign='center';ctx.fillStyle='#2a0710';ctx.fillText('×'+c.count,bx,by+4.5);ctx.restore()}
 });
 return strip;
}
function drawRelics(ctx,d,t,slots){
 for(const {r,x,y,s} of slots){
  ctx.save();path(ctx,c=>addRR(c,x,y,s,s,6));ctx.clip();ctx.fillStyle='#0b1820';ctx.fillRect(x,y,s,s);
  if(r.img){const k=Math.max(s/r.img.width,s/r.img.height);if('filter' in ctx)ctx.filter='saturate(1.3) contrast(1.06)';ctx.drawImage(r.img,x+(s-r.img.width*k)/2,y+(s-r.img.height*k)/2,r.img.width*k,r.img.height*k)}
  ctx.restore();
  // Cursed relics keep a red edge so their drawback reads at a glance.
  ctx.save();path(ctx,c=>addRR(c,x,y,s,s,6));ctx.lineWidth=r.cursed?3:2;ctx.strokeStyle=r.cursed?'#ff4d5a':d.won?t.accent:'#628994';if(r.cursed){ctx.shadowColor='rgba(255,60,75,.55)';ctx.shadowBlur=8}ctx.stroke();ctx.restore();
  if(r.count>1){const bx=x+s-4,by=y+4;ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=4;ctx.shadowOffsetY=2;path(ctx,c=>addCircle(c,bx,by,15));ctx.fillStyle=d.won?t.accent:'#e8f3f1';ctx.fill();ctx.restore();
   ctx.save();ctx.font=`bold 15px ${UI}`;ctx.textAlign='center';ctx.fillStyle='#06121a';ctx.fillText('×'+r.count,bx,by+5);ctx.restore()}
 }
}

// Same rows as the in-game run timeline: dark teal with a win or loss stripe.
function duelRecord(ctx,d,t,x,y,w){
 heading(ctx,t,d.recordTitle,x+w/2,y);
 const gap=10,tw=(w-gap*2)/3,th=64,top=y+16;
 for(let i=0;i<d.runLength;i++){
  const entry=d.duels[i],duel=entry?.name?entry:null,boss=(i+1)%BOSS_EVERY===0,tx=x+(i%3)*(tw+gap),ty=top+Math.floor(i/3)*(th+gap);
  ctx.save();if(!duel)ctx.globalAlpha=.55;path(ctx,c=>addRR(c,tx,ty,tw,th,4));ctx.fillStyle=t.row;ctx.fill();
  if(duel){ctx.fillStyle=duel.won?t.good:t.bad;ctx.fillRect(tx,ty,5,th)}ctx.restore();
  text(ctx,t,roman(i+1),tx+34,ty+41,{size:24,family:SERIF,align:'center',fit:48,min:14,color:boss?t.accent:t.soft});
  text(ctx,t,duel?duel.name:entry?.missing?'Not recorded':'Not reached',tx+66,ty+29,{size:21,max:tw-76,weight:duel?'bold':'normal',color:duel?t.ink:t.soft});
  const result=duel?`${duel.won?'Win':'Loss'} · ${duel.lp.toLocaleString('en-US')} LP${boss?' · Boss':''}`:boss?'Boss':'';
  if(result)text(ctx,t,result,tx+66,ty+53,{size:18,weight:'normal',color:duel&&!duel.won?t.bad:t.soft,max:tw-76})
 }
}

export function drawRunCard(canvas,d){
 canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d'),t=d.won?winStyle(d.challengeLevel):LOSS,tex=d.textures||{};
 let seed=(d.seed>>>0)||1;const rand=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296};
 const shape=slabShape(d.won,rand),top=206;
 ctx.fillStyle='#030a0f';ctx.fillRect(0,0,W,H);
 ctx.save();path(ctx,shape);ctx.clip();backdrop(ctx,tex.backdrop);ctx.restore();
 tablet(ctx,d,t,shape,tex);
 ctx.save();path(ctx,shape);ctx.clip();
 header(ctx,d,t);
 portrait(ctx,d,t,L,top+8,356,414);
 identity(ctx,d,t,L+380,top,R-L-380);
 (d.won?finalDeck:defeat)(ctx,d,t,L,top+430,356,336);
 drawRelics(ctx,d,t,relicGrid(ctx,d,t,L+380,top+430,R-L-380,336));
 duelRecord(ctx,d,t,L,top+804,R-L);
 text(ctx,t,d.footerLeft,L,H-t.rim-34,{size:18,weight:'normal',color:t.soft});
 text(ctx,t,d.footerRight,R,H-t.rim-34,{size:17,spacing:1,align:'right',color:t.soft});
 ctx.restore();
 edges(ctx,d,t,shape);
 return canvas
}

const count=n=>Number(n||0).toLocaleString('en-US');
function runTime(r){const start=+r.started_at||0,end=+r.finished_at||0;if(!start||end<=start)return '';const minutes=Math.max(1,Math.round((end-start)/60));return minutes<60?`${minutes} min`:`${Math.floor(minutes/60)} h ${minutes%60} min`}
// Monsters by ATK (highest first), then spells, then traps, as in deck-image.js.
function deckOrder(ids,card){const kind=id=>{const c=card(id);return c.data.type&1?[0,-(c.atk||0)]:c.data.type&2?[1,0]:[2,0]};return [...ids].sort((a,b)=>{const x=kind(a),y=kind(b);return x[0]-y[0]||x[1]-y[1]})}

// Everything the card shows, as plain data with image URLs; deps come from the client (mobile.js).
export function runCardData(r,{content,character,card,cardImage,relicImage,assetURL=p=>p,finalChallengeName=()=>''}){
 const won=r.stage==='complete',level=r.challenge_level??0,runLength=content.runLength||9,names=id=>content.characters[id]?.name||'Unknown duelist';
 const timeline=r.timeline||[],loop=Math.max(1,...timeline.map(x=>x.loop||1)),latest=timeline.filter(x=>(x.loop||1)===loop);
 // Runs that started before the timeline existed still show which duels were played.
 const played=won?runLength:Math.min(runLength,(r.round||0)+1);
 const duels=Array.from({length:runLength},(_,i)=>{const x=latest.find(x=>x.duel===i+1);return x?{name:names(x.opponent),won:!!x.won,lp:+x.lp_after_healing||0}:i<played?{missing:true}:null});
 const lost=latest.find(x=>!x.won),lostDuel=lost?.duel||played;
 const counts=new Map();for(const id of r.artifacts||[])counts.set(id,(counts.get(id)||0)+1);
 // Boss rewards record their cursed picks; older runs only have the cursed_ prefix to go on.
 const cursedIds=new Set([...(r.cursed_artifacts||[]),...(r.artifacts||[]).filter(id=>id.startsWith('cursed_'))]);
 const relics=[...counts].filter(([id])=>content.artifacts[id]&&content.artifactInfo[id]).map(([id,n])=>({src:relicImage(content.artifactInfo[id].art),count:n,cursed:cursedIds.has(id)}));
 const curseCounts=new Map();for(const x of latest)for(const k of x.curses||[])curseCounts.set(k,(curseCounts.get(k)||0)+1);
 const curses=[...curseCounts].map(([k,count])=>({key:k,name:content.curses?.[k]?.[0]||k,count,src:assetURL(curseIconFile(k))}));
 const s=r.stats||{},stats=[['DAMAGE DEALT',s.damage_dealt],['ATTACKS',s.attacks_declared],['SUMMONS',s.monsters_summoned],['ACTIVATIONS',s.cards_activated],['BOSSES',s.bosses_defeated],['PACKS',s.packs_bought],['COINS EARNED',s.coins_earned],['COINS SPENT',s.coins_spent],['COINS LEFT',r.gold]].map(([k,v])=>[k,count(v)]);
 const when=new Date((+r.finished_at||Date.now()/1000)*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),time=runTime(r);
 const d={won,seed:Math.floor(+r.started_at||1),challengeLevel:level,name:character.name,portrait:assetURL(`assets/${character.sprite}`),victories:r.round||0,runLength,duels,relics,curses,stats,
  recordTitle:loop>1?`DUEL RECORD · LOOP ${loop}`:'DUEL RECORD',footerLeft:time?`${when} · Run time ${time}`:when,footerRight:`YGO ROGUE DUELIST · v${replayVersion}`,
  textures:{backdrop:assetURL('assets/character-select-background.png'),stone:assetURL('assets/ui/run-card-stone.jpg'),cracks:assetURL('assets/ui/run-card-cracks.jpg')}};
 if(won){
  d.title=r.secret_challenge?'SECRET CHALLENGE CLEARED':r.encore_won?`${finalChallengeName(r)} DEFEATED`.toUpperCase():`CHALLENGE LEVEL ${level} CLEARED`;
  // Card artwork is already cached by the startup preload, so the deck uses the same images as the rest of the game.
  const ids=(r.selected||[]).map(i=>r.pool?.[i]).filter(id=>card(id)),extra=id=>card(id).data.type&64;
  d.deck={main:deckOrder(ids.filter(id=>!extra(id)),card).map(cardImage),extra:deckOrder(ids.filter(extra),card).map(cardImage)};
  d.label=`${d.name} won the run at Challenge Level ${level} with ${d.victories} of ${runLength} victories: ${d.title.toLowerCase()}.`
 }else{
  d.eyebrow=`RUN LOST · DUEL ${lostDuel} OF ${runLength}`;d.title='THE SHADOWS CLAIM THIS RUN';d.subtitle=`Challenge LVL ${level}`;
  const killer=r.loss?.card?card(r.loss.card):null,text=String(r.loss?.text||'Your life points reached 0').replace(/\s+—\s+[\d,]+ damage$/,''),at=killer?text.lastIndexOf(killer.name):-1;
  d.outcome={lead:at>0?text.slice(0,at).trim():text,cardName:at>0?killer.name:'',amount:r.loss?.damage>0?count(r.loss.damage):'',detail:lost?`Duel ${lost.duel} · ${names(lost.opponent)}`:`Duel ${lostDuel}`,card:killer?cardImage(killer.id):''};
  d.label=`${d.name} lost on duel ${lostDuel} of ${runLength} at Challenge Level ${level}. ${r.loss?.text||''}`.trim()
 }
 return d
}

const load=src=>src?new Promise(resolve=>{const img=new Image(),done=v=>{clearTimeout(timer);img.onload=img.onerror=null;resolve(v)},timer=setTimeout(()=>done(null),15000);img.onload=()=>done(img);img.onerror=()=>done(null);img.src=src}):Promise.resolve(null);
// Missing artwork leaves an empty slot rather than blocking the card.
async function withImages(d){
 const [portrait,stone,cracks,backdrop,relics,main,extra,card]=await Promise.all([load(d.portrait),load(d.textures.stone),load(d.textures.cracks),load(d.textures.backdrop),
  Promise.all(d.relics.map(async r=>({...r,img:await load(r.src)}))),Promise.all((d.deck?.main||[]).map(load)),Promise.all((d.deck?.extra||[]).map(load)),load(d.outcome?.card)]);
 const curses=await Promise.all((d.curses||[]).map(async c=>({...c,img:await load(c.src)})));
 return {...d,portrait,textures:{stone,cracks,backdrop},relics,curses,deck:d.deck&&{main,extra},outcome:d.outcome&&{...d.outcome,card}}
}

let displayFace=null;
// Loaded once, only when a card is drawn; a slow or offline load falls back to the system fonts.
function displayFont(){
 displayFace??=(async()=>{try{if(typeof FontFace!=='function'||!globalThis.document?.fonts)return;const face=new FontFace('YGO Display','url(assets/fonts/BebasNeue-Regular.ttf)');document.fonts.add(await Promise.race([face.load(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Font timed out')),2500))]))}catch{}})();
 return displayFace;
}
export async function mountRunCard(canvas,run,deps){
 const data=runCardData(run,deps);canvas.setAttribute('aria-label',data.label);
 const [ready]=await Promise.all([withImages(data),displayFont()]);if(!canvas.isConnected)return;
 drawRunCard(canvas,ready);canvas.dataset.ready='1';
 // The finished card is shown as an <img>, so the browser's own "Copy image" works even where scripts may not copy (itch.io's embed).
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(blob&&canvas.isConnected){const img=new Image();img.className='run-card-image';img.alt=data.label;img.src=URL.createObjectURL(blob);await img.decode().catch(()=>{});if(canvas.isConnected){canvas.style.display='none';canvas.after(img)}}
 return ready
}

const base64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Could not prepare the image.'));r.readAsDataURL(blob)});
// Copy puts the PNG on the clipboard. The Android app copies natively (older apps also open the share sheet); phones
// fall back to the share sheet. Desktop browsers never open the system share window: where copying is blocked they explain "Copy image".
export async function copyRunCard(canvas,name){
 if(!canvas?.dataset.ready)return 'The image is still being drawn. Try again in a moment.';
 const png=new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed.')),'image/png'));
 const native=globalThis.ShadowNative;
 if(native?.copyImage)return native.copyImage(name,await base64(await png))?'Copied! Paste it into Discord or any chat.':'Could not prepare the image. Try again.';
 if(native?.shareImage)return native.shareImage(name,await base64(await png))?'Copied! Paste it into Discord, or pick an app to share it.':'Could not prepare the image. Try again.';
 let blocked=false;
 // Safari needs the clipboard write to start inside the tap, so the blob is passed as a promise.
 if(!native&&navigator.clipboard?.write&&typeof ClipboardItem!=='undefined'){try{await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);return 'Copied! Paste it into Discord or any chat.'}catch(e){blocked=e?.name==='NotAllowedError'||e?.name==='SecurityError'}}
 const blob=await png;
 if(native?.saveDeckImage)return `Image copying needs the latest app version. ${await saveDeckImage(blob,name)}`;
 const touch=!!globalThis.matchMedia?.('(pointer:coarse)').matches;
 if(touch&&typeof File!=='undefined'){const file=new File([blob],name+'.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'YGO Rogue Duelist run'});return 'Shared.'}catch(e){if(e?.name==='AbortError')return 'Share cancelled.'}}}
 const embedded=globalThis.top!==globalThis.self;
 if(blocked||embedded)return `${embedded?'This embedded page':'Your browser'} can't copy images. ${touch?'Long-press':'Right-click'} the card and choose Copy image.`;
 await saveDeckImage(blob,name);
 return "This browser can't copy images, so the image was downloaded instead."
}

// Download saves the PNG: the Android app asks where to save it, browsers download it.
export async function saveRunCard(canvas,name){
 if(!canvas?.dataset.ready)return 'The image is still being drawn. Try again in a moment.';
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed.')),'image/png'));
 return saveDeckImage(blob,name);
}
