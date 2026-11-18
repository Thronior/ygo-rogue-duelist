export const EXODIA_DURATION=5000;
export const isExodiaWin=result=>Number(result?.reason)===0x10;
export const isCardWin=result=>[0x10,0x11,0x15].includes(Number(result?.reason));
// Final Countdown (0x11; CITYDRIVER on Discord, design picked by the user 2026-11-18, "Orbit of flames"): 20 flames circle the
// card and catch fire one turn at a time, the last three slowly; they rush into the card, the screen goes dark for a beat
// and burns up from the bottom in the blue card flames (the 5000+ ATK ones), which die down for the result.
// Performance: only transform and opacity animate; unlit flames are a still image and a flame animates only once lit; every
// flame shares the game's two flame files per colour (one decode each, done before the finale starts); the burn is 9 large
// flames. Reduce Motion, Performance Mode and Compatibility Mode get the card, a lit still ring and the result, no movement.
const FLAMES=20,SLOW=3;
async function playCountdown(result){
 const {assetURL}=await import('./startup-assets.js');
 const html=document.documentElement,still=matchMedia('(prefers-reduced-motion: reduce)').matches||html.classList.contains('performance-mode')||html.classList.contains('compatibility-mode');
 const src=name=>assetURL(`assets/effects/${name}`),orange=['flame-a.webp','flame-b.webp'].map(src),blue=['flame-hot-a.webp','flame-hot-b.webp'].map(src),unlit=src('flame-still.png');
 const el=(tag,cls,parent)=>{const e=document.createElement(tag);if(cls)e.className=cls;parent?.append(e);return e};
 const panel=el('dialog','exodia-finale final-countdown-finale');panel.setAttribute('aria-label','Final Countdown duel result');
 const stage=el('div','fc-stage',panel),ring=el('div','fc-ring',stage),card=el('img','final-countdown-card',stage);card.src=assetURL('assets/cards/95308449.jpg');card.alt='Final Countdown';
 const radius=Math.min(innerWidth,innerHeight)*.36,flames=[];
 for(let i=0;i<FLAMES;i++){
  const a=i/FLAMES*Math.PI*2-Math.PI/2,x=Math.round(Math.cos(a)*radius),y=Math.round(Math.sin(a)*radius);
  const box=el('div','fc-flame',ring);box.style.transform=`translate(${x}px,${y}px)`;box.dataset.x=x;box.dataset.y=y;
  const up=el('div','fc-up',box),img=el('img','',up);img.alt='';img.src=unlit;const n=el('b','',up);n.textContent=String(FLAMES-i);flames.push(box);
 }
 const veil=el('div','fc-veil',panel),glow=el('div','fc-glow',panel),burn=el('div','fc-burn',panel),flash=el('div','fc-flash',panel);
 const title=el('h1','exodia-finale-result',panel);title.textContent=result.player===0?'You win':result.player===1?'You lose':'Tie';title.setAttribute('role','status');title.style.opacity='0';
 panel.addEventListener('cancel',event=>event.preventDefault());document.body.append(panel);
 const animations=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const anim=(node,frames,options)=>{const a=node.animate(frames,{fill:'both',easing:'cubic-bezier(.2,.8,.2,1)',...options});animations.push(a);return a};
 // Decode the shared images first so nothing stutters once the finale moves (capped so a slow device never waits long).
 const decode=url=>{const i=new Image();i.src=url;return i.decode().catch(()=>{})};
 await Promise.race([Promise.all([card.src,...(still?[unlit]:[unlit,...orange,...blue])].map(decode)),wait(700)]);
 try{
  panel.showModal();
  if(still){
   for(const box of flames){box.classList.add('lit');box.style.opacity='1'}
   anim(card,[{opacity:0},{opacity:1}],{duration:300});anim(ring,[{opacity:0},{opacity:1}],{duration:300});
   await wait(1300);anim(title,[{opacity:0},{opacity:1}],{duration:300});await wait(1800);return;
  }
  anim(card,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(.9)'}],{duration:400});
  const entries=flames.map((box,i)=>anim(box,[{opacity:0,transform:`translate(${box.dataset.x*.6}px,${box.dataset.y*.6}px)`},{opacity:1,transform:`translate(${box.dataset.x}px,${box.dataset.y}px)`}],{duration:300,delay:i*18}));
  // The ring turns while every flame and number turns back by the same amount, so they stay upright.
  const turn={duration:3000,easing:'linear'};anim(ring,[{transform:'rotate(0)'},{transform:'rotate(30deg)'}],turn);
  for(const box of flames)anim(box.firstChild,[{rotate:'0deg'},{rotate:'-30deg'}],turn);
  await wait(650);
  for(let i=0;i<FLAMES;i++){
   const slow=i>=FLAMES-SLOW,img=flames[i].firstChild.firstChild;img.src=orange[i%2];flames[i].classList.add('lit');
   anim(img,[{opacity:.45,transform:'scale(.55)'},{opacity:1,transform:'scale(1.25)',offset:.5},{opacity:1,transform:'scale(1)'}],{duration:slow?380:220,easing:'ease-out'});
   await wait(slow?380:75);
  }
  await wait(150);
  // The implode starts where the entry ended, so the entry animations can go.
  for(const a of entries)a.cancel();
  flames.forEach((box,i)=>anim(box,[{opacity:1,transform:`translate(${box.dataset.x}px,${box.dataset.y}px)`},{opacity:0,transform:'translate(0,0) scale(.3)'}],{duration:380,delay:i*8,easing:'cubic-bezier(.6,0,.9,.4)'}));
  await wait(520);
  // The orbit is gone: drop its images so nothing hidden keeps animating during the burn.
  ring.replaceChildren();
  await anim(veil,[{opacity:0},{opacity:.92}],{duration:180}).finished;await wait(220);
  // The burn: two rows of blue flames rise from the bottom and cover the screen, then die down for the result.
  anim(glow,[{opacity:0},{opacity:1,offset:.5},{opacity:.85}],{duration:900});anim(veil,[{opacity:.92},{opacity:.55}],{duration:500});
  const rows=[['back',5,0],['front',4,140]],fire=[];
  for(const [row,count,delay] of rows)for(let i=0;i<count;i++){
   const f=el('img','fc-burn-flame '+row,burn);f.alt='';f.src=blue[(i+(row==='front'))%2];
   f.style.left=`${(row==='front'?(i+.5)/count:i/(count-1))*100}%`;fire.push(f);
   anim(f,[{opacity:0,transform:'translate(-50%,70%) scale(.6,.4)'},{opacity:1,transform:'translate(-50%,0) scale(1,1)',offset:.55},{opacity:1,transform:'translate(-50%,-4%) scale(1.05,1.12)'}],{duration:900,delay:delay+i*45});
  }
  anim(card,[{opacity:1,transform:'scale(.9)'},{opacity:1,transform:'scale(1.1)',offset:.4},{opacity:1,transform:'scale(1)'}],{duration:500,delay:200});
  anim(flash,[{opacity:.35},{opacity:0}],{duration:520,easing:'ease-out'});
  anim(stage,[{transform:'translate(0,0)'},{transform:'translate(-9px,5px)'},{transform:'translate(8px,-6px)'},{transform:'translate(-5px,-4px)'},{transform:'translate(4px,4px)'},{transform:'translate(0,0)'}],{duration:420,easing:'linear',fill:'none'});
  await wait(1100);
  for(const f of fire)anim(f,[{opacity:1,transform:'translate(-50%,-4%) scale(1.05,1.12)'},{opacity:.75,transform:'translate(-50%,48%) scale(1,.7)'}],{duration:700,easing:'ease-in-out'});
  anim(glow,[{opacity:.85},{opacity:.45}],{duration:700});anim(veil,[{opacity:.55},{opacity:0}],{duration:700});
  await wait(450);
  await anim(title,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:500}).finished;await wait(1400);
 }finally{for(const animation of animations)animation.cancel();panel.close();panel.remove()}
}const layouts={16:[70903634,8124921,33396948,44519536,7902349],21:[94212438,31893528,67287533,94772232,30170981]};
let playing=null;
export function playCardWin(result){
 if(!isCardWin(result))return Promise.resolve();
 if(playing)return playing;
 playing=(async()=>{
  if(Number(result.reason)===0x11)return playCountdown(result);
  const destiny=Number(result.reason)===0x15,pieces=layouts[Number(result.reason)];
  const panel=document.createElement('dialog');panel.className='exodia-finale';panel.setAttribute('aria-label',destiny?'Destiny Board duel result':'Exodia duel result');
  const cards=document.createElement('div');cards.className='exodia-finale-cards';
  for(const code of pieces){const img=document.createElement('img');img.src=`assets/cards/${code}.jpg`;img.alt=destiny?'FINAL'[pieces.indexOf(code)]:code===33396948?'Exodia the Forbidden One':'Exodia piece';cards.append(img)}
  const title=document.createElement('h1');title.textContent=result.player===0?'You win':result.player===1?'You lose':'Tie';title.className='exodia-finale-result';title.setAttribute('role','status');
  panel.append(cards,title);panel.addEventListener('cancel',event=>event.preventDefault());document.body.append(panel);
  const animations=[];
  try{
   panel.showModal();
   [...cards.children].forEach((img,i)=>animations.push(img.animate([{opacity:0,offset:0},{opacity:0,offset:i*.1},{opacity:1,offset:i*.1+.2},{opacity:1,offset:1}],{duration:EXODIA_DURATION,fill:'both',easing:'linear'})));
   const text=title.animate([{opacity:0,offset:0},{opacity:0,offset:.6},{opacity:1,offset:.7},{opacity:1,offset:1}],{duration:EXODIA_DURATION,fill:'both',easing:'linear'});animations.push(text);
   // Held 150 ms past the animation so the last sounds finish.
   await text.finished;await new Promise(resolve=>setTimeout(resolve,150));
  }finally{for(const animation of animations)animation.cancel();panel.close();panel.remove()}
 })().finally(()=>{playing=null});return playing;
}

export const playExodiaFinale=playCardWin;
