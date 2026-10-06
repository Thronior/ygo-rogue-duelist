// Track public locations only; target frames must never expose hidden card identities.
const address=c=>c&&({controller:c.controller,location:c.location,sequence:c.sequence});
const same=(a,b)=>!!b&&a.controller===b.controller&&a.location===b.location&&a.sequence===b.sequence;
export function trackEffectTargets(e,m,M){
 e.effectTargets??=[];
 if([M.BECOME_TARGET,M.CARD_SELECTED,M.RANDOM_SELECTED].includes(m.type)){
  const link=e.activeChain?.at(-1)?.link||0;
  for(const c of m.cards||[])if([2,4,8].includes(c.location)&&!e.effectTargets.some(t=>t.link===link&&same(t,c)))e.effectTargets.push({...address(c),link});
 }
 if([M.CHAIN_SOLVED,M.CHAIN_NEGATED,M.CHAIN_DISABLED].includes(m.type))e.effectTargets=e.effectTargets.filter(t=>t.link!==m.chain_size);
 if([M.CHAIN_END,M.NEW_TURN,M.NEW_PHASE].includes(m.type))e.effectTargets=[];
 if(m.type===M.MOVE)e.effectTargets=e.effectTargets.filter(t=>!same(t,m.from)&&!same(t,m.to));
 if(m.type===M.SWAP||m.type===M.SHUFFLE_SET_CARD)e.effectTargets=[];
 if(m.type===M.SHUFFLE_HAND)e.effectTargets=e.effectTargets.filter(t=>t.location!==2||t.controller!==m.player);
}
export function decorateEffectTargets(root,targets=[]){
 root.querySelectorAll('.effect-target-frame').forEach(el=>el.remove());
 for(const t of targets){
  const el=t.location===2?(t.controller===0?root.querySelector(`.hand [data-hand="${t.sequence}"]`):null):root.querySelector(`[data-zone="${t.controller},${t.location},${t.sequence}"]`);
  if(!el||el.querySelector('.effect-target-frame'))continue;
  const frame=document.createElement('span');frame.className='effect-target-frame';frame.textContent='Selected';el.append(frame);
 }
}
const feedbackAnimations=new WeakMap();
function feedbackAnimation(el,frames,options){
 feedbackAnimations.get(el)?.cancel();const a=el.animate(frames,options);feedbackAnimations.set(el,a);
 a.finished.catch(()=>{}).finally(()=>{if(feedbackAnimations.get(el)===a)feedbackAnimations.delete(el)});return a;
}
export function pulseRelic(root,id){
 for(const el of root.querySelectorAll('[data-relic]'))if(el.dataset.relic===id)feedbackAnimation(el,[{filter:'brightness(1)',scale:'1'},{filter:'brightness(1.8) drop-shadow(0 0 8px #ffd86b)',scale:'1.12',offset:.35},{filter:'brightness(1)',scale:'1'}],{duration:500});
}
export function negateCard(el,reduced=false){
 if(!el)return Promise.resolve();
 const img=el.matches('img')?el:el.querySelector('img');if(!img)return Promise.resolve();
 return feedbackAnimation(img,reduced?[{filter:'grayscale(1)'},{filter:'grayscale(1)',offset:.8},{filter:'none'}]:[{filter:'grayscale(1)',translate:'0'},{filter:'grayscale(1)',translate:'-4px',offset:.2},{filter:'grayscale(1)',translate:'4px',offset:.35},{filter:'grayscale(1)',translate:'-3px',offset:.5},{filter:'grayscale(1)',translate:'0',offset:.8},{filter:'none',translate:'0'}],{duration:480}).finished.catch(()=>{});
}
const deckCounts=new WeakMap();
export function deckReadyFeedback(root,count,minimum,owner=root){
 const was=deckCounts.get(owner);deckCounts.set(owner,count);
 if(was===undefined||was>=minimum||count<minimum||count>60)return;
 const el=root.querySelector('.deck-count-arrow,.draft-count');if(!el)return;
 feedbackAnimation(el,[{filter:'brightness(1)'},{filter:'brightness(1.7) drop-shadow(0 0 10px #ffd76b)',offset:.4},{filter:'brightness(1)'}],{duration:650});
}
