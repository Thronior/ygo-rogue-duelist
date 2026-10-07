// Presentation only: results always come from the duel/room, never from this module.
const pips=[[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
const faceAngles=['rotateY(0deg)','rotateY(90deg)','rotateX(90deg)','rotateX(-90deg)','rotateY(-90deg)','rotateY(180deg)'];
const resultAngles=['rotateY(0deg)','rotateY(-90deg)','rotateX(-90deg)','rotateX(90deg)','rotateY(90deg)','rotateY(180deg)'];
function ensureStyles(){
 if(document.getElementById('toss-3d-styles'))return;
 const style=document.createElement('style');style.id='toss-3d-styles';style.textContent=`
.toss3d-row{--size:clamp(42px,10vmin,76px);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:18px;max-width:86vw;padding:16px}
.toss3d-item{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:0}
.toss3d-stage{width:var(--size);height:var(--size);perspective:600px;margin:8px}
.toss3d-object{display:block;position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:var(--result)}
.toss3d-face{position:absolute;inset:0;box-sizing:border-box;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.toss3d-die .toss3d-face{display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);gap:6%;padding:17%;border:1.5px solid #a6e5ef;border-radius:7%;background:#0c2832e8;box-shadow:inset 0 0 12px #71d4df22;transform:var(--face) translateZ(calc(var(--size)/2))}
.toss3d-pip{border:1.5px solid #bceef3;border-radius:50%;background:#71d4df20}
.toss3d-coin .toss3d-face{border-radius:50%;border:1.5px solid #e8cc89;background:#30291ae8;box-shadow:inset 0 0 12px #e8cc8922;display:grid;place-items:center;transform:translateZ(5px)}
.toss3d-coin .toss3d-face.back{transform:rotateY(180deg) translateZ(5px)}
.toss3d-coin svg{width:100%;height:100%;display:block;fill:none;stroke:#eddaa7;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.toss3d-rim{position:absolute;inset:0;border-radius:50%;border:1.5px solid #a58b58;background:transparent;transform:translateZ(var(--depth))}
.toss3d-label{font-size:15px;color:#fff0c2;font-weight:bold;line-height:1.2}
.toss3d-row.rolling .toss3d-label,.toss3d-row.settling .toss3d-label{visibility:hidden}
.toss3d-row.rolling .toss3d-die{animation:toss3d-roll .65s linear infinite}
.toss3d-row.rolling .toss3d-coin{animation:toss3d-flip .55s linear infinite}
.toss-start .toss3d-row{--size:76px;pointer-events:none}.toss-start .toss3d-label{display:none}
.toss3d-paused *{animation-play-state:paused!important}
@keyframes toss3d-roll{from{transform:rotateX(-25deg) rotateY(0) rotateZ(12deg)}to{transform:rotateX(335deg) rotateY(360deg) rotateZ(372deg)}}
@keyframes toss3d-flip{from{transform:rotateX(15deg) rotateY(0)}to{transform:rotateX(15deg) rotateY(360deg)}}
@media(prefers-reduced-motion:reduce){.toss3d-row *{animation:none!important;transition:none!important}}
`;document.head.append(style);
}
export function toss3DMarkup(kind,results,{rolling=false}={}){
 ensureStyles();
 return `<div class="toss3d-row ${rolling?'rolling':''}" role="status" aria-label="${rolling?(kind==='coin'?'Flipping coins':'Rolling dice'):'Results'}">${results.map(raw=>{
 const value=kind==='coin'?(raw?1:0):Math.max(1,Math.min(6,Number(raw)||1));
 const label=kind==='coin'?(value?'HEADS':'TAILS'):String(value);
 const faces=kind==='coin'?`${[-4,-3,-2,-1,0,1,2,3,4].map(z=>`<span class="toss3d-rim" style="--depth:${z}px"></span>`).join('')}<span class="toss3d-face"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="33"/><path d="M25 59H54L47 52V46L52 43V38L57 36L52 29C53 16 32 13 27 26C22 34 28 43 32 47V52Z"/></svg></span><span class="toss3d-face back"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="33"/><path d="M40 18L46 33L63 34L50 45L54 62L40 53L26 62L30 45L17 34L34 33Z"/></svg></span>`:pips.map((dots,i)=>`<span class="toss3d-face" style="--face:${faceAngles[i]}">${dots.map(n=>`<i class="toss3d-pip" style="grid-area:${Math.ceil(n/3)}/${(n-1)%3+1}"></i>`).join('')}</span>`).join('');
 return `<span class="toss3d-item"><span class="toss3d-stage" aria-hidden="true"><span class="toss3d-object toss3d-${kind==='coin'?'coin':'die'}" style="--result:${kind==='coin'?`rotateY(${value?0:180}deg)`:resultAngles[value-1]}">${faces}</span></span><b class="toss3d-label">${label}</b></span>`;
 }).join('')}</div>`;
}
export async function play3DToss(field,kind,results,{wait=ms=>new Promise(r=>setTimeout(r,ms)),active=()=>true,sound=()=>{}}={}){
 const overlay=document.createElement('div');overlay.className=kind==='coin'?'coin-toss':'dice-toss';
 overlay.innerHTML=toss3DMarkup(kind,results,{rolling:true});field.append(overlay);
 const settling=[],spins=[];
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 // Cosmetic randomness only; neither values nor their order are changed.
 const rollingMs=650+Math.floor(Math.random()*500),landingMs=520+Math.floor(Math.random()*240);
 try{
  if(!reduced)for(const node of overlay.querySelectorAll('.toss3d-object')){
   const coin=kind==='coin',direction=Math.random()<.5?-1:1;
   const start=coin?[(Math.random()-.5)*50,Math.random()*360,(Math.random()-.5)*50]:Array.from({length:3},()=>Math.random()*360);
   const turns=coin?[0,360*direction,0]:Array.from({length:3},()=>360*(Math.random()<.5?-1:1)*(Math.random()<.25?2:1));
   const rotation=values=>`rotateX(${values[0]}deg) rotateY(${values[1]}deg) rotateZ(${values[2]}deg)`;
   spins.push(node.animate([{transform:rotation(start)},{transform:rotation(start.map((angle,i)=>angle+turns[i]))}],{duration:(coin?480:560)+Math.random()*360,iterations:Infinity,easing:'linear'}));
  }
  sound(kind==='coin'?'coinflip':'diceroll',.45);
  await wait(reduced?100:rollingMs);
  if(!active()||!overlay.isConnected)return;
  const row=overlay.querySelector('.toss3d-row'),objects=[...row.querySelectorAll('.toss3d-object')];
  // Capture the displayed orientation before removing the spin: no jump to the result.
  const from=objects.map(node=>getComputedStyle(node).transform);
  spins.forEach(animation=>animation.cancel());
  row.classList.add('settling');row.classList.remove('rolling');
  if(!reduced){objects.forEach((node,i)=>settling.push(node.animate([{transform:from[i]},{transform:getComputedStyle(node).transform}],{duration:landingMs,easing:'cubic-bezier(.18,.7,.25,1)',fill:'forwards'})));await wait(landingMs);}
  if(!active()||!overlay.isConnected)return;
  settling.forEach(animation=>animation.cancel());row.classList.remove('settling');row.setAttribute('aria-label',kind==='coin'?results.map(v=>v?'Heads':'Tails').join(', '):`Rolled ${results.join(', ')}`);
  await wait(kind==='coin'?850:1100);
 }finally{spins.forEach(animation=>animation.cancel());settling.forEach(animation=>animation.cancel());overlay.remove()}
}
