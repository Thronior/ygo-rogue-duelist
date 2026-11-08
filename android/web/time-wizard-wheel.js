// Time Wizard's coin toss as its roulette: a yellow arrow spins and stops on a tower (heads) or a skull (tails).
// Presentation only: the engine already tossed the coin; the arrow just stops somewhere in that result's half of the wheel.
export const TIME_WIZARD=71625222;
const ART='assets/time-wizard/';
export const coinFace=heads=>heads?{icon:ART+'tower.webp',label:'HEADS',name:'Tower'}:{icon:ART+'skull.webp',label:'TAILS',name:'Skull'};
// Degrees clockwise from 12 o'clock, measured on wheel.webp: towers fill the top and bottom quarters,
// skulls the four 45° slices between them, so each result owns exactly half the wheel like a coin.
export const WHEEL_SEGMENTS=[[-45,45,true],[45,90,false],[90,135,false],[135,225,true],[225,270,false],[270,315,false]].map(([from,to,heads])=>({from,to,heads}));
const EDGE=7;// keep clear of the black dividers so the arrow never stops on a line

// A spot inside the result's slices, spread evenly over their combined arc. Returns 0-360.
export function landingAngle(heads,random=Math.random){
 const spans=WHEEL_SEGMENTS.filter(s=>s.heads===!!heads).map(s=>[s.from+EDGE,s.to-EDGE]);
 let at=random()*spans.reduce((sum,[a,b])=>sum+b-a,0);
 for(const [a,b] of spans){if(at<=b-a)return ((a+at)%360+360)%360;at-=b-a}
 return ((spans[0][0]%360)+360)%360;
}
export const segmentAt=angle=>{const a=((angle%360)+360)%360;return WHEEL_SEGMENTS.find(s=>a>=s.from&&a<s.to||a-360>=s.from&&a-360<s.to)};

// Heads/Tails are option strings 60/61; anything else is not a coin call.
export const isCoinCall=labels=>labels.length===2&&labels.every(l=>/^(heads|tails)$/i.test(String(l).trim()));

function ensureStyles(){
 if(document.getElementById('time-wizard-wheel-styles'))return;
 const style=document.createElement('style');style.id='time-wizard-wheel-styles';style.textContent=`
.coin-toss.tw-overlay{background:#102732}
.tw-toss{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 18px 14px}
.tw-wheel{--w:min(300px,58vmin);position:relative;width:var(--w);flex:none}
.tw-wheel .tw-wheel-art{display:block;width:100%;height:auto}
.tw-arrow{position:absolute;left:49.8%;top:47.8%;width:0;height:0;transform:rotate(var(--angle,40deg));will-change:transform}
.tw-arrow svg{position:absolute;width:calc(var(--w)*.1148);height:calc(var(--w)*.451);left:calc(var(--w)*-.0574);top:calc(var(--w)*-.41);overflow:visible;filter:drop-shadow(0 2px 2px #0008)}
.tw-legend{display:flex;justify-content:center;gap:22px}
.tw-legend span{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:13px;font-weight:bold;color:#fff0c2;letter-spacing:.04em;transition:opacity .25s,transform .25s}
.tw-legend .tw-icon{width:34px;height:34px;object-fit:contain}
.tw-toss.landed .tw-legend span:not(.won){opacity:.35}
.tw-toss.landed .tw-legend .won{transform:scale(1.25)}
.tw-toss.landed .tw-legend .won .tw-icon{filter:drop-shadow(0 0 6px #ffe58a)}
.toss-start .tw-wheel{--w:min(190px,40vmin)}
.toss-start .tw-legend .tw-icon{width:26px;height:26px}
.tw-calls{display:flex!important;justify-content:center;gap:12px}
.tw-calls button{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:96px;padding:8px 14px}
.tw-calls .tw-call-icon{width:52px;height:52px;object-fit:contain}
.tw-calls button span{font-weight:bold;letter-spacing:.04em}
@media(max-height:480px){.tw-wheel{--w:min(220px,52vmin)}.tw-calls .tw-call-icon{width:38px;height:38px}.tw-legend .tw-icon{width:26px;height:26px}}
`;document.head.append(style);
}

const arrowSvg=`<svg viewBox="-14 -100 28 110" aria-hidden="true"><path d="M-4.2 9V-66H-12L0-91L12-66H4.2V9Z" fill="#ece46c" stroke="#6d5a10" stroke-width="1.6" stroke-linejoin="round"/><path d="M-2.6-69L0-86L2.6-69Z" fill="#fffbd0" opacity=".7"/><circle r="7.4" fill="#c63a20" stroke="#5e1408" stroke-width="1.3"/><circle cx="-2" cy="-2.2" r="2" fill="#f19a7a" opacity=".8"/></svg>`;
const legendMarkup=()=>`<div class="tw-legend">${[true,false].map(h=>{const f=coinFace(h);return `<span data-heads="${h}"><img class="tw-icon" src="${f.icon}" alt="${f.name}">${f.label}</span>`}).join('')}</div>`;
export function wheelMarkup(angle=40){
 ensureStyles();
 return `<div class="tw-toss"><div class="tw-wheel" aria-hidden="true"><img class="tw-wheel-art" src="${ART}wheel.webp" alt="" decoding="async"><span class="tw-arrow" style="--angle:${angle}deg">${arrowSvg}</span></div>${legendMarkup()}</div>`;
}
// The call prompt's Heads/Tails buttons: the result's icon over its name.
export function coinCallLabel(label){ensureStyles();const f=coinFace(/^heads$/i.test(String(label).trim()));return `<img class="tw-call-icon" src="${f.icon}" alt=""><span>${f.label}</span>`}

// Same contract as play3DToss: spins, lands on results[0], shows it, then removes itself.
export async function playWheelSpin(field,results,{wait=ms=>new Promise(r=>setTimeout(r,ms)),active=()=>true,sound=()=>{}}={}){
 const heads=!!results?.[0],start=Math.random()*360,target=landingAngle(heads);
 const overlay=document.createElement('div');overlay.className='coin-toss tw-overlay';overlay.setAttribute('role','status');overlay.setAttribute('aria-label','Spinning the wheel');
 overlay.innerHTML=wheelMarkup(start);field.append(overlay);
 const arrow=overlay.querySelector('.tw-arrow'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 // Cosmetic only: 4-5 full turns and a slightly different stopping time each spin.
 const end=start+360*(4+Math.floor(Math.random()*2))+(((target-start)%360)+360)%360,spinMs=2600+Math.floor(Math.random()*700);
 let spin=null;
 try{
  sound('diceroll',.45);
  if(reduced)arrow.style.setProperty('--angle',target+'deg');
  else{spin=arrow.animate([{transform:`rotate(${start}deg)`},{transform:`rotate(${end}deg)`}],{duration:spinMs,easing:'cubic-bezier(.15,.55,.18,1)',fill:'forwards'});await spin.finished.catch(()=>{});}
  if(!active()||!overlay.isConnected)return;
  const toss=overlay.querySelector('.tw-toss');toss.classList.add('landed');toss.querySelector(`[data-heads="${heads}"]`).classList.add('won');
  overlay.setAttribute('aria-label',heads?'Heads':'Tails');
  await wait(1200);
 }finally{spin?.cancel();overlay.remove()}
}
