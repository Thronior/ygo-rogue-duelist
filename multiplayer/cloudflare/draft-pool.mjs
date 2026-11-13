import catalog from './draft-catalog.json' with {type:'json'};
import draftRelics from './draft-relics.json' with {type:'json'};
import cards from './collector-cards.json' with {type:'json'};
const byId=new Map(cards.map(c=>[c.id,c]));
const pick=(xs,random)=>xs[Math.floor(random()*xs.length)];
const weighted=(xs,random)=>{let value=random()*xs.reduce((n,id)=>n+(catalog.weights?.[id]??1),0);for(const id of xs){value-=catalog.weights?.[id]??1;if(value<0)return id;}return xs.at(-1);};
const secureRandom=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
// Draft loop (2026-11-13): the minimum Main Deck grows 20 → 30 → 40 over the first two drafts, then stays at 40.
export const minDeckFor=round=>Math.min(40,20+10*Math.max(0,round|0));
export const DRAFT_PACKS=catalog.packs.filter(p=>p.id.startsWith('DRAFT-')).map(p=>p.id);
export const DRAFT_RELICS=draftRelics;
// One 9-card booster: a rare-slot card, three Normal Monsters, then commons; never two cards of one name.
export function openBooster(id,random=secureRandom){
 const pack=catalog.packs.find(p=>p.id===id);if(!pack)throw Error('Character booster unavailable.');const used=new Set(),out=[];
 const draw=pool=>{const available=pool.filter(id=>byId.has(id)&&!used.has(byId.get(id).name));if(!available.length)return false;const id=weighted(available,random);out.push(id);used.add(byId.get(id).name);return true;};
 draw(pack.rare?.length?pack.rare:pack.common);
 const basics=[...pack.common,...(pack.rare||[])].filter(id=>byId.get(id)?.data.type&16);for(let i=0;i<3;i++)draw(basics);
 while(out.length<9)if(!draw(pack.common)&&!draw([...pack.common,...(pack.rare||[])]))throw Error('Booster has too few unique cards.');return out;
}
// Copies a Main Deck can use: up to three per name, Fusion Monsters excluded.
export function buildable(pool){const counts=new Map();for(const id of pool){const card=byId.get(id);if(card&&!(card.data.type&64))counts.set(card.name,(counts.get(card.name)||0)+1);}return [...counts.values()].reduce((n,count)=>n+Math.min(count,3),0);}
// loop: the draft-loop opening (each starting booster once, 20-card minimum). Without it, the older best-of-three
// opening (every starting booster twice, 40-card minimum) for clients from before the loop.
export function draftPool(character,random=secureRandom,loop=false){
 const c=catalog.characters.find(c=>c.id===character);if(!c)throw Error('Choose a playable character.');
 const eligible=catalog.packs.filter(p=>!p.shop_only&&!p.draft_only&&!p.id.startsWith('DRAFT-')&&new Set([...p.common,...(p.rare||[])].map(id=>byId.get(id)?.name).filter(Boolean)).size>=9);
 const usual=c.starting_packs||Array.from({length:4},()=>c.pack==='RANDOM'||c.copycat||c.engine_deck?pick(eligible,random).id:c.pack);
 const ids=loop?[...usual]:[...usual,...usual],minimum=loop?minDeckFor(0):40;
 for(let attempt=0;attempt<500;attempt++){
  const packs=ids.map(id=>openBooster(id,random)),pool=[...c.signatures,...packs.flat()];
  if(buildable(pool)>=minimum)return {pool,packs,packIds:ids};
 }
 throw Error(`Unable to form a legal ${minimum}-card draft. Try another character.`);
}
// Three different relics and three different character packs for one Draft Screen.
export function draftOffer(random=secureRandom){
 const sample=(xs,n)=>{const left=[...xs],out=[];while(out.length<n&&left.length)out.push(left.splice(Math.floor(random()*left.length),1)[0]);return out;};
 return {relics:sample(DRAFT_RELICS,3),packs:sample(DRAFT_PACKS,3)};
}
