// April 19, 2004 TCG: no forbidden cards; restrictions apply across all decks.
export const LIMITS = Object.freeze({"72989439": 1, "71413901": 1, "69243953": 1, "97077563": 1, "72892473": 1, "36468556": 1, "4031928": 1, "82301904": 1, "17375316": 1, "31036355": 2, "34124316": 1, "53129443": 1, "44763025": 1, "74131780": 1, "33396948": 1, "78706415": 1, "79571449": 1, "19613556": 1, "61740673": 1, "79575620": 1, "77585513": 1, "28566710": 2, "7902349": 1, "44519536": 1, "83746708": 1, "62279055": 1, "34206604": 1, "77121851": 2, "2460565": 2, "41482598": 1, "44095762": 1, "33508719": 2, "79106360": 2, "71044499": 2, "74191942": 1, "55144522": 1, "70828912": 1, "12580477": 1, "37576645": 1, "2851070": 1, "32807846": 2, "70903634": 1, "8124921": 1, "83555666": 1, "26202165": 1, "8131171": 1, "45986603": 1, "72302403": 1, "42829885": 1, "33184167": 1, "43586926": 1, "56747793": 1, "70368879": 1, "53839837": 1, "78010363": 1, "3078576": 1, "18144506": 1, "83764718": 1});
export const RANKS = Object.freeze(['Bronze','Silver','Gold','Legend','God']);
export const rankFor = wins => RANKS[Math.min(4,Math.max(0,wins|0))];
const counts = cards => cards.reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
export const deckCards = deck => [...(deck.main||[]),...(deck.side||[]),...(deck.extra||[])];
export function validateDeck(deck,pool,cards,original=null) {
 const errors=[], all=deckCards(deck), catalog=new Map(cards.map(c=>[c.id,c]));
 if(!Array.isArray(deck.main)||deck.main.length<40||deck.main.length>60)errors.push('Main Deck must contain 40ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ60 cards.');
 if(!Array.isArray(deck.side)||deck.side.length>15)errors.push('Side Deck may contain 0Ã¢â‚¬â€œ15 cards.');
 if(!Array.isArray(deck.extra)||deck.extra.length>15)errors.push('Fusion Deck may contain 0Ã¢â‚¬â€œ15 cards.');
 if(all.some(id=>!Number.isInteger(id)))errors.push('Invalid card ID.');
 const owned=counts(pool), used=counts(all), names={};
 for(const [id,n] of Object.entries(used)) {
  const card=catalog.get(+id);
  if(!card){errors.push('Unknown card: '+id);continue;}
  if(n>(owned[id]||0))errors.push('Not enough owned copies of '+card.name+'.');
  const alias=card.name;names[alias]=(names[alias]||0)+n;
 }
 for(const [id,n] of Object.entries(names))if(n>Math.min(...cards.filter(c=>c.name===id).map(c=>LIMITS[c.id]??3)))errors.push(id+' exceeds the April 2004 TCG copy limit.');
 for(const id of deck.main||[])if(catalog.get(id)?.data?.type&64)errors.push('Fusion Monsters belong in the Fusion Deck.');
 for(const id of deck.extra||[])if(!(catalog.get(id)?.data?.type&64))errors.push('Only Fusion Monsters belong in the Fusion Deck.');
 if(original){if(deck.main.length!==original.main.length)errors.push('Keep your starting Main Deck size.');const previous=counts(deckCards(original));if(Object.keys({...previous,...used}).some(id=>previous[id]!==used[id]))errors.push('Siding must preserve all cards in your match decks.');}
 return [...new Set(errors)];
}
