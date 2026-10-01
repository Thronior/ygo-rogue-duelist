import {rankFor} from './collector-rules.js';
export const COLLECTOR_SLOT_COUNT = 9;
export const COLLECTOR_MENU_CARD = Object.freeze(['Ultimate Collector',17375316,'spell','Build your collection. Risk your duelist.','collector']);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function collectorSlots(duelists = []) {
 const slots = Array(COLLECTOR_SLOT_COUNT).fill(null);
 for (const duelist of duelists) {
  if (!duelist || duelist.status !== 'alive') continue;
  const slot = duelist.slot;
  if (!Number.isInteger(slot) || slot < 1 || slot > COLLECTOR_SLOT_COUNT || slots[slot-1]) throw new Error('Invalid Ultimate Collector save slot.');
  slots[slot-1] = duelist;
 }
 return slots;
}
export function nextCollectorSlot(duelists = []) {
 const index = collectorSlots(duelists).findIndex(slot => !slot);
 if (index < 0) throw new Error('All nine Ultimate Collector slots are occupied.');
 return index + 1;
}
export function collectorRosterMarkup(duelists, characters) {
 return `<div class="collector-roster" aria-label="Ultimate Collector save slots">${collectorSlots(duelists).map((duelist,index) => {
  const slot=index+1, character=duelist ? characters[duelist.character] : null,rank=duelist?rankFor(duelist.wins):null;
  return `<button class="collector-slot ${duelist?'occupied':'empty'}" data-rank="${rank?.toLowerCase()||'empty'}" data-collector-slot="${slot}" data-do="${duelist?'collector-select':'collector-import'}" aria-label="${escapeHTML(duelist ? `${duelist.name}, ${character?.name || 'Duelist'}` : `Import into slot ${slot}`)}">${rank?`<b class="collector-rank-badge">${rank}</b>`:''}${character?`<img src="assets/${escapeHTML(character.sprite)}" alt="">`:''}<span class="collector-slot-name">${escapeHTML(duelist?.name || `Slot ${slot}`)}</span><small>${escapeHTML(duelist ? character?.name || 'Duelist' : 'Import save')}</small></button>`;
 }).join('')}</div>`;
}
