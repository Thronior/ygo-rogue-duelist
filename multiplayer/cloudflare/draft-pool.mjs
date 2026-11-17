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
// draft-relics.json: [{key, weight}] from draft_relics.offers(). Weights follow the relic's rarity (shop price tier,
// 2026-11-15), so strong relics come up less often; fused relics are never offered.
export const DRAFT_RELICS=draftRelics.map(r=>r.key);
export const DRAFT_RELIC_WEIGHTS=Object.fromEntries(draftRelics.map(r=>[r.key,r.weight]));
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
// Random Pack (user, 2026-11-16): randomized cards exist only on the players' devices. The Worker deals a seed per
// booster; both clients build the same nine cards from it (random_cards.draft_booster) with ids in that booster's
// block, so the Worker can check a deck without knowing the cards. Blocks: 199,000,000 + seat x 1,000,000 + k x 1,000.
// The block numbers live in collector-rules.js, shared with the clients.
export const RANDOM_PACK='RANDOM-PACK';
export const randomSeed=(random=secureRandom)=>Math.floor(random()*4294967296)>>>0;
// Second loadout (user, 2026-11-16): variant 1 plays the character's alternate packs and signature cards.
export function loadout(character,variant=0){
 const c=catalog.characters.find(c=>c.id===character);if(!c)throw Error('Choose a playable character.');
 if(variant!==1||!c.alternate)return c;
 return {...c,...c.alternate,id:c.id,name:c.name,signatures:c.alternate.signatures||[],pack:c.alternate.pack||c.pack,variant:1};
}
export function draftPool(character,random=secureRandom,loop=false,variant=0){
 const c=loadout(character,variant===1?1:0);
 // Not in Draft Duels (user, 2026-11-17): Copycat's standard loadout and both Dueling Engine loadouts.
 if(c.engine_deck||(c.copycat&&!c.variant))throw Error('This loadout is not available in Draft Duels.');
 const eligible=catalog.packs.filter(p=>!p.shop_only&&!p.draft_only&&!p.id.startsWith('DRAFT-')&&new Set([...p.common,...(p.rare||[])].map(id=>byId.get(id)?.name).filter(Boolean)).size>=9);
 const usual=c.starting_packs||Array.from({length:4},()=>c.pack==='RANDOM'||c.copycat||c.engine_deck?pick(eligible,random).id:c.pack);
 const ids=loop?[...usual]:[...usual,...usual],minimum=loop?minDeckFor(0):40;
 for(let attempt=0;attempt<500;attempt++){
  // A Random Pack booster is a seed here; its nine cards count towards the minimum (they are all different).
  const seeds=[],packs=ids.map(id=>id===RANDOM_PACK?(seeds.push(randomSeed(random)),[]):openBooster(id,random)),pool=[...c.signatures,...packs.flat()];
  if(buildable(pool)+9*seeds.length>=minimum)return {pool,packs,packIds:ids,randomBoosters:seeds,variant:c.variant?1:0};
 }
 throw Error(`Unable to form a legal ${minimum}-card draft. Try another character.`);
}
// Three different relics (drawn by rarity weight, without replacement) and three different character packs for one
// Draft Screen. A "No relics" room (room.noRelics) offers the packs alone.
// randomPack: rooms of clients that can build Random Packs (draft protocol 4) add it to the pack rotation.
export function draftOffer(random=secureRandom,{relics=true,randomPack=false}={}){
 const sample=(xs,n,weight=()=>1)=>{const left=[...xs],out=[];while(out.length<n&&left.length){let value=random()*left.reduce((s,x)=>s+weight(x),0),i=0;for(;i<left.length-1;i++){value-=weight(left[i]);if(value<0)break;}out.push(left.splice(i,1)[0]);}return out;};
 return {relics:relics?sample(DRAFT_RELICS,3,k=>DRAFT_RELIC_WEIGHTS[k]):[],packs:sample(randomPack?[...DRAFT_PACKS,RANDOM_PACK]:DRAFT_PACKS,3)};
}
