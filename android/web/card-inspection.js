import {typeIcon,genreIcons} from './card-search.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<img class="pixel-badge" src="assets/icons/pixel/${name}.png" alt="">`;
export function cardFacts(c){
 const t=c.data.type,monster=!!(t&1),kind=t&2?'spell':t&4?'trap':t&64?'fusion':t&128?'ritual':t&16?'normal':'effect';
 const color={spell:'Green',trap:'Purple',fusion:'Violet',ritual:'Blue',normal:'Yellow',effect:'Orange'}[kind];
 const row=(label,value,pixel)=>`<div>${pixel?icon(pixel):''}<span>${label?`<small>${label}</small>`:''}<b>${esc(value)}</b></span></div>`;
 let rows=row('Card type',c.type,'type-'+kind);
 if(monster){const race=Number(c.data.race||0),index=race>0?Math.log2(race)+1:0;rows+=row('Attribute',c.attribute,'attribute-'+String(c.attribute).toLowerCase())+row('Level',c.level).replace('<div>', '<div><img class="genre-icon" src="assets/icons/level-star.png" alt="">')+row('Monster Type',c.race).replace('<div>', '<div>'+typeIcon(c))+row('ATK',c.atk<0?'?':c.atk)+row('DEF',c.defense<0?'?':c.defense);}
 return `<h3 class="inspect-card-name">${esc(c.name)}</h3><div class="inspect-facts">${rows}</div>${genreIcons(c)}`;
}


