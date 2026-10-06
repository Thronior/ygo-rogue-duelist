// Core-driven feedback: never reveal the identity of a private card selection.
export function removalKind(reason=0){
 // Core REASON_DESTROY / REASON_RELEASE; ordinary sends, discards and costs do not qualify.
 return reason&2?'tribute':reason&1?'destroy':null;
}

export function playRemovalFeedback(kind,source,{reduced=false}={}){
 if(!source||!['destroy','tribute'].includes(kind))return;
 const r=source.getBoundingClientRect(),el=document.createElement('div');
 el.className='card-removal-fx '+kind;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
 el.innerHTML='<i></i><i></i><i></i><i></i>';document.body.append(el);
 const frames=reduced?[{opacity:.8},{opacity:0}]:kind==='tribute'
  ?[{opacity:0,transform:'translateY(0) scale(.8)'},{opacity:1,offset:.3},{opacity:0,transform:'translateY(-20px) scale(1.15)'}]
  :[{opacity:1,transform:'scale(.85)'},{opacity:1,transform:'scale(1.12)',offset:.3},{opacity:0,transform:'scale(1.4)'}];
 const animation=el.animate(frames,{duration:180,easing:'ease-out'});
 return animation.finished.catch(()=>{}).finally(()=>el.remove());
}

export function effectMessageCue(e,m,M,L){
 const cue=(text,cards=[],extra={})=>({kind:'effect-action',text,cards,...extra});
 const publicCard=c=>{const live=e.query(c.controller,c.location)[c.sequence];return {...c,code:live&&(c.location===L.GRAVE||live.isPublic||live.is_public||([L.MZONE,L.SZONE,L.REMOVED].includes(c.location)&&(live.position&5)))?live.code:0};};
 if([M.RANDOM_SELECTED,M.CARD_SELECTED,M.BECOME_TARGET].includes(m.type))return cue(m.type===M.RANDOM_SELECTED?'Random card selected':m.type===M.BECOME_TARGET?'Effect target selected':'Card selected',(m.cards||[]).map(publicCard),{player:m.player,random:m.type===M.RANDOM_SELECTED});
 if([M.EQUIP,M.CARD_TARGET,M.CANCEL_TARGET].includes(m.type))return cue(m.type===M.EQUIP?'Equipped':m.type===M.CARD_TARGET?'Cards linked':'Card link removed',[m.card,m.target].filter(Boolean).map(publicCard));
 if([M.ADD_COUNTER,M.REMOVE_COUNTER].includes(m.type))return cue(`${m.type===M.ADD_COUNTER?'+':'−'}${m.count} counter${m.count===1?'':'s'}`,[publicCard(m)],{increase:m.type===M.ADD_COUNTER});
 if(m.type===M.ATTACK_DISABLED)return cue('Attack negated',e.attackCard?[publicCard(e.attackCard)]:[],{negated:true});
 if([M.CHAIN_NEGATED,M.CHAIN_DISABLED].includes(m.type))return null;
 if(m.type===M.SWAP)return cue('Cards switched',[m.card1,m.card2].filter(Boolean).map(publicCard));
 if([M.SHUFFLE_DECK,M.SHUFFLE_HAND,M.SHUFFLE_SET_CARD,M.SWAP_GRAVE_DECK,M.REVERSE_DECK].includes(m.type))return cue(m.type===M.SHUFFLE_HAND?'Hand shuffled':m.type===M.SHUFFLE_SET_CARD?'Set cards shuffled':m.type===M.SWAP_GRAVE_DECK?'Deck and Graveyard exchanged':m.type===M.REVERSE_DECK?'Deck reversed':'Deck shuffled',[],{player:m.player});
 return null;
}

export function effectChoiceCue(e,m,r,M){
 const source=e.name(e.effect?.code||m.code),prefix=source?source+' — ':'';
 let text;
 if(m.type===M.ANNOUNCE_NUMBER)text='declared '+m.options[r.value];
 if(m.type===M.ANNOUNCE_CARD)text='declared '+e.name(r.card);
 if(m.type===M.SELECT_OPTION)text='chose '+(e.description(m.options[r.index])||'effect '+(r.index+1));
 if(m.type===M.ANNOUNCE_ATTRIB){const labels={1:'EARTH',2:'WATER',4:'FIRE',8:'WIND',16:'LIGHT',32:'DARK',64:'DIVINE'};text='declared '+(r.attributes||[]).map(x=>labels[x]||String(x)).join(', ');}
 if(m.type===M.ANNOUNCE_RACE){const labels=['Warrior','Spellcaster','Fairy','Fiend','Zombie','Machine','Aqua','Pyro','Rock','Winged Beast','Plant','Insect','Thunder','Dragon','Beast','Beast-Warrior','Dinosaur','Fish','Sea Serpent','Reptile','Psychic','Divine-Beast','Creator God','Wyrm','Cyberse','Illusion'];text='declared '+(r.races||[]).map(x=>labels.find((_,i)=>BigInt(x)===(1n<<BigInt(i)))||String(x)).join(', ');}
 if(m.type===M.SORT_CARD||m.type===M.SORT_CHAIN)text='finished reordering cards';
 if(!text)return null;
 return {kind:'effect-action',text:prefix+text,player:m.player,cards:[],choice:true};
}

export async function playEffectFeedback(cue,{field,image,esc,reduced=false}){
 const el=document.createElement('div');el.className='effect-feedback'+(cue.random?' random-selection':'');el.setAttribute('role','status');
 const heading=(cue.player===0?'You · ':cue.player===1?'Opponent · ':'')+cue.text;
 el.innerHTML=`<strong>${esc(heading)}</strong><div class="effect-feedback-cards"></div>`;field.append(el);
 const rack=el.querySelector('.effect-feedback-cards');
 const cards=cue.cards||[],wait=ms=>new Promise(r=>setTimeout(r,ms*1.2));
 const pause=cue.excavation?Math.min(180,1200/Math.max(1,cards.length)):0;
 for(const [i,c] of cards.entries()){
  if(!el.isConnected)break;
  const img=document.createElement('img');img.src=c.code?image(c.code):'assets/card-back.jpg';img.alt=c.code?'Revealed card':'Unrevealed card';rack.append(img);
  if(!reduced)img.animate([{transform:cue.excavation?'translateY(-20px) rotateY(90deg)':'scale(.8)',opacity:0},{transform:'none',opacity:1}],{duration:180});
  if(cue.excavation){img.title=`${i+1} from the top`;if(rack.children.length>6)rack.firstElementChild.remove();await wait(pause);}
  const zone=field.querySelector(`[data-zone="${c.controller},${c.location},${c.sequence}"]`);
  if(!reduced&&zone&&cue.increase!==false)zone.animate([{boxShadow:'0 0 18px #ffe185'},{boxShadow:'none'}],{duration:450});
 }
 await wait(reduced?350:cue.excavation||cue.choice?850:450);el.remove();
}
