import {cardFrame} from './cpu-deck-model.js';
// The Millennium Puzzle packs (content.py _fill_millennium_puzzles): Green every Spell, Red every Trap,
// Yellow every monster, Purple every card. Whole sentences so each translates as one string.
const ALL_CARD_PACKS = {
  'WC4-20': 'This pack includes all Spell cards in the game.',
  'WC4-21': 'This pack includes all Trap cards in the game.',
  'WC4-22': 'This pack includes all Monster cards in the game.',
  'WC4-23': 'This pack includes all cards in the game.',
};

export function allCardsPackDescription(pack) {
  return pack && Object.hasOwn(ALL_CARD_PACKS, pack.id) ? ALL_CARD_PACKS[pack.id] : '';
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
