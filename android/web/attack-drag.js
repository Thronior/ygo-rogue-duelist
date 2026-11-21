// Drag to attack (user, 2026-11-21). In your Battle Phase, press a monster that can attack and drag it:
// onto an opponent's monster to attack it; onto an empty opponent field (or their LP) for a direct attack; and when the
// attacker can attack directly past monsters, onto the opponent's Spell & Trap Zones for that direct attack.
// A drop never invents a response: it replays the taps (Attack, then "Attack directly?" yes/no, then the target), so
// tapping keeps working exactly as before. Nothing runs until a press lands on a zone marked .can-attack; while
// dragging, the only per-frame work is one transform on the arrow, and every rect is read once when the drag starts.

export const DRAG_START_PX=12;

const inside=(r,x,y)=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;

// The drop target under (x, y). Monster targets win over the direct-attack areas behind them.
export function dropTarget(targets,x,y){
 for(const t of targets)if(t.kind==='monster'&&inside(t.rect,x,y))return t;
 for(const t of targets)if(t.kind==='direct'&&inside(t.rect,x,y))return t;
 return null;
}

// Where a drag may drop, from the opponent's board. zones: [{player,loc,seq,occupied,rect,el}], extras: rects of the
// opponent's LP / portrait. canDirect is the attack entry's can_direct; L carries the location constants.
export function dragTargets({zones,extras=[],canDirect,L}){
 const enemy=zones.filter(z=>z.player===1),monsters=enemy.filter(z=>z.loc===L.MZONE&&z.occupied),out=[];
 for(const z of monsters)out.push({kind:'monster',seq:z.seq,rect:z.rect,el:z.el});
 if(!canDirect)return out;
 if(!monsters.length){
  // Empty field: anywhere on their side counts, the gaps between zones included.
  for(const z of enemy)out.push({kind:'direct',rect:z.rect,el:z.el});
  const box=enemy.reduce((b,z)=>b?{left:Math.min(b.left,z.rect.left),top:Math.min(b.top,z.rect.top),right:Math.max(b.right,z.rect.right),bottom:Math.max(b.bottom,z.rect.bottom)}:{left:z.rect.left,top:z.rect.top,right:z.rect.right,bottom:z.rect.bottom},null); // DOMRect fields are getters: never spread one
  if(box)out.push({kind:'direct',rect:box,el:null});
 }else for(const z of enemy)if(z.loc===L.SZONE)out.push({kind:'direct',rect:z.rect,el:z.el});
 for(const e of extras)out.push({kind:'direct',rect:e.rect,el:e.el});
 return out;
}

// The tap a drag still owes once the engine asks the next battle question, or null when the prompt is not part of
// this attack. hint is the engine's selection hint (549 = choose the attack target); attacker is engine.attacker.
export function dragAttackStep(intent,pending,{M,L,hint,attacker}){
 if(!intent||!pending||pending.player!==0)return null;
 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(pending.type)&&Number(pending.description)===31)return {kind:'yesno',yes:!!intent.direct};
 if(pending.type===M.SELECT_CARD&&hint===549&&!intent.direct&&attacker?.player===0&&attacker.sequence===intent.attacker){
  const index=(pending.selects||[]).findIndex(c=>c.controller===1&&c.location===L.MZONE&&c.sequence===intent.target);
  return index>=0?{kind:'target',index}:null;
 }
 return null;
}

