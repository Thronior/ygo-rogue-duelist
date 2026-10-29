import {typeIcon,genreIcons} from './card-search.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<img class="pixel-badge" src="assets/icons/pixel/${name}.png" alt="">`;
export function cardFacts(c){
 const t=Number(c.data.type||0),monster=!!(t&1),kind=t&2?'spell':t&4?'trap':t&64?'fusion':t&128?'ritual':t&16?'normal':'effect';
 const color={spell:'Green',trap:'Purple',fusion:'Violet',ritual:'Blue',normal:'Yellow',effect:'Orange'}[kind];
 const row=(label,value,pixel)=>`<div>${pixel?icon(pixel):''}<span>${label?`<small>${label}</small>`:''}<b>${esc(value)}</b></span></div>`;
 const label=cardTypeLabel(c),attributeIcon=String(c.attribute||'').split(/\s*\/\s*/)[0].toLowerCase();
 let rows=row('Card type',label,'type-'+kind);
 if(monster){rows+=row('Attribute',c.attribute,'attribute-'+attributeIcon)+row('Level',c.level).replace('<div>', '<div><img class="genre-icon" src="assets/icons/level-star.png" alt="">')+row('Monster Type',c.race).replace('<div>', '<div>'+typeIcon(c))+row('ATK',c.atk<0?'?':c.atk)+row('DEF',c.defense<0?'?':c.defense);}
 return `<h3 class="inspect-card-name">${esc(c.name)}</h3><div class="inspect-facts">${rows}</div>${genreIcons(c)}`;
}

export function cardTypeLabel(c){
 const t=Number(c.data.type||0);
 if(t&2){if(t&0x80)return 'Ritual Spell';if(t&0x80000)return 'Field Spell';if(t&0x40000)return 'Equip Spell';if(t&0x20000)return 'Continuous Spell';if(t&0x10000)return 'Quick-Play Spell';return 'Normal Spell';}
 if(t&4){if(t&0x100000)return 'Counter Trap';if(t&0x20000)return 'Continuous Trap';return 'Normal Trap';}
 if(t&1)return t&0x40?'Fusion Monster':t&0x80?'Ritual Monster':t&0x10?'Normal Monster':'Effect Monster';
 return c.type||'Card';
}



// Hide database editorial footnotes without changing the engine's card text.
export const displayCardText=text=>String(text??'').replace(/(?:\r?\n)*\* The above text is unofficial and describes the card's functionality in the OCG\.[ \t]*(?=\r?\n|$)/g,'').trim();
