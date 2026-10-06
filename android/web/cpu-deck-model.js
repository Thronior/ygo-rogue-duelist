import {LIMITS} from './collector-rules.js';
export const cloneDeck=d=>({main:[...d.main],extra:[...(d.extra||[])]});
export const fingerprint=d=>JSON.stringify([d.main,d.extra||[]]);
export function deckIssues(deck,cards,minimum=40){
 const by=new Map(cards.map(c=>[c.id,c])),counts=new Map(),limits=new Map(),errors=[],warnings=[];
 for(const c of cards)limits.set(c.name,Math.min(limits.get(c.name)??3,LIMITS[c.id]??3));
 if(deck.main.length<minimum||deck.main.length>60)errors.push(`Main Deck: ${minimum}–60 cards required.`);
 if(deck.extra.length>15)errors.push('Extra Deck: maximum 15 cards.');
 for(const zone of ['main','extra'])for(const id of deck[zone]){const c=by.get(id);if(!c){errors.push(`Unknown card ${id}.`);continue}if(!!(c.data.type&64)!==(zone==='extra'))errors.push(`${c.name} is in the wrong deck.`);counts.set(c.name,(counts.get(c.name)||0)+1)}
 for(const [name,n] of counts){if(n>3)errors.push(`${name}: maximum 3 copies.`);else if(n>(limits.get(name)??3))warnings.push(`${name}: ${n} copies; UC limit ${limits.get(name)}.`)}
 return {errors:[...new Set(errors)],warnings};
}
export function textDeck({title,label,deck,original,cards,version}){
 const by=new Map(cards.map(c=>[c.id,c.name])),lines=[`${title} — ${label}`,`Deck suggestion · Game ${version||'current'}`,`Original: ${original.main.length} main / ${original.extra.length} extra`];
 for(const zone of ['main','extra']){lines.push('',`${zone==='main'?'MAIN':'EXTRA'} DECK (${deck[zone].length})`);const n=new Map();for(const id of deck[zone])n.set(id,(n.get(id)||0)+1);for(const [id,count] of n)lines.push(`${count}x ${by.get(id)||id} [${id}]`)}
 lines.push('','CHANGES');for(const zone of ['main','extra']){const delta=new Map();for(const id of original[zone])delta.set(id,(delta.get(id)||0)-1);for(const id of deck[zone])delta.set(id,(delta.get(id)||0)+1);for(const [id,n] of delta)if(n)lines.push(`${n>0?'+':''}${n} ${by.get(id)||id} (${zone})`)}return lines.join('\n');
}

export function cardFrame(c){const t=c.data.type;return t&1?(t&64?3:t&128?2:t&16?0:1):t&2?4:5}
export function cardKind(c){const t=c.data.type;if(t&1)return c.race||'';return t&1048576?'Counter':t&524288?'Field':t&262144?'Equip':t&131072?'Continuous':t&65536?'Quick-Play':t&128?'Ritual':'Normal'}
export function compareCards(a,b,sort='frame',direction=1){
 const alpha=()=>a.name.localeCompare(b.name)||a.id-b.id;
 const type=()=>cardKind(a).localeCompare(cardKind(b));
 const level=()=>((a.data.type&1)?Number(a.level)||0:0)-((b.data.type&1)?Number(b.level)||0:0);
 let result;
 if(sort==='name')result=alpha();
 else if(sort==='level')result=level()||alpha();
 else if(sort==='atk'||sort==='defense')result=(Number(a[sort])||0)-(Number(b[sort])||0)||alpha();
 else if(sort==='type')result=type()||cardFrame(a)-cardFrame(b)||level()||alpha();
 else result=cardFrame(a)-cardFrame(b)||type()||level()||alpha();
 return result*direction;
}
