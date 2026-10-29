import {cardFrame} from './cpu-deck-model.js';
const ALL_CARD_PACKS = {
  'WC4-20': 'Spell',
  'WC4-21': 'Trap',
  'WC4-22': 'Effect Monster',
  'WC4-23': 'Monster',
  'WC4-24': '',
};

export function allCardsPackDescription(pack) {
  if (!pack || !Object.hasOwn(ALL_CARD_PACKS, pack.id)) return '';
  const category = ALL_CARD_PACKS[pack.id];
  return `This pack includes all ${category ? category + ' ' : ''}cards in the game.`;
}

export function formatPackChance(chance){
 const value=Number(chance)||0;
 if(value>0&&Math.round(value*100)===0)return '<1%';
 return `${Math.round(value*100)}%`;
}

export function sortPackCards(entries,sort,card,registered){
 return [...entries].sort((a,b)=>{
  const x=card(a.id),y=card(b.id);
  const primary=sort==='frame'?cardFrame(x)-cardFrame(y):sort==='unregistered'?Number(registered(a.id))-Number(registered(b.id)):(a.locked?Infinity:a.chance)-(b.locked?Infinity:b.chance);
  return primary||x.name.localeCompare(y.name)||a.id-b.id;
 });
}
