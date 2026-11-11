// Tutorial duel (2026-11-11): one scripted duel that teaches the phases, the kinds of cards and the basic plays.
// This file is the script only (no DOM): the staged decks, the opponent's fixed moves, the player's guided steps
// ("beats") and every line of text. tutorial-coach.js draws it; mobile.js starts it and asks before each response.
// The duel is staged with Debug.AddCard, so no deck is shuffled and it always plays the same.
import {M,R,I,B,L} from './engine.js';

export const CARD={celtic:91152256,wizard:71625222,skull:70781052,cylinder:62279055,fissure:66788016,jinn:97590747,elf:15025844,ox:5053103,soldier:13039848,bewd:89631139,reborn:83764718};
// Yugi Muto learns from Solomon Muto.
export const LESSON_PLAYER=13,LESSON_OPPONENT=23,LESSON_LP=8000,LESSON_SEED=271828;
// Time Wizard's toss is fixed by the seed; the guide asks for the call that wins it (android/test_tutorial_duel.mjs).
export const WINNING_CALL='tails';

// Decks are listed top card first. The opening hand has four cards; the first Draw Phase adds Fissure.
const PLAYER_HAND=[CARD.celtic,CARD.wizard,CARD.skull,CARD.cylinder];
const PLAYER_DECK=[CARD.fissure,CARD.ox,CARD.soldier,CARD.ox,CARD.ox,CARD.ox,CARD.ox,CARD.ox];
// The opponent starts with seven cards, so the hand limit makes them discard at the end of turn 2.
const CPU_HAND=[CARD.jinn,CARD.bewd,CARD.reborn,CARD.elf,CARD.ox,CARD.ox,CARD.ox];
const CPU_DECK=[CARD.ox,CARD.ox,CARD.ox,CARD.ox,CARD.ox,CARD.ox,CARD.ox,CARD.ox];
export const LESSON_POOL=[...PLAYER_HAND,...PLAYER_DECK];

