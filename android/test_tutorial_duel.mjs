// The tutorial duel in the real core: the scripted flow reaches a win, always the same way, and a wrong move is refused.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
import {Lesson,BEATS,CARD,TOUR,INTRO,PHASE_TEXT,CPU_NOTES,WINNING_CALL,LESSON_LP,startLessonDuel} from './web/tutorial-duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),all=[...meta.cards,...meta.tokenCards];
const e=await new MobileDuel(all).init([data,scripts]);
const names=(s,l)=>e.query(s,l).filter(Boolean).map(c=>e.name(c.code));
let checks=0;const ok=(v,why)=>{assert.ok(v,why);checks++},eq=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};

// Every card the script names exists under that id.
for(const [key,name] of Object.entries({celtic:'Celtic Guardian',wizard:'Time Wizard',skull:'Summoned Skull',cylinder:'Magic Cylinder',fissure:'Fissure',jinn:'La Jinn the Mystical Genie of the Lamp',elf:'Mystical Elf',ox:'Battle Ox',bewd:'Blue-Eyes White Dragon',reborn:'Monster Reborn'}))eq(e.name(CARD[key]),name,key);

// Plays the whole lesson. `wrong` tries a wrong move before each guided step; `log` collects what happened.
function play({wrong=false}={}){
 const lesson=new Lesson(),log=[],phases=[],notes=[],seen=[];
 const onMessage=e.onMessage.bind(e);
 e.onMessage=m=>{if(m.type===M.NEW_PHASE)phases.push([e.turn,e.player,m.phase]);onMessage(m)};
 try{
  startLessonDuel(e);
  eq(e.replayRecord,null,'the tutorial is not recorded');
  eq(names(0,L.HAND).sort(),['Celtic Guardian','Fissure','Magic Cylinder','Summoned Skull','Time Wizard'],'opening hand after the first draw');
  eq([e.turn,e.player,e.phase],[1,0,4],'the player starts in Main Phase 1');
  for(let i=0;i<400&&e.pending&&!e.finished;i++){
   const m=e.pending;
   if(m.player===1){const r=lesson.cpu(e),note=lesson.cpuNote(e,r);if(note)notes.push([e.turn,note.title]);e.respond(r);if(e.turn===4)seen.push(names(1,L.MZONE).join());continue}
   const step=lesson.next(e);
   ok(step&&!step.free,`the script covers prompt ${m.type} on turn ${e.turn} (beat ${BEATS[lesson.at]?.id})`);
   if(step.beat&&wrong){
    // Ending the turn, or picking another card, must be refused without touching the duel.
    const other=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:step.response.action===I.TO_EP?I.TO_BP:I.TO_EP,index:null}:m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:step.response.action===B.TO_EP?B.TO_M2:B.TO_EP,index:null}:m.type===M.SELECT_CHAIN?{type:R.SELECT_CHAIN,index:null}:m.type===M.SELECT_OPTION?{type:R.SELECT_OPTION,index:1-step.response.index}:null;
    if(other){ok(!lesson.check(e,other),`wrong move refused at ${step.beat.id}`);eq(e.pending,m,'the prompt is still waiting')}
   }
   ok(lesson.check(e,step.response),'the taught move is accepted');
   if(step.beat)log.push(step.beat.id);
   e.respond(step.response);lesson.done();
  }
 }finally{e.onMessage=onMessage}
 return {lesson,log,phases,notes,seen,winner:e.finished?.player,lp:[...e.lp],errors:e.errors.filter(x=>x.trim()),turn:e.turn};
}

const first=play();
eq(first.errors,[],'no script errors');
eq(first.log,BEATS.map(b=>b.id),'every guided step happens, in order');
eq(first.winner,0,'the player wins');
eq(first.turn,7,'on turn 7');
eq(first.lp,[LESSON_LP-1300,0],'Blue-Eyes beat Battle Ox once: 1300 damage');
// The opponent discards Blue-Eyes to the hand limit, then Monster Reborn brings it back; both are explained once.
eq(first.notes,[[2,CPU_NOTES.discard.title],[4,CPU_NOTES.reborn.title]],'the opponent\'s two explained moves');
ok(first.seen.includes('Blue-Eyes White Dragon'),'Blue-Eyes is revived on turn 4');
ok(!first.lesson.free,'the script never falls back to free play');
// Turn 1 shows Draw, Standby, Main 1 and End; turn 3 adds Battle and Main Phase 2: all six phases on the player's turns.
const own=new Set(first.phases.filter(p=>p[1]===0).map(p=>p[2]>=8&&p[2]<256?8:p[2]));
eq([...own].sort((a,b)=>a-b),[1,2,4,8,256,512],'the player sees all six phases');
eq(first.phases.filter(p=>p[0]===1).map(p=>p[2]),[1,2,4,512],'turn 1 has no Battle Phase');

// Deterministic: a second run is identical, and refused wrong moves change nothing.
const second=play({wrong:true});
eq(second.log,first.log,'same steps with wrong moves tried first');
eq([second.winner,second.lp,second.turn],[first.winner,first.lp,first.turn],'same result');
eq(second.notes,first.notes,'same notes');
eq(second.phases,first.phases,'same phases');

// The lesson's own bookkeeping.
const l=new Lesson();
eq(l.phase(1,0).block,true,'a phase is explained the first time');eq(l.phase(1,0).block,false,'and only named after that');
eq(l.phase(8,1).block,false,'the opponent\'s phases never wait');eq(l.phase(8,0).block,true,'so the player\'s first Battle Phase still explains itself');
eq(l.phase(0x10,0).phase,8,'battle sub-steps count as the Battle Phase');
ok(Object.keys(PHASE_TEXT).length===6&&INTRO.length>0,'six phases have text');
// The hand tour names the five cards the player holds, and every step has text.
eq([...new Set(TOUR.map(s=>s.card).filter(Boolean))].sort(),[CARD.celtic,CARD.wizard,CARD.skull,CARD.cylinder,CARD.fissure].sort(),'the tour covers the five cards');
for(const s of [...INTRO,...TOUR])ok(s.title&&s.text,'tour text');
for(const b of BEATS)ok(b.say&&b.why&&b.show,'beat text '+b.id);
ok(['heads','tails'].includes(WINNING_CALL),'a call is taught');

// Off script the lesson lets go instead of blocking: an unexpected command prompt turns on free play.
startLessonDuel(e);const loose=new Lesson();loose.at=5;
eq(loose.next(e).free,true,'an unexpected prompt frees the player');ok(loose.check(e,{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}),'and any move is allowed');
console.log(`tutorial duel: ${checks} checks passed`);
