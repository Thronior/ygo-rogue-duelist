export const CARD=190000050, COIN_HINT=1900000050;
export function coinSpellValue(e,p,L){
 const zone=(side,loc)=>e.query(side,loc).filter(Boolean);
 const own=[...zone(p,L.MZONE),...zone(p,L.SZONE)];
 const enabled=c=>(c.position&5)&&!c.is_disabled;
 const counters=c=>{const raw=c.counters||{};return Array.isArray(raw)?raw.filter(x=>(x.type&0xfff)===1).reduce((n,x)=>n+x.count,0):Number(raw[1]||0)};
 const relics=e.aiModifiers?.activeRelics?.[p]||[];
 const benefits=own.some(c=>{
  if(!enabled(c))return false;
  const n=e.name(c.code);
  if(c.location===L.MZONE&&relics.includes('cursed_iron_silence'))return false;
  if(n==='Royal Magical Library')return counters(c)<3&&zone(p,L.DECK).length>0;
  if(n==='Skilled Dark Magician'||n==='Skilled White Magician')return counters(c)<3&&[L.HAND,L.DECK,L.GRAVE].some(loc=>zone(p,loc).some(t=>e.name(t.code)===(n==='Skilled Dark Magician'?'Dark Magician':'Buster Blader')));
  if(['Magical Marionette','Blast Magician','Legendary Flame Lord','Mythical Beast Cerberus','Des Volstgalph','Rapid-Fire Magician'].includes(n))return true;
  return n==='Spell Absorption'&&!relics.includes('cursed_zombies_bargain');
 });
 if(!benefits)return -1;
 const field=[...own,...zone(1-p,L.MZONE),...zone(1-p,L.SZONE)].filter(enabled);
 // Do not spend a card into blanket negation or obvious self-lethal burn.
 if(field.some(c=>['Imperial Order','Spell Canceller','Horus the Black Flame Dragon LV8'].includes(e.name(c.code))))return -1;
 const burn=field.reduce((n,c)=>n+(e.name(c.code)==='Curse of Darkness'?1000:e.name(c.code)==='Tower of Babel'&&counters(c)>=3?3000:0),0);
 return burn>=e.lp[p]?-1:60;
}
