import catalog from './draft-catalog.json' with {type:'json'};
import cards from './collector-cards.json' with {type:'json'};
const byId=new Map(cards.map(c=>[c.id,c]));
const pick=(xs,random)=>xs[Math.floor(random()*xs.length)];
const weighted=(xs,random)=>{let value=random()*xs.reduce((n,id)=>n+(catalog.weights?.[id]??1),0);for(const id of xs){value-=catalog.weights?.[id]??1;if(value<0)return id;}return xs.at(-1);};
export function draftPool(character,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 const c=catalog.characters.find(c=>c.id===character);if(!c)throw Error('Choose a playable character.');
 const eligible=catalog.packs.filter(p=>!p.shop_only&&!p.draft_only&&!p.id.startsWith('DRAFT-'));
 const usual=c.starting_packs||Array.from({length:4},()=>c.pack==='RANDOM'||c.copycat||c.engine_deck?pick(eligible,random).id:c.pack);
 const ids=[...usual,...usual];
 for(let attempt=0;attempt<500;attempt++){
  const packs=ids.map(id=>{const pack=catalog.packs.find(p=>p.id===id);if(!pack)throw Error('Character booster unavailable.');const used=new Set(),out=[];
   const draw=pool=>{const available=pool.filter(id=>byId.has(id)&&!used.has(byId.get(id).name));if(!available.length)return false;const id=weighted(available,random);out.push(id);used.add(byId.get(id).name);return true;};
   draw(pack.rare?.length?pack.rare:pack.common);
   const basics=[...pack.common,...(pack.rare||[])].filter(id=>byId.get(id)?.data.type&16);for(let i=0;i<3;i++)draw(basics);
   while(out.length<9)if(!draw(pack.common)&&!draw([...pack.common,...(pack.rare||[])]))throw Error('Booster has too few unique cards.');return out;
  });
  const pool=[...c.signatures,...packs.flat()],counts=new Map();for(const id of pool){const card=byId.get(id);if(card&&!(card.data.type&64))counts.set(card.name,(counts.get(card.name)||0)+1);}
  if([...counts].reduce((n,[name,count])=>n+Math.min(count,3),0)>=40)return {pool,packs,packIds:ids};
 }
 throw Error('Unable to form a legal 40-card draft. Try another character.');
}
