// Stack duplicate cards in the deck editors (Discord suggestion, user 2026-11-14; look C chosen). Copies of the same
// card collapse into one tile with one pip per copy (gold = in the Deck). Misprinted copies (card_mods) never stack:
// each keeps its own tile. Switched on in Settings › Gameplay; device preference, like the deck sort.
// Taps: a stack adds one copy to the Deck; once every copy is in (or the copy limit is reached), the next tap takes
// them all out (data-stack-clear). The small − takes out one copy. In the split view each pane stacks its own copies,
// so a Deck-pane tap removes one and a Collection-pane tap adds one, as before.
const ON_KEY='ygo-deck-stacks';
export function stacksOn(){try{return localStorage.getItem(ON_KEY)==='1'}catch{return false}}
export function setStacks(on){try{localStorage.setItem(ON_KEY,on?'1':'0')}catch{}}

const keyOf=(run,i)=>run.card_mods&&run.card_mods[i]!==undefined?`${run.pool[i]}#${i}`:String(run.pool[i]);

// `order` is the editor's visible order; returns the first index of each stack in that order, plus its copies.
// `limit` is the copy limit (copyLimit in deck-minimum.js; null = none): a stack at the limit counts as full, so its
// next tap takes the copies out instead of failing to add one. Misprinted copies count toward it too.
export function groupStacks(order,run,selected,limit=3){
 const inDeck=new Set(selected),groups=new Map(),reps=[],perCard=new Map();
 for(const i of selected)perCard.set(run.pool[i],(perCard.get(run.pool[i])||0)+1);
 for(const i of order){const k=keyOf(run,i);let g=groups.get(k);if(!g){g={rep:i,all:[],in:[],out:[]};groups.set(k,g);reps.push(i)}g.all.push(i);(inDeck.has(i)?g.in:g.out).push(i)}
 for(const g of groups.values())g.atLimit=limit!=null&&(perCard.get(run.pool[g.rep])||0)>=limit;
 const byRep=new Map([...groups.values()].map(g=>[g.rep,g]));
 return {order:reps,stack:i=>byRep.get(i)};
}

// Rewrites one card button for its stack. `attr` is the host's toggle attribute name ('data-pick' or 'data-index'),
// `extra` the other attributes the host's tap handler needs on the − (e.g. data-tag="card"). `pane` is 'deck',
// 'collection' or '' for the single grid.
export function stackButton(html,g,{attr,extra='',pane='',locked=false}){
 if(!g)return html;
 const total=g.all.length,inDeck=g.in.length,single=!pane;
 // The tile's own toggle: add the next copy, else remove (all copies in the single grid, one in the Deck pane).
 let target=g.rep,clear='';
 if(pane==='deck')target=g.in[g.in.length-1]??g.rep;
 else if(pane==='collection')target=g.out[0]??g.rep;
 else if(g.out.length&&!(g.atLimit&&g.in.length))target=g.out[0];
 else{target=g.in[0];if(g.in.length>1)clear=` data-stack-clear="${g.in.join(',')}"`}
 const op=clear?'clear':g.in.includes(target)?'remove':'add';
 html=html.replace(new RegExp(`${attr}="\\d+"`),`${attr}="${target}" data-stack-op="${op}"`);
 if(total<2)return html;
 html=html.replace('<button ',`<button data-stack="${total}"${clear} `).replace('class="cardbtn','class="cardbtn stacked');
 if(single)html=html.replace(/class="cardbtn([^"]*) selected/,'class="cardbtn$1').replace('class="cardbtn',`class="cardbtn ${inDeck?'selected':''}`).replace(/aria-pressed="\w+"/,`aria-pressed="${inDeck>0}"`);
 const minus=single&&inDeck&&!locked?`<span class="stack-minus" role="button" aria-label="Take one copy out of the Deck" ${attr}="${g.in[g.in.length-1]}" data-stack-op="remove" ${extra}>−</span>`:'';
 const pips=(single?[...g.in.map(()=>1),...g.out.map(()=>0)]:g.all.map(()=>pane==='deck'?1:0)).slice(0,10);
 const label=single?`${inDeck} of ${total} copies in the Deck`:`${total} copies`;
 return html.replace(/<\/button>\s*$/,`<span class="stack-pips" aria-label="${label}">${pips.map(on=>`<i class="${on?'on':''}"></i>`).join('')}${total>10?`<b>+${total-10}</b>`:''}</span>${minus}</button>`);
}

// Quick taps (Nori, Discord 2026-11-20): the grid is redrawn after each tap, and a tap made before the redraw used to
// toggle the copy the old grid named, so a second quick − put that copy back in. A tap now keeps what it meant when it
// was drawn (data-stack-op: add, remove or clear; a card without stacks toggles) and is resolved against the deck as it
// is when the tap runs. Returns {op, index}.
export function tapIntent(el,attr='pick'){return {op:el?.dataset?.stackOp||'toggle',index:Number(el?.dataset?.[attr])}}

// Applies taps in order to a copy of `selected`. Returns the pool indices to toggle, in order, and the new selection.
// `limit` (copy limit, null = none) only drops adds when given; `blocked` counts the adds it dropped.
export function applyTaps(run,selected,taps,limit=null){
 const sel=[...selected],toggles=[];let blocked=0;
 const has=i=>sel.includes(i),flip=i=>{const at=sel.indexOf(i);if(at>=0)sel.splice(at,1);else sel.push(i);toggles.push(i)};
 const full=i=>limit!=null&&sel.reduce((n,j)=>n+(run.pool[j]===run.pool[i]),0)>=limit;
 for(const {op,index:i} of taps){
  if(!Number.isInteger(i)||i<0||i>=run.pool.length)continue;
  if(op==='toggle'){if(!has(i)&&full(i)){blocked++;continue}flip(i);continue}
  const key=keyOf(run,i),copies=[];run.pool.forEach((id,j)=>{if(id===run.pool[i]&&keyOf(run,j)===key)copies.push(j)});
  if(op==='clear')copies.filter(has).forEach(flip);
  else if(op==='remove'){const j=has(i)?i:copies.filter(has).at(-1);if(j!=null)flip(j)}
  else if(op==='add'){const j=has(i)?copies.find(c=>!has(c)):i;if(j==null)continue;if(full(j)){blocked++;continue}flip(j)}
 }
 return {toggles,selected:sel,blocked};
}

// A quick tap right after a − (or a full stack's clear) on the same stack keeps taking copies out: the − goes once the
// stack is empty, and the finger then landed on the stack itself, which put a copy back (Nori, 2026-11-20). An add on
// that stack within STEADY_MS of the last take-out becomes a take-out (nothing, once it is empty). The window restarts
// on every take-out, so a pause of STEADY_MS ends it; a slower tap adds as usual.
export const STEADY_MS=350;
let lastOut=null;
export function steadyTap(run,tap,now=Date.now()){
 const i=tap.index;if(!run?.pool||!(i>=0&&i<run.pool.length)||tap.op==='toggle')return tap;
 const key=keyOf(run,i);
 if(tap.op==='add'&&lastOut?.key===key&&now-lastOut.time<STEADY_MS)tap={...tap,op:'remove'};
 if(tap.op==='remove'||tap.op==='clear')lastOut={key,time:now};else lastOut=null;
 return tap;
}
