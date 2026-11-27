// April 19, 2004 TCG: no forbidden cards; restrictions apply across all decks.
export const LIMITS = Object.freeze({"72989439": 1, "71413901": 1, "69243953": 1, "97077563": 1, "72892473": 1, "36468556": 1, "4031928": 1, "82301904": 1, "17375316": 1, "31036355": 2, "34124316": 1, "53129443": 1, "44763025": 1, "74131780": 1, "33396948": 1, "78706415": 1, "79571449": 1, "18144506": 1, "19613556": 1, "61740673": 1, "79575620": 1, "77585513": 1, "28566710": 2, "7902349": 1, "44519536": 1, "83746708": 1, "62279055": 1, "34206604": 1, "77121851": 2, "2460565": 2, "41482598": 1, "44095762": 1, "83764718": 1, "33508719": 2, "79106360": 2, "71044499": 2, "74191942": 1, "55144522": 1, "70828912": 1, "12580477": 1, "37576645": 1, "2851070": 1, "32807846": 2, "70903634": 1, "8124921": 1, "83555666": 1, "26202165": 1, "8131171": 1, "45986603": 1, "72302403": 1, "42829885": 1, "33184167": 1, "43586926": 1, "56747793": 1, "70368879": 1, "53839837": 1, "78010363": 1, "3078576": 1});
export const RANKS = Object.freeze(['Bronze','Silver','Gold','Legend','God']);
export const rankFor = wins => RANKS[Math.min(4,Math.max(0,wins|0))];
const counts = cards => cards.reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
export const deckCards = deck => [...(deck.main||[]),...(deck.side||[]),...(deck.extra||[])];
// Draft Random Pack cards (user, 2026-11-16): made on each device from a seed, so the Worker has no data for them.
// Booster k of seat s numbers its cards inside 199,000,000 + s x 1,000,000 + k x 1,000 (random_cards.draft_booster).
// 2v2 rooms (2026-11-26): seats 2 and 3 take the upper halves of seat 0's and seat 1's blocks, so every id stays below
// 201,000,000 (isRandomId) and seats 0 and 1 keep their numbers. That leaves 500 boosters per seat (random_cards.py).
export const RANDOM_FIRST=199000000,RANDOM_SEAT=1000000,RANDOM_HALF=500000,RANDOM_BLOCK=1000,RANDOM_MAX=RANDOM_HALF/RANDOM_BLOCK;
export const isRandomId=id=>{const n=Number(id);return n>=191000000&&n<201000000;};
const seatBase=seat=>RANDOM_FIRST+(seat%2)*RANDOM_SEAT+(seat>>1)*RANDOM_HALF;
export const randomBlock=(seat,k)=>seatBase(seat)+k*RANDOM_BLOCK;
export const randomBooster=(id,seat)=>{const k=Math.floor((id-seatBase(seat))/RANDOM_BLOCK);return Number.isInteger(id)&&k>=0&&k<RANDOM_MAX?k:-1;};
// 2v2 Draft rooms (room.size 4, user 2026-11-26): four seats in join order, two teams. The lobby has four slots: slots 1
// and 2 are always Team A, slots 3 and 4 Team B (room.slots: slot -> seat, null while open). Joiners fill the first
// open slot and the host drags players between slots. Seats never move, because a hub socket that gets replaced stops
// for good; room.teams (seat -> team) follows the slots. room.first, room.winner and room.score count teams. A 1v1
// room is the same with team = seat.
export const roomSize=room=>room?.size===4?4:2;
export const teamOf=(room,seat)=>room?.size===4?(room.teams?.[seat]??seat%2):seat;
export const teamSeats=(room,team)=>Array.from({length:roomSize(room)},(_,s)=>s).filter(s=>teamOf(room,s)===team);
// The engine's duelist order: the team going first, then the other, partners in seat order. Partners take turns
// leading off: in even-numbered games the higher seat goes first.
export const duelOrder=room=>[room.first,1-room.first].map(t=>{const s=teamSeats(room,t);return (room.game|0)%2===0?s.reverse():s;});
// Room seats and engine duelists. A 1v1 room's engine player is seat ^ first. A 2v2 Draft room (room.size 4) plays
// EDOPro's tag duel: duelist slot = engine team x 2 + partner, in duelOrder.
export function duelMap(r){
 if(r?.size!==4)return {team:false,slot:seat=>seat^r.first,seat:slot=>slot^r.first};
 const order=duelOrder(r),slots=new Map(order.flatMap((seats,t)=>seats.map((seat,i)=>[seat,t*2+i])));
 return {team:true,order,slot:seat=>slots.get(seat),seat:slot=>order[slot>>1]?.[slot&1]};
}
export const teamsFromSlots=slots=>{const teams=[0,1,0,1];slots.forEach((seat,k)=>{if(seat!=null)teams[seat]=k<2?0:1;});return teams;};
// The host's move: the player in slot `from` goes to slot `to`, and whoever was there (or the open seat) takes `from`.
export const moveSlot=(slots,from,to)=>{const next=[...slots];[next[from],next[to]]=[next[to],next[from]];return next;};
// The randomized ids a seat may use: one copy each, inside one of its first `count` booster blocks.
export const randomAllowance=(seat,count)=>id=>{const k=randomBooster(id,seat);return k>=0&&k<count;};
// randomOk (Draft Duels only): a check for randomized ids. They skip the catalog, copy and name checks; the clients
// know their frames and keep Fusion Monsters in the Fusion Deck themselves.
export function validateDeck(deck,pool,cards,original=null,unrestricted=false,minimum=40,randomOk=null) {
 const errors=[], all=deckCards(deck), catalog=new Map(cards.map(c=>[c.id,c]));
 if(!Array.isArray(deck.main)||deck.main.length<minimum||deck.main.length>60)errors.push(`Main Deck must contain ${minimum}–60 cards.`);
 if(!Array.isArray(deck.side)||deck.side.length>(unrestricted?0:15))errors.push(unrestricted?'Draft duels have no Side Deck.':'Side Deck may contain 0–15 cards.');
 if(!Array.isArray(deck.extra)||deck.extra.length>15)errors.push('Fusion Deck may contain 0–15 cards.');
 if(all.some(id=>!Number.isInteger(id)))errors.push('Invalid card ID.');
 const owned=counts(pool), used=counts(all), names={};
 for(const [id,n] of Object.entries(used)) {
  const card=catalog.get(+id);
  if(randomOk&&isRandomId(id)){if(!randomOk(+id)||n>1)errors.push('Unknown randomized card: '+id);continue;}
  if(!card){errors.push('Unknown card: '+id);continue;}
  if(n>(owned[id]||0))errors.push('Not enough owned copies of '+card.name+'.');
  const alias=card.name;names[alias]=(names[alias]||0)+n;
 }
 for(const [id,n] of Object.entries(names))if(n>(unrestricted?3:Math.min(...cards.filter(c=>c.name===id).map(c=>LIMITS[c.id]??3))))errors.push(id+(unrestricted?' exceeds the three-copy limit.':' exceeds the April 2004 TCG copy limit.'));
 for(const id of deck.main||[])if(catalog.get(id)?.data?.type&64)errors.push('Fusion Monsters belong in the Fusion Deck.');
 for(const id of deck.extra||[])if(!(randomOk&&isRandomId(id)&&!catalog.has(id))&&!(catalog.get(id)?.data?.type&64))errors.push('Only Fusion Monsters belong in the Fusion Deck.');
 if(original){if(deck.main.length!==original.main.length)errors.push('Keep your starting Main Deck size.');const previous=counts(deckCards(original));if(Object.keys({...previous,...used}).some(id=>previous[id]!==used[id]))errors.push('Siding must preserve all cards in your match decks.');}
 return [...new Set(errors)];
}

// During siding every click transfers one owned copy; no unassigned pool.
export function moveSideCard(deck,from,id,cards){
 if(!['main','side','extra'].includes(from))return false;
 const index=deck[from].indexOf(id),card=cards.find(c=>c.id===id);if(index<0||!card)return false;
 const to=from==='side'?(card.data.type&64?'extra':'main'):'side';
 deck[from].splice(index,1);deck[to].push(id);return true;
}

// Draft loop rooms raise the minimum from 20 to 30 to 40 (draft-pool.mjs minDeckFor).
export const validateDraftDeck=(deck,pool,cards,minimum=40,randomOk=null)=>validateDeck(deck,pool,cards,null,true,minimum,randomOk);
