// Offline only: the seven code-drawn duel backgrounds, exported to video by tools/export_duel_scenes.cjs.
// Scenes are drawn on a 1024 x 1024 stage centred on the field. `seconds` is the loop: every layer repeats a
// whole number of times inside it, so the last frame runs straight into the first.
(()=>{
const url=(w,h,body)=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
const rng=seed=>()=>(seed=Math.imul(seed^seed>>>15,seed|1)+0x6d2b79f5|0,((seed^seed>>>14)>>>0)/4294967296);
const attr=style=>style.replaceAll('"','&quot;');
const layer=(cls,style='')=>`<div class="l ${cls}" style="${attr(style)}"></div>`;
// A tiled layer moves by `tiles` whole tiles per loop, so its picture lands exactly on itself.
const scroll=(direction,image,tile,tiles,seconds)=>{
 const distance=tile*tiles,size=`background:${image} 0 0/${tile}px ${tile}px;`;
 return layer('scroll',size+(direction==='left'?`right:-${distance}px;bottom:0;--to:-${distance}px,0`:direction==='up'?`right:0;bottom:-${distance}px;--to:0,-${distance}px`:`right:0;bottom:0;top:-${distance}px;--to:0,${distance}px`)+`;animation-duration:${seconds}s`);
};
const dots=(seed,count,sizes,color)=>{const r=rng(seed);let s='';for(let i=0;i<count;i++){const size=sizes[Math.floor(r()*sizes.length)];s+=`<circle cx='${(12+r()*488).toFixed(1)}' cy='${(12+r()*488).toFixed(1)}' r='${size}' fill='${color}' opacity='${(.4+r()*.6).toFixed(2)}'/>`}return url(512,512,s)};
const sparks=(seed,count,sizes)=>{const r=rng(seed);let s=`<defs><radialGradient id='e'><stop offset='0' stop-color='#ffe9b0'/><stop offset='.35' stop-color='#ff9a3c'/><stop offset='1' stop-color='#ff3c00' stop-opacity='0'/></radialGradient></defs>`;for(let i=0;i<count;i++){const size=sizes[Math.floor(r()*sizes.length)];s+=`<circle cx='${(16+r()*480).toFixed(1)}' cy='${(16+r()*480).toFixed(1)}' r='${size}' fill='url(#e)' opacity='${(.5+r()*.5).toFixed(2)}'/>`}return url(512,512,s)};
// Twelve-fold, so turning it by 60 degrees lands on itself.
function ring(){const c=500,gold='#e8c47a';let s=`<g fill='none' stroke='${gold}'><circle cx='${c}' cy='${c}' r='480' stroke-width='5' opacity='.6'/><circle cx='${c}' cy='${c}' r='446' stroke-width='3' opacity='.45'/><circle cx='${c}' cy='${c}' r='360' stroke-width='3.5' opacity='.4'/>`;
 for(let i=0;i<72;i++){const a=i*5*Math.PI/180,long=i%6===0,r0=long?446:462;s+=`<line x1='${(c+Math.cos(a)*r0).toFixed(1)}' y1='${(c+Math.sin(a)*r0).toFixed(1)}' x2='${(c+Math.cos(a)*480).toFixed(1)}' y2='${(c+Math.sin(a)*480).toFixed(1)}' stroke-width='${long?5:3}' opacity='.6'/>`}
 for(let i=0;i<12;i++){const a=(i*30+15)*Math.PI/180,x=c+Math.cos(a)*403,y=c+Math.sin(a)*403;s+=`<g transform='translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${i*30+105})' stroke-width='3.5' opacity='.6'><path d='M-18 16L0-20L18 16Z'/><circle r='5'/></g>`}
 return url(1000,1000,s+'</g>')}
// Six-fold, the same for 60 degrees.
function star(){const c=500,gold='#e8c47a',point=(i,r)=>{const a=(i/6)*Math.PI*2-Math.PI/2;return `${(c+Math.cos(a)*r).toFixed(1)} ${(c+Math.sin(a)*r).toFixed(1)}`},tri=off=>`M${point(off,352)}L${point(2+off,352)}L${point(4+off,352)}Z`;
 return url(1000,1000,`<g fill='none' stroke='${gold}' stroke-width='4.5' opacity='.5'><path d='${tri(0)}'/><path d='${tri(1)}'/><circle cx='${c}' cy='${c}' r='176'/><circle cx='${c}' cy='${c}' r='58'/></g>`)}
// Hieroglyphs from the Unicode Egyptian block, set in temple columns: ankh, eye of Horus, djed, was sceptre,
// scarab, falcon, cobra, owl, feather, sun, lotus, water, reed, viper, mouth, hand, house, quail chick, foot.
const HIEROGLYPHS=[0x132F9,0x13080,0x132BD,0x13300,0x131A3,0x13143,0x13197,0x13153,0x13184,0x131F3,0x131B8,0x13216,0x131CB,0x13191,0x1308B,0x1309D,0x13250,0x13171,0x130C0,0x133CF];
function hieroglyphs(seed,columns,rows,size,color,rule){
 const r=rng(seed),width=512/columns,height=512/rows;let s=`<g font-family='Segoe UI Historic' font-size='${size}' text-anchor='middle' fill='${color}'>`;
 for(let c=0;c<columns;c++){s+=`<line x1='${c*width}' y1='0' x2='${c*width}' y2='512' stroke='${rule}' stroke-width='2'/>`;for(let row=0;row<rows;row++){if(r()<.12)continue;const glyph=String.fromCodePoint(HIEROGLYPHS[Math.floor(r()*HIEROGLYPHS.length)]);s+=`<text x='${(c+.5)*width}' y='${(row+.5)*height+size*.36}' opacity='${(.55+r()*.45).toFixed(2)}'>&#x${glyph.codePointAt(0).toString(16)};</text>`}}
 return url(512,512,s+'</g>')}
const round=(radius,image,seconds,back,turn)=>layer('round',`--r:${radius}px;--turn:${back?'-':''}${turn}deg;background-image:${image};animation-duration:${seconds}s`);
window.duelScenes={
 summoning:{seconds:24,palette:'#0a1016',html:()=>`<div class="still glow"></div>${round(306,ring(),24,false,60)}${round(306,star(),24,true,60)}`},
 stars:{seconds:60,palette:'#070a16',html:()=>scroll('left',dots(11,44,[1.3,1.6],'#cfe2ff'),256,1,60)+scroll('left',dots(23,40,[1.9,2.3],'#ffffff'),512,1,60)+scroll('left',dots(37,14,[3,3.6],'#bcd6ff'),512,2,60)},
 embers:{seconds:48,palette:'#1a0a0a',html:()=>scroll('up',sparks(5,30,[4,5]),512,1,48)+scroll('up',sparks(9,16,[6,8]),512,2,48)+scroll('up',sparks(14,8,[10,13]),512,3,48)},
 aurora:{seconds:96,palette:'#07101e',html:()=>layer('band a')+layer('band b')+layer('band c')},
 ripples:{seconds:16,palette:'#061319',html:()=>[0,1,2,3].map(i=>layer('ring',`animation-delay:${-i*4}s`)).join('')},
 rays:{seconds:24,palette:'#1b1409',html:()=>layer('fan a')+layer('fan b')+`<div class="still fade"></div>`},
 glyphs:{seconds:48,palette:'#0b0d0a',html:()=>scroll('down',hieroglyphs(4,16,16,22,'#4d6a5a70','#3d5a4a18'),512,1,48)+scroll('down',hieroglyphs(12,11,11,34,'#9a8344','#a8853a30'),512,2,48)+`<div class="still fade"></div>`},
};
})();