// DOM wiring. api: {M,L,active(), attackFor(seq) -> {choice,canDirect}|null, declare(choice,seq), answerYesNo(yes),
// chooseTarget(index), pending(), hint(), attacker(), busy(), root}.
export function installAttackDrag(api){
 let press=null,drag=null,intent=null,suppressClick=0,stepTimer=0;
 const doc=document;
 function zoneInfo(el){const [player,loc,seq]=(el.dataset.zone||'').split(',').map(Number);return {player,loc,seq,occupied:!el.classList.contains('empty'),rect:el.getBoundingClientRect(),el}}
 function begin(p,e){
  const at=api.attackFor(p.seq);if(!at)return cancel();
  const root=api.root(),zones=[...root.querySelectorAll('.zone[data-zone^="1,"]')].map(zoneInfo);
  const extras=[...root.querySelectorAll('.life.enemy,.field-character:not(.own)')].map(el=>({rect:el.getBoundingClientRect(),el}));
  const targets=dragTargets({zones,extras,canDirect:at.canDirect,L:api.L});
  if(!targets.length)return cancel();
  const r=p.el.getBoundingClientRect(),arrow=doc.createElement('div');arrow.className='attack-drag-arrow';arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<i></i>';
  Object.assign(arrow.style,{left:r.left+r.width/2+'px',top:r.top+r.height/2+'px'});doc.body.append(arrow);
  // The card itself follows the finger (user, 2026-11-21), held where it was grabbed. A copy of its picture, sized once.
  const img=p.el.querySelector?.('img'),ir=img?img.getBoundingClientRect():r,card=doc.createElement('div');card.className='attack-drag-card';card.setAttribute('aria-hidden','true');
  Object.assign(card.style,{left:ir.left+'px',top:ir.top+'px',width:ir.width+'px',height:ir.height+'px'});
  if(img){const copy=doc.createElement('img');copy.src=img.currentSrc||img.src;copy.alt='';copy.draggable=false;card.append(copy)}
  doc.body.append(card);
  p.el.classList.add('attack-drag-source');
  for(const t of targets)t.el?.classList.add(t.kind==='monster'?'attack-drag-target':'attack-drag-direct');
  drag={...p,choice:at.choice,targets,arrow,card,x0:r.left+r.width/2,y0:r.top+r.height/2,over:null,raf:0,x:e.clientX,y:e.clientY};
  api.onStart?.();
  move(e);
 }
 function paint(){
  if(!drag)return;drag.raf=0;const dx=drag.x-drag.x0,dy=drag.y-drag.y0;
  // Transforms only: the trail stretches, the card moves with the finger, and nothing is laid out again.
  const d=Math.hypot(dx,dy);drag.arrow.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;drag.arrow.firstChild.style.transform=`scaleX(${d})`;
  drag.card.style.transform=`translate3d(${drag.x-drag.sx}px,${drag.y-drag.sy}px,0) scale(1.08)`;
 }
 function move(e){
  drag.x=e.clientX;drag.y=e.clientY;
  const over=dropTarget(drag.targets,drag.x,drag.y);
  if(over!==drag.over){drag.over?.el?.classList.remove('attack-drag-over');over?.el?.classList.add('attack-drag-over');drag.arrow.classList.toggle('on-target',!!over);drag.card.classList.toggle('on-target',!!over);drag.over=over}
  if(!drag.raf)drag.raf=requestAnimationFrame(paint);
 }
 function cleanup(){
  if(drag){cancelAnimationFrame(drag.raf);drag.arrow.remove();drag.card.remove();drag.el.classList.remove('attack-drag-source');for(const t of drag.targets)t.el?.classList.remove('attack-drag-target','attack-drag-direct','attack-drag-over')}
  drag=null;press=null;
 }
 function cancel(){cleanup()}
 function drop(e){
  const d=drag;d.x=e.clientX;d.y=e.clientY;const over=dropTarget(d.targets,d.x,d.y);cleanup();
  if(!over||!api.active()||api.pending()!==d.prompt)return;
  const at=api.attackFor(d.seq);if(!at)return;
  intent={attacker:d.seq,target:over.kind==='monster'?over.seq:null,direct:over.kind==='direct',prompt:d.prompt,until:performance.now()+5000};
  api.declare(at.choice,d.seq);
 }
 doc.addEventListener('pointerdown',e=>{
  if(drag||press||!e.isTrusted||e.button!==0||!e.isPrimary)return;
  const el=e.target.closest?.('.zone.can-attack[data-zone^="0,"]');if(!el||!api.active())return;
  const seq=+el.dataset.zone.split(',')[2];
  press={id:e.pointerId,el,seq,sx:e.clientX,sy:e.clientY,prompt:api.pending()};
 },true);
 doc.addEventListener('pointermove',e=>{
  if(!press||e.pointerId!==press.id)return;
  if(drag)return move(e);
  if(Math.hypot(e.clientX-press.sx,e.clientY-press.sy)<DRAG_START_PX)return;
  if(!api.active()||api.pending()!==press.prompt||!press.el.isConnected)return cancel();
  begin(press,e);
 },{passive:true});
 doc.addEventListener('pointerup',e=>{
  if(!press||e.pointerId!==press.id)return;
  if(!drag){press=null;return}
  suppressClick=performance.now()+400;drop(e);
 },true);
 doc.addEventListener('pointercancel',e=>{if(press&&e.pointerId===press.id)cancel()},true);
 window.addEventListener('blur',()=>cancel());
 // The click that ends a drag is not a tap on whatever lies under the finger.
 doc.addEventListener('click',e=>{if(performance.now()<suppressClick){suppressClick=0;e.preventDefault();e.stopImmediatePropagation()}},true);
 // A mouse must not start the browser's own image drag on the card.
 doc.addEventListener('dragstart',e=>{if(e.target.closest?.('.zone.can-attack')||drag)e.preventDefault()},true);
 // Called on every duel render: answers the next battle question this drag owes, then stops.
 function step(){
  stepTimer=0;if(!intent)return;
  const pending=api.pending();
  if(performance.now()>intent.until||!api.active(true)){intent=null;return}
  if(pending===intent.prompt)return; // the attack is still being sent (Tag) or the board is redrawing
  if(api.busy()){stepTimer=setTimeout(step,60);return}
  const next=dragAttackStep(intent,pending,{M:api.M,L:api.L,hint:api.hint(),attacker:api.attacker()});
  if(!next){intent=null;return}
  intent.prompt=pending;
  if(next.kind==='yesno'){if(intent.direct)intent=null;api.answerYesNo(next.yes)}
  else{intent=null;api.chooseTarget(next.index)}
 }
 return {
  afterRender(){if(intent&&!stepTimer)stepTimer=setTimeout(step,0)},
  cancel(){cancel();intent=null;clearTimeout(stepTimer);stepTimer=0},
  get dragging(){return !!drag},
 };
}
