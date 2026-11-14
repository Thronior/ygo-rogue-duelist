// "Why can't I?" (2026-11-14). When the engine offers no Activate for your Spell or Trap in hand or Set on the field,
// its action menu shows a greyed Activate whose tap explains why. Only reasons the game state proves are named:
// turn, phase, whether the prompt is yours, the turn a card was Set, free zones, and the LP costs our own relics and
// curses add (Trapbound Idol, Spell/Trap Jammer). Everything else gets the generic line. Read-only: nothing here asks
// the engine to try an activation, and it runs once when the menu opens.
// Monster effects are left out: whether a monster even has an effect you could activate now is not knowable cheaply.

const TYPE_SPELL=0x2,TYPE_TRAP=0x4,TYPE_QUICKPLAY=0x10000,TYPE_FIELD=0x80000,TYPE_COUNTER=0x100000;
const STATUS_SET_TURN=0x10,PHASE_MAIN1=0x4,PHASE_MAIN2=0x200;

export const ACTIVATION_REASONS={
 trapInHand:'Traps must be Set before they can be activated.',
 trapSetTurn:'Traps can’t be activated the turn they’re Set.',
 quickSetTurn:'Quick-Play Spells can’t be activated the turn they’re Set.',
 spellOpponentTurn:'It’s your opponent’s turn. This Spell can only be activated in your Main Phase.',
 spellMainOnly:'This Spell can only be activated in your Main Phase.',
 spellInChain:'Only Quick-Play Spells and Traps can be activated in response to a card or a Summon.',
 quickHandOpponentTurn:'It’s your opponent’s turn. Quick-Play Spells can only be activated from your hand during your turn.',
 wait:'Your opponent is acting. Wait until it’s your move.',
 finishChoice:'Finish the current choice first.',
 zonesFull:'Your Spell & Trap Zones are full.',
 counter:'Counter Traps can only be activated in response to the specific action they name.',
 generic:'This card’s activation conditions aren’t met right now.',
};
const COST={spell:'Can’t pay the cost: {0} makes activating a Spell cost {1} LP, and you have {2} LP.',trap:'Can’t pay the cost: {0} makes activating a Trap cost {1} LP, and you have {2} LP.'};
export const ACTIVATION_COST_PATTERNS=COST;

export const SET_TURN_TEXT=/the turn (it|this card|they) (is|was|are|were) Set/i;
const own=(c,loc,seq)=>c&&(c.controller??c.player??0)===0&&c.location===loc&&c.sequence===seq;

// Returns the reason text, or '' when no greyed Activate belongs in the menu (the card is not your Spell/Trap in hand
// or Set, or the engine already lists an activation for it).
// info: {type, desc, loc, seq, faceDown, status, pending, turnPlayer, phase, lp, spells, modifiers, relicName, curseName, M, L}
export function activationBlock(info){
 const {type=0,desc='',loc,seq,pending:m,M,L}=info,T=Number(type)||0;
 const spell=!!(T&TYPE_SPELL),trap=!!(T&TYPE_TRAP);
 if(!spell&&!trap)return '';
 const set=loc===L.SZONE;
 if(!(loc===L.HAND||(set&&info.faceDown)))return '';
 const text=String(desc);
 if(m?.player===0){
  if(m.type===M.SELECT_IDLECMD&&m.activates?.some(c=>own(c,loc,seq)))return '';
  if(m.type===M.SELECT_BATTLECMD&&m.chains?.some(c=>own(c,loc,seq)))return '';
  if(m.type===M.SELECT_CHAIN&&m.selects?.some(c=>own(c,loc,seq)))return '';
 }
 const quick=spell&&!!(T&TYPE_QUICKPLAY),R=ACTIVATION_REASONS;
 // Card rules first: they hold whatever the timing. A card whose own text makes an exception falls through.
 if(trap&&loc===L.HAND&&!/activate (this card )?(from|in) (your|the) hand/i.test(text))return R.trapInHand;
 // setTurnException: a face-up card of yours lets cards be activated the turn they are Set (Temple of the Kings).
 if(set&&(trap||quick)&&(Number(info.status)&STATUS_SET_TURN)&&!info.setTurnException&&!SET_TURN_TEXT.test(text))return trap?R.trapSetTurn:R.quickSetTurn;
 const myTurn=info.turnPlayer===0,main=info.phase===PHASE_MAIN1||info.phase===PHASE_MAIN2;
 if(spell&&!quick){
  if(!myTurn)return R.spellOpponentTurn;
  if(!main)return R.spellMainOnly;
  if(m?.player===0&&m.type===M.SELECT_CHAIN)return R.spellInChain;
 }
 if(quick&&loc===L.HAND&&!myTurn)return R.quickHandOpponentTurn;
 if(!m||m.player!==0)return R.wait;
 if(![M.SELECT_IDLECMD,M.SELECT_BATTLECMD,M.SELECT_CHAIN].includes(m.type))return R.finishChoice;
 if(spell&&loc===L.HAND&&!(T&TYPE_FIELD)){
  const zones=Math.max(0,Math.min(5,Number(info.modifiers?.spellTrapZones??5)));let free=0;
  for(let i=0;i<zones;i++)if(!info.spells?.[i])free++;
  if(!free)return R.zonesFull;
 }
 const cost=activationCost(info,spell);
 if(cost)return cost;
 if(trap&&(T&TYPE_COUNTER))return R.counter;
 return R.generic;
}

// LP costs that our own relics and curses add to activating a card (passives.py, approved_relic_effects.py). Each cost
// is checked on its own by the core, so the card cannot be activated when your LP is below the largest one.
function activationCost(info,spell){
 const lp=Number(info.lp),mods=info.modifiers||{},relics=mods.activeRelics?.[0]||[],curses=mods.activeCurses||[];
 if(!Number.isFinite(lp))return '';
 const scale=Number(mods.challengeLevel)>=2?2:1,costs=[];
 if(spell){const key=['trapbound_idol','cursed_trapbound_idol'].find(k=>relics.includes(k));if(key)costs.push([info.relicName?.(key)||'Trapbound Idol',300])}
 const jammer=spell?'spell_jammer':'trap_jammer';
 if(curses.includes(jammer))costs.push([info.curseName?.(jammer)||(spell?'Spell Jammer':'Trap Jammer'),300*scale]);
 const top=costs.filter(c=>lp<c[1]).sort((a,b)=>b[1]-a[1])[0];
 if(!top)return '';
 return (spell?COST.spell:COST.trap).replace('{0}',top[0]).replace('{1}',top[1]).replace('{2}',lp);
}
