// Random character button for the online character selects (Tag duels and Draft Duels, user 2026-11-26), like the solo
// screen's (mobile.js 'random-character', same dice icon). A random pick only selects a character on this device, as a
// tap does; it travels to the partner or opponent the usual way, when hosting or joining.
const DICE='<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><g fill="currentColor" stroke="none"><circle cx="8.2" cy="8.2" r="1.5"/><circle cx="15.8" cy="8.2" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8.2" cy="15.8" r="1.5"/><circle cx="15.8" cy="15.8" r="1.5"/></g>';
// attr: the screen's click attribute, e.g. 'data-tag="random-character"'.
export const randomCharacterButton=attr=>`<button class="random-character-button navigation-icon-button" ${attr} aria-label="Random character" title="Random character"><svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${DICE}</svg></button>`;
// A different character from `pool` when there is one.
export function pickRandomCharacter(pool,current,random=Math.random){const others=pool.filter(i=>i!==current),list=others.length?others:pool;return list.length?list[Math.floor(random()*list.length)]:current;}
