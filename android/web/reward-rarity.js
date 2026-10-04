import {isUltra} from './ultra-rarity.js';
// Classify deck copies, never roll rewards. Identical cards keep the same tier.
export function deckRewardRarities(source,card=()=>null){
 const counts=new Map();for(const id of source||[])counts.set(Number(id),(counts.get(Number(id))||0)+1);
 const entries=[...counts].map(([id,count])=>{const c=card(id),printed=c?.sets||[];return {id,count,score:(isUltra(id)?1000000:0)+(printed.some(s=>s.rarity==='Ultra Rare')?100000:0)+(printed.some(s=>s.rarity==='Rare'||s.rarity==='Super Rare')?10000:0)+Math.max(0,c?.attack||c?.data?.attack||0)+Math.max(0,c?.level||0)*100}}).sort((a,b)=>b.score-a.score||a.id-b.id);
 function pick(pool,target){let dp=new Map([[0,{score:0,ids:[]}]]);for(const e of pool){for(const [n,v] of [...dp]){const next=n+e.count,score=v.score+e.score*e.count;if(!dp.has(next)||score>dp.get(next).score)dp.set(next,{score,ids:[...v.ids,e.id]});}}const n=[...dp.keys()].sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b)[0];return new Set(dp.get(n).ids)}
 const n=(source||[]).length,ultras=pick(entries,Math.round(n/8)),rares=pick(entries.filter(e=>!ultras.has(e.id)),Math.round(n/4));
 return new Map(entries.map(e=>[e.id,ultras.has(e.id)?'ultra':rares.has(e.id)?'rare':'common']));
}
