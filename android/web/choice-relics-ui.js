// Prompts for relics that ask for a choice when acquired: Relic Picker, Card Picker and Name Changer.
// The run holds the pending choice (choice_relics.py); these only draw it. Lists stay short so typing stays smooth.
import {safe} from './experience-ui.js';

const ANCIENT_TREASURE=190000050,RESULTS=60;
export const cardPick={q:'',type:'all',selected:null};
export const namePick={q:'',selected:null};

export function pendingRelicChoice(r){return !!r&&r.challenge_level!==-1&&(!!r.relic_offer?.options?.length||(r.card_picks||0)>0||(r.name_change_picks||0)>0)}

export function relicOfferMarkup(content,offer,{relicImage,relicArtwork,btn}){
 return `<div class="relic-offer"><p>Choose 1 relic to keep for this run.</p><div class="relic-offer-options">${offer.options.map(key=>{const [name,price,text]=content.artifacts[key];return `<article><h3>${safe(name)}</h3>${relicArtwork(relicImage(content.artifactInfo[key].art))}<p>${safe(text)}</p><small>Shop price ${price}</small>${btn('Choose relic','relic-pick',`data-relic="${safe(key)}"`,'primary')}</article>`}).join('')}</div><footer>${btn('Reroll · Rerolls: '+offer.rerolls_left,'relic-pick-reroll',offer.rerolls_left?'':'disabled')}</footer></div>`;
}

const TYPES=[['all','All'],['monster','Monsters'],['spell','Spells'],['trap','Traps']];
const typeOf=c=>c.data.type&1?'monster':c.data.type&2?'spell':'trap';
export function cardPickMarkup(btn){
 return `<div class="name-pick card-pick"><p>Choose any card in the game to add to your card pool.</p><div class="pick-tools"><input id="card-pick-search" type="search" placeholder="Search card name or text" autocomplete="off" value="${safe(cardPick.q)}"><div class="pick-chips" role="group" aria-label="Card type">${TYPES.map(([id,label])=>`<button type="button" class="${cardPick.type===id?'active':''}" data-do="card-pick-type" data-type="${id}">${label}</button>`).join('')}</div></div><div class="card-pick-results"></div><div class="pick-confirm">${btn('Choose a card','card-pick-confirm','disabled','primary')}</div></div>`;
}
export function cardPickResults(content,{cardButton}){
 const words=cardPick.q.toLowerCase().split(/\s+/).filter(Boolean);
 const list=content.cards.filter(c=>c.id!==ANCIENT_TREASURE&&(cardPick.type==='all'||typeOf(c)===cardPick.type)&&(!words.length||words.every(w=>(c.name+' '+c.desc).toLowerCase().includes(w))));
 // Name matches first, then alphabetical.
 const q=cardPick.q.toLowerCase();list.sort((a,b)=>(b.name.toLowerCase().includes(q)-a.name.toLowerCase().includes(q))||a.name.localeCompare(b.name));
 const shown=list.slice(0,RESULTS);
 return `${shown.length?`<div class="cardgrid">${shown.map(c=>cardButton(c.id,`data-do="card-pick-select" data-code="${c.id}"`,c.id===cardPick.selected)).join('')}</div>`:'<p class="pick-empty">No card matches.</p>'}${list.length>RESULTS?`<p class="pick-more">Showing ${RESULTS} of ${list.length}. Type to narrow the list.</p>`:''}`;
}

export function namePickMarkup(btn){
 return `<div class="name-pick"><p>Choose an archetype. Your monsters are also treated as it for the rest of the run.</p><div class="pick-tools"><input id="name-pick-search" type="search" placeholder="Search archetypes" autocomplete="off" value="${safe(namePick.q)}"></div><div class="name-pick-results"></div><div class="pick-confirm">${btn('Choose an archetype','name-pick-confirm','disabled','primary')}</div></div>`;
}
export function namePickResults(content){
 const q=namePick.q.toLowerCase(),list=(content.archetypes||[]).filter(a=>!q||a.name.toLowerCase().includes(q));
 return list.length?`<div class="name-pick-list">${list.map(a=>`<button type="button" class="${a.setcode===namePick.selected?'selected':''}" data-do="name-pick-select" data-setcode="${a.setcode}"><b>${safe(a.name)}</b><small>${a.monsters} monsters</small></button>`).join('')}</div>`:'<p class="pick-empty">No archetype matches.</p>';
}
