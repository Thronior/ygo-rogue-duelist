// DNA Surgery uses the original deck composition, never the opponent's hidden cards.
import {OcgRace} from './vendor/package/dist/index.js';
export function dnaSurgeryRace(e,p,L,available){
 const races=[...new Set(Object.values(OcgRace).filter(r=>typeof r==='bigint'&&(r&BigInt(available))))];
 if(!races.length)return null;
 const original=e.replayRecord?.start,teams=original?.[10];
 const deck=teams?.[p]?.[e.activeSeats?.[p]||0]?.main||original?.[p]||e.query(p,L.DECK).map(c=>c.code);
 const counts=new Map();for(const code of deck){const d=e.data[code];if(d?.type&1){const race=BigInt(d.race);counts.set(race,(counts.get(race)||0)+1)}}
 const face=c=>c&&(c.position&5)&&!c.is_disabled;
 const board=[0,1].map(side=>e.query(side,L.MZONE).filter(face));
 const spells=[0,1].flatMap(side=>e.query(side,L.SZONE).filter(c=>face(c)&&e.data[c.code]?.type&0x20000).map(c=>({...c,controller:side})));
 const power=c=>Math.max(0,c.attack??e.data[c.code]?.attack??0);
 const score=r=>{
  let value=counts.get(r)||0;
  for(const c of spells){const side=c.controller,sign=side===p?1:-1,own=board[side],enemy=board[1-side],name=e.name(c.code);
   if(name==='Insect Barrier'&&r===OcgRace.INSECT)value+=sign*(8000+enemy.reduce((n,t)=>n+power(t),0));
   if(name==='The A. Forces'&&r===OcgRace.WARRIOR)value+=sign*Math.max(100,200*own.length*own.length);
   if(name==="Dragon's Rage"&&r===OcgRace.DRAGON)value+=sign*Math.max(80,own.reduce((n,t)=>n+Math.max(0,power(t)-Math.min(2000,...enemy.map(x=>x.defense??2000))),0));
   if(name==="The Dragon's Bead"&&r===OcgRace.DRAGON)value+=sign*(100+own.length*100);
   if(name==='Dragon Capture Jar'&&r===OcgRace.DRAGON)value+=board[1-p].reduce((n,t)=>n+power(t),0)-board[p].reduce((n,t)=>n+power(t),0);
   if(name==='Soul Demolition'&&r===OcgRace.FIEND)value+=sign*80;
   if(name==='Forgotten Temple of the Deep'&&[OcgRace.FISH,OcgRace.SEASERPENT,OcgRace.AQUA].includes(r))value+=sign*own.filter(t=>(t.level??e.data[t.code]?.level??0)<=4).length*100;
   if(name==='Weapon Change'&&[OcgRace.WARRIOR,OcgRace.MACHINE].includes(r))value+=sign*own.reduce((n,t)=>n+Math.max(0,(t.defense??0)-power(t)),0);
   if(name==='The Regulation of Tribe'&&e.declaredRaces?.get(`${side}:${L.SZONE}:${c.sequence}`)===r)value+=board[1-p].reduce((n,t)=>n+power(t),0)-board[p].reduce((n,t)=>n+power(t),0);
  }
  return value;
 };
 return races.sort((a,b)=>score(b)-score(a)||(counts.get(b)||0)-(counts.get(a)||0))[0];
}