export function lessonScript(){
 const add=(code,seat,loc)=>`Debug.AddCard(${code},${seat},${seat},${loc},0,POS_FACEDOWN)\n`;
 let t=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${LESSON_LP},0,1)\nDebug.SetPlayerInfo(1,${LESSON_LP},0,1)\n`;
 for(const [seat,hand,deck] of [[0,PLAYER_HAND,PLAYER_DECK],[1,CPU_HAND,CPU_DECK]]){
  for(const code of hand)t+=add(code,seat,'LOCATION_HAND');
  // The last card added is the top of the Deck.
  for(const code of [...deck].reverse())t+=add(code,seat,'LOCATION_DECK');
 }
 return t+'Debug.ReloadFieldEnd()\n';
}
// Starts the staged duel on an initialised MobileDuel and returns its first snapshot. Nothing is recorded.
export function startLessonDuel(engine){
 engine.start([],[],LESSON_LP,LESSON_LP,0,LESSON_SEED,[],[],lessonScript(),0);
 engine.core.startDuel(engine.h);
 const snapshot=engine.advance();
 engine.replayRecord=null;
 return snapshot;
}

// ---- Text. Every string is plain English and is translated through the i18n dictionaries like any other text. ----
export const INTRO=[
 {title:'Welcome, Duelist!',text:'This short Duel teaches you how to play. Follow the glowing hints.'},
 {title:'How to win',text:'Each player has Life Points (LP). Bring your opponent\'s LP down to 0 and you win.'},
 {title:'Phases',text:'Duels are played in phases. Each turn has 6 phases, shown on the bar in the middle of the field.'}
];
export const PHASE_TEXT={
 1:['Draw Phase','This is when you draw 1 card.'],
 2:['Standby Phase','This one is skipped unless an effect mentions it.'],
 4:['Main Phase 1','During your Main Phase you can Set, Summon and activate cards from your hand.'],
 8:['Battle Phase','During the Battle Phase you can use your monsters to attack.'],
 256:['Main Phase 2','This phase is optional. Use it if you want to Set, activate or Summon cards after attacking.'],
 512:['End Phase','Your turn ends here. It works a lot like the Standby Phase: nothing happens unless an effect mentions it.']
};
export const OPPONENT_TURN='Your opponent\'s turn. They go through the same phases.';
// The hand tour: `card` is highlighted in the hand and shown in the card window; `part` highlights one part of it.
export const TOUR=[
 {title:'Your hand',text:'These are your cards. There are 3 kinds: Monsters, Spells and Traps.',focus:'hand'},
 {title:'Normal Monster',text:'Celtic Guardian is a Normal Monster. Monsters fight for you. A Normal Monster has no effect.',card:CARD.celtic},
 {title:'Effect Monster',text:'Time Wizard is an Effect Monster. It has a special ability written on the card.',card:CARD.wizard},
 {title:'Tribute Monster',text:'Summoned Skull is Level 6. Monsters of Level 5 or 6 are too strong to Summon for free, so they cost 1 Tribute: you send 1 of your own monsters to the Graveyard to Summon it.',card:CARD.skull},
 {title:'Spell Card',text:'Fissure is a Spell. You play Spells from your hand during your Main Phase.',card:CARD.fissure},
 {title:'Trap Card',text:'Magic Cylinder is a Trap. You Set a Trap face-down first, then use it later, even on your opponent\'s turn.',card:CARD.cylinder},
 {title:'The card window',text:'Tap any card to read it here. Let\'s look at Celtic Guardian.',card:CARD.celtic,part:'window'},
 {title:'Level',text:'The stars are the Level. Level 4 or lower: Summon it right away. Level 5 or 6: 1 Tribute. Level 7 or higher: 2 Tributes.',card:CARD.celtic,part:'stats'},
 {title:'ATK and DEF',text:'ATK is how hard the monster hits when it attacks. DEF is how tough it is in Defense Position. The higher number wins a battle.',card:CARD.celtic,part:'stats'},
 {title:'Attribute and Type',text:'Every monster has an Attribute, like EARTH, and a Type, like Warrior. Some cards only work with certain Attributes or Types.',card:CARD.celtic,part:'genre'},
 {title:'Card text',text:'The text says what the card does. Read it whenever you are not sure.',card:CARD.wizard,part:'text'}
];
// What the opponent does that needs a word: shown and waited on. The discard is explained as it is chosen; Monster
// Reborn once the card is face-up on the field, before it resolves. The card window stays on the player's own
// cards (user, 2026-11-11): the opponent's card is only shown where it is, on the field.
export const CPU_NOTES={
 discard:{title:'Hand limit',text:'You can hold at most 6 cards at the end of your turn. Your opponent has 7, so they discard Blue-Eyes White Dragon to the Graveyard.',dock:'low'},
 reborn:{title:'Monster Reborn',text:'Monster Reborn is a Spell. It Special Summons 1 monster from either Graveyard, with no Tribute. Your opponent uses it to bring back Blue-Eyes White Dragon.',dock:'low'}
};
export const NUDGE='Not that one. Follow the glowing hint.';
export const FREE_PLAY='You are on your own now. Finish the Duel!';
export const FINISH={
 win:['Tutorial complete!','You won your first Duel. You know the phases, the kinds of cards and the basic plays. Time for a real run!'],
 loss:['Tutorial over','That Duel got away, but you have seen the basics. You can replay the tutorial any time from Settings.']
};

const idle=turn=>(m,e)=>m.type===M.SELECT_IDLECMD&&e.turn===turn;
const battle=turn=>(m,e)=>m.type===M.SELECT_BATTLECMD&&e.turn===turn;
const pick=(list,code)=>{const index=(list||[]).findIndex(c=>c.code===code);return index<0?null:index};
const idleCard=(action,list,code)=>m=>{const index=pick(m[list],code);return index===null?null:{type:R.SELECT_IDLECMD,action,index}};
const idlePhase=action=>m=>({type:R.SELECT_IDLECMD,action,index:null});
const attackWith=code=>m=>{const index=pick(m.attacks,code);return index===null?null:{type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index}};
// `show` tells the coach what to light up: a hand card, a field card (zone), a phase button or an on-screen prompt.
// `act` is the button of the card's action menu, as "responseType:action".
const menu=action=>R.SELECT_IDLECMD+':'+action,attackMenu=R.SELECT_BATTLECMD+':'+B.SELECT_BATTLE;
export const BEATS=[
 {id:'summon-celtic',on:idle(1),want:idleCard(I.SELECT_SUMMON,'summons',CARD.celtic),show:{hand:CARD.celtic,act:menu(I.SELECT_SUMMON)},
  say:'Tap Celtic Guardian, then tap Summon.',why:'You can Normal Summon 1 monster each turn. Level 4 or lower needs no Tribute.'},
 {id:'set-cylinder',on:idle(1),want:idleCard(I.SELECT_SPELL_SET,'spell_sets',CARD.cylinder),show:{hand:CARD.cylinder,act:menu(I.SELECT_SPELL_SET)},
  say:'Tap Magic Cylinder, then tap Set.',why:'A Trap must be Set face-down before you can use it. It will protect you on your opponent\'s turn.'},
 {id:'end-1',on:idle(1),want:idlePhase(I.TO_EP),show:{phase:512},
  say:'Tap EP to end your turn.',why:'The player who goes first cannot attack on the first turn.'},
 {id:'cylinder',on:(m,e)=>m.type===M.SELECT_CHAIN&&e.turn===2&&pick(m.selects,CARD.cylinder)!==null,want:m=>({type:R.SELECT_CHAIN,index:pick(m.selects,CARD.cylinder)}),show:{zone:CARD.cylinder,prompt:'confirm'},
  say:'Your opponent attacks! Tap your Set Magic Cylinder, then confirm with ✓.',why:'La Jinn has 1800 ATK and Celtic Guardian only 1400, so you would lose the battle. Magic Cylinder stops the attack and deals 1800 damage to your opponent.'},
 {id:'fissure',on:idle(3),want:idleCard(I.SELECT_ACTIVATE,'activates',CARD.fissure),show:{hand:CARD.fissure,act:menu(I.SELECT_ACTIVATE)},
  say:'Tap Fissure, then tap Activate.',why:'Fissure destroys your opponent\'s weakest face-up monster. With La Jinn gone, nothing protects their Life Points.'},
 {id:'summon-ox',on:idle(3),want:idleCard(I.SELECT_SUMMON,'summons',CARD.ox),show:{hand:CARD.ox,act:menu(I.SELECT_SUMMON)},
  say:'Tap Battle Ox, then tap Summon.',why:'Before you attack, Summon one more monster. Two attackers deal more damage than one.'},
 {id:'battle-3',on:idle(3),want:idlePhase(I.TO_BP),show:{phase:8},
  say:'Tap BP to enter the Battle Phase.',why:'Your opponent has no monsters. Time to attack!'},
 {id:'attack-celtic',on:battle(3),want:attackWith(CARD.celtic),show:{zone:CARD.celtic,act:attackMenu},
  say:'Tap Celtic Guardian, then tap Attack.',why:'With no monster in the way, the attack hits your opponent\'s Life Points directly.'},
 {id:'attack-ox',on:battle(3),want:attackWith(CARD.ox),show:{zone:CARD.ox,act:attackMenu},
  say:'Tap Battle Ox, then tap Attack.',why:'Every monster in Attack Position can attack once each turn.'},
 {id:'main-2',on:battle(3),want:m=>({type:R.SELECT_BATTLECMD,action:B.TO_M2,index:null}),show:{phase:256},
  say:'Tap MP2 to go to Main Phase 2.',why:'After attacking, you can still play cards from your hand.'},
 {id:'end-3',on:idle(3),want:idlePhase(I.TO_EP),show:{phase:512},
  say:'Tap EP to end your turn.',why:'You have nothing left to play this turn.'},
 {id:'summon-wizard',on:idle(5),want:idleCard(I.SELECT_SUMMON,'summons',CARD.wizard),show:{hand:CARD.wizard,act:menu(I.SELECT_SUMMON)},
  say:'Tap Time Wizard, then tap Summon.',why:'Blue-Eyes White Dragon has 3000 ATK. None of your monsters can beat it in battle, but Time Wizard\'s effect can.'},
 {id:'wizard-effect',on:idle(5),want:idleCard(I.SELECT_ACTIVATE,'activates',CARD.wizard),show:{zone:CARD.wizard,act:menu(I.SELECT_ACTIVATE)},
  say:'Tap Time Wizard on the field, then tap Activate.',why:'Effect Monsters have special abilities. Time Wizard spins its wheel: call it right and every monster your opponent controls is destroyed.'},
 {id:'call',on:m=>m.type===M.SELECT_OPTION,want:(m,e)=>{const index=m.options.findIndex(v=>String(e.description(v)).trim().toLowerCase()===WINNING_CALL);return {type:R.SELECT_OPTION,index:index<0?0:index}},show:{prompt:'call'},
  say:'Call Tails, then confirm.',why:'It is a gamble: a wrong call would destroy your own monsters instead. This time, Tails is the lucky call.',after:'Now tap the wheel to spin it.'},
 {id:'battle-5',on:idle(5),want:idlePhase(I.TO_BP),show:{phase:8},
  say:'Tap BP to enter the Battle Phase.',why:'The way is clear again.'},
 {id:'attack-celtic-5',on:battle(5),want:attackWith(CARD.celtic),show:{zone:CARD.celtic,act:attackMenu},
  say:'Tap Celtic Guardian, then tap Attack.',why:'With no monster in the way, the attack hits your opponent\'s Life Points directly.'},
 {id:'attack-wizard-5',on:battle(5),want:attackWith(CARD.wizard),show:{zone:CARD.wizard,act:attackMenu},
  say:'Tap Time Wizard, then tap Attack.',why:'Every monster in Attack Position can attack once each turn.'},
 {id:'end-5',on:battle(5),want:m=>({type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null}),show:{phase:512},
  say:'Tap EP to end your turn.',why:'You have nothing left to play this turn.'},
 {id:'summon-skull',on:idle(7),want:idleCard(I.SELECT_SUMMON,'summons',CARD.skull),show:{hand:CARD.skull,act:menu(I.SELECT_SUMMON)},
  say:'Tap Summoned Skull, then tap Summon.',why:'Level 5 and 6 monsters need 1 Tribute. Time Wizard has done its job, so it is the perfect Tribute.'},
 {id:'tribute',on:m=>m.type===M.SELECT_TRIBUTE,want:m=>({type:R.SELECT_TRIBUTE,indicies:[pick(m.selects,CARD.wizard)??0]}),show:{zone:CARD.wizard,prompt:'confirm'},
  say:'Choose Time Wizard as the Tribute, then confirm.',why:'The Tribute goes to the Graveyard and Summoned Skull takes the field.'},
 {id:'battle-7',on:idle(7),want:idlePhase(I.TO_BP),show:{phase:8},
  say:'Tap BP to enter the Battle Phase.',why:'Time to attack!'},
 {id:'attack-skull',on:battle(7),want:attackWith(CARD.skull),show:{zone:CARD.skull,act:attackMenu},
  say:'Tap Summoned Skull, then tap Attack.',why:'Your opponent Set a monster face-down in Defense Position. Summoned Skull\'s 2500 ATK beats its DEF, so it is destroyed, but your opponent takes no damage.'},
 {id:'attack-celtic-7',on:battle(7),want:attackWith(CARD.celtic),show:{zone:CARD.celtic,act:attackMenu},
  say:'Tap Celtic Guardian, then tap Attack.',why:'1400 damage is more than the Life Points your opponent has left. This attack wins the Duel!'}
];

const same=(a,b)=>!!a&&!!b&&a.type===b.type&&(a.action??null)===(b.action??null)&&(a.index??null)===(b.index??null)&&(a.yes??null)===(b.yes??null)&&JSON.stringify([...(a.indicies||[])].sort())===JSON.stringify([...(b.indicies||[])].sort());
const COMMANDS=()=>[M.SELECT_IDLECMD,M.SELECT_BATTLECMD];

export class Lesson{
 constructor(){this.at=0;this.free=false;this.matched=null;this.seenPhases=new Set()}
 // The guided step for the player's current prompt, or null (an automatic prompt, or free play).
 beat(engine){
  const m=engine?.pending,b=BEATS[this.at];
  if(this.free||!m||m.player!==0||!b||!b.on(m,engine))return null;
  return b.want(m,engine)?b:null;
 }
 // What the player's prompt needs: {beat,response} for a guided step, {auto,response} for a prompt the tutorial
 // answers itself (zones, chain windows with nothing to teach), or {free:true} once the script no longer applies.
 next(engine){
  const m=engine?.pending;if(!m||m.player!==0)return null;
  const b=this.beat(engine);if(b)return {beat:b,response:b.want(m,engine)};
  if(COMMANDS().includes(m.type)){this.free=true;return {free:true}}
  if(this.free)return {free:true};
  if(m.type===M.SELECT_CHAIN)return {auto:true,response:{type:R.SELECT_CHAIN,index:m.forced?0:null}};
  if(m.type===M.SELECT_POSITION)return {auto:true,response:{type:R.SELECT_POSITION,position:(m.positions&1)?1:(m.positions&8)?8:4}};
  if([M.SELECT_EFFECTYN,M.SELECT_YESNO].includes(m.type))return {auto:true,response:{type:m.type===M.SELECT_EFFECTYN?R.SELECT_EFFECTYN:R.SELECT_YESNO,yes:true}};
  return {auto:true,response:engine.auto(m)};
 }
 // May the player's response go to the duel? Guided steps accept only the taught move; everything else passes.
 check(engine,response){
  const m=engine?.pending;this.matched=null;
  if(!m||m.player!==0)return true;
  const step=this.next(engine);
  if(!step?.beat)return true;
  if(!same(step.response,response))return false;
  this.matched=step.beat;return true;
 }
 // Call once the accepted response has resolved. Returns the guided step that was just completed, if any.
 done(){const b=this.matched;if(b){this.at++;this.matched=null}return b}
 // The scripted opponent. Turn 2: La Jinn attacks, then the hand limit discards Blue-Eyes White Dragon. Turn 4: Monster
 // Reborn brings it back and it attacks Battle Ox. Turn 6: a Set Mystical Elf. Off script it plays normally.
 cpu(engine){
  const m=engine.pending,own=engine.query(1,L.MZONE).filter(Boolean),turn=engine.turn;
  if(this.free||turn>6)return engine.auto(m);
  const attacker=turn===2?CARD.jinn:turn===4?CARD.bewd:0,ready=own.some(c=>c.code===attacker&&!c.attack_count);
  if(m.type===M.SELECT_IDLECMD){
   const summon=turn===2&&!own.length?pick(m.summons,CARD.jinn):null;
   if(summon!==null)return {type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:summon};
   const reborn=turn===4&&!own.length?pick(m.activates,CARD.reborn):null;
   if(reborn!==null)return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:reborn};
   const set=turn===6&&!own.length?pick(m.monster_sets,CARD.elf):null;
   if(set!==null)return {type:R.SELECT_IDLECMD,action:I.SELECT_MONSTER_SET,index:set};
   if(m.to_bp&&ready)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
   return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  }
  if(m.type===M.SELECT_BATTLECMD){
   const attack=ready?pick(m.attacks,attacker):null;
   if(attack!==null)return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:attack};
   return {type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null};
  }
  if(m.type===M.SELECT_CHAIN)return {type:R.SELECT_CHAIN,index:m.forced?0:null};
  // Card picks: the discard and the Monster Reborn target are Blue-Eyes; its attack goes into Battle Ox.
  if(m.type===M.SELECT_CARD){
   const index=pick(m.selects,CARD.bewd)??pick(m.selects,CARD.ox);
   if(index!==null)return {type:R.SELECT_CARD,indicies:[index]};
  }
  if(m.type===M.SELECT_POSITION&&(m.positions&1))return {type:R.SELECT_POSITION,position:1};
  return engine.auto(m);
 }
 // The explanation (CPU_NOTES) owed before this opponent move, each given once.
 cpuNote(engine,response){
  const m=engine.pending,noted=this.noted??=new Set();
  // Monster Reborn is explained once it is face-up on the field, when the opponent picks what it brings back.
  const picked=m.type===M.SELECT_CARD&&m.selects?.[response.indicies?.[0]]?.code===CARD.bewd;
  const key=picked&&engine.turn===2?'discard':picked&&engine.turn===4?'reborn':null;
  if(!key||noted.has(key))return null;
  noted.add(key);return CPU_NOTES[key];
 }
 // A phase explanation: shown in full (and waited on) the first time it comes up on the player's own turn.
 phase(phase,player){
  const key=phase>=8&&phase<256?8:phase,text=PHASE_TEXT[key];if(!text)return null;
  if(player!==0)return {title:text[0],text:OPPONENT_TURN,block:false,phase:key};
  const first=!this.seenPhases.has(key);this.seenPhases.add(key);
  return {title:text[0],text:text[1],block:first,phase:key};
 }
}
