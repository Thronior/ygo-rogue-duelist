/** Shared introduction for the empty Collector roster and the tutorial. */
export const collectorIntroduction = Object.freeze({
 title: 'Ultimate Collector',
 sections: [
  ['Bring your collection', 'Keep up to nine imported duelists in a 3×3 roster. Move an existing single-player save into Ultimate Collector and name your duelist. Copycat saves are not eligible. The save leaves your single-player slots and can only be used in this mode.'],
  ['Build your decks', 'Build a Main Deck of 40–60 cards, a Side Deck of 0–15 cards, and a Fusion Deck of 0–15 cards. Both can be empty. Use cards you own, following the April 2004 TCG restrictions. All cards available in this game may be used.'],
  ['Play a match', 'Host or join a best-of-three match under Master Rule 2. A coin toss decides who starts the first duel; the previous loser chooses who starts later duels. Between duels, swap cards with your Side Deck while keeping your starting Main Deck size.'],
  ['Win cards and rise in rank', 'The winner chooses five cards from the opponent’s starting Main, Side and Fusion Decks and advances one rank: Bronze → Silver → Gold → Legend → God. God is the highest rank. Duelist History records your matches and prizes.'],
  ['Defeat is permanent', 'Losing the match permanently deletes this imported duelist. Your other saves are unaffected. Only surviving duelists can appear on the Ultimate Collectors top-10 leaderboard.'],
  ['Reconnect within five minutes', 'If you disconnect, reopen Ultimate Collector to reconnect automatically. Each match has a shared five-minute disconnect allowance that does not refill when you reconnect. Disconnects under 15 seconds are free. Exhausting the allowance sends your duelist to the Shadow Realm. Each turn has a 180-second decision timer that pauses during disconnects.']
 ]
});
export function collectorIntroductionMarkup() {
 return `<div class="collector-introduction">${collectorIntroduction.sections.map(([title,text],index)=>`<details class="collector-guide-panel ${index===4?'collector-guide-danger':index===3?'collector-guide-reward':''}" ${index===0?'open':''}><summary><span class="collector-guide-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="collector-guide-title">${title}</span><svg class="collector-guide-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><div class="collector-guide-body"><p>${text}</p></div></details>`).join('')}</div>`;
}
/** No first-visit flag: losing the final duelist must restore the introduction. */
export function hasSurvivingCollectors(duelists = []) {
 return duelists.some(duelist => duelist && duelist.status === 'alive');
}
export function collectorLanding(duelists = []) {
 return hasSurvivingCollectors(duelists) ? 'roster' : 'introduction';
}
