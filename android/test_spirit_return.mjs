// Player report (2026-11-02): "spirit monsters aren't bouncing after the continuous spell is gone". Spiritual Energy
// Settle Machine plays its first print here (data/pre-errata.json), which lacks the current card's "when this card is
// removed from the field, all face-up Spirit monsters return" line. So a Spirit only goes back at the End Phase of the
// turn it was Normal Summoned or flipped. Every case runs in the real core under the bundled script and the official one.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),id=n=>meta.cards.find(c=>c.name===n).id;
const MACHINE='Spiritual Energy Settle Machine',SPIRIT='Susa Soldier',MST='Mystical Space Typhoon',FILLER='Blue-Eyes White Dragon',key=`c${id(MACHINE)}.lua`;
const official=fs.readFileSync(new URL(`../runtime/script/official/${key}`,import.meta.url),'utf8');
const goodSpirits=fs.readFileSync(new URL('../artifact_effects.py',import.meta.url),'utf8').match(/kind=='no_spirit_return':return '''([\s\S]*?)'''/)[1];
const bounces=script=>script.includes('EVENT_LEAVE_FIELD');

// The text the game shows has to describe the script it runs.
assert.equal(/removed from the field|leaves the field/.test(meta.cards.find(c=>c.id===id(MACHINE)).desc),bounces(scripts[key]),'the shown text matches the bundled script');

const engine=await new MobileDuel(meta.cards).init([data,scripts]);
const give=(p,names)=>names.map(n=>`Duel.SendtoHand(Duel.CreateToken(${p},${id(n)}),nil,REASON_RULE)`).join(' ');
const setup=(mine,theirs,passives)=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${give(0,mine)} ${give(1,theirs)} end) Duel.RegisterEffect(e,0) ${passives}`;
const zone=()=>{for(const p of [0,1])for(const [name,location] of [['hand',L.HAND],['field',L.MZONE]])if(engine.query(p,location).some(c=>c?.code===id(SPIRIT)))return name;return 'gone'};
// Anything without a step passes, and a discard keeps the Spirit.
function pass(m){
 const choices=engine.choices(m);
 if(m.type===M.SELECT_IDLECMD)return (choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/.test(c.label))).response;
 if(m.type===M.SELECT_BATTLECMD)return choices.find(c=>/End turn/.test(c.label)).response;
 if(m.type===M.SELECT_CARD&&m.selects.some(c=>c.code===id(FILLER)))return {type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===id(FILLER))]};
 return DuelEngine.prototype.auto.call(engine,m);
}
// A step is [turn, label regexp] for a listed choice, [turn, card name] to pick a target, or [turn, true/false] to answer the maintenance prompt. A third value limits it to that phase.
function answer(m,step){
 if(!step||step[0]!==engine.turn||(step[2]&&step[2]!==engine.phase))return null;
 const [,want]=step;
 if(typeof want==='boolean')return m.type===M.SELECT_YESNO?{type:R.SELECT_YESNO,yes:want}:null;
 if(typeof want==='string'){const index=m.type===M.SELECT_CARD?m.selects.findIndex(c=>c.code===id(want)):-1;return index<0?null:{type:R.SELECT_CARD,indicies:[index]}}
 return engine.choices(m).find(c=>want.test(c.label))?.response||null;
}
// Plays up to the end of the given turn and returns where the Spirit is.
function play(label,{mine=[],theirs=[],passives='',steps,turns}){
 engine.start(Array(40).fill(id(FILLER)),Array(40).fill(id(FILLER)),8000,8000,2,123,[],[],setup(mine,theirs,passives),2);
 const todo=[...steps];
 for(let n=0;n<600&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  const m=engine.pending,response=answer(m,todo[0]);
  if(response)todo.shift();
  engine.respond(response||pass(m));
 }
 assert.deepEqual(todo,[],`${label}: every step was played`);
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[],label);
 const where=zone();engine.destroy();return where;
}
const activate=name=>new RegExp('Activate · '+name),summon=/^Summon · Susa Soldier/,set=name=>new RegExp('^Set · '+name);

// cases[name]=[where the Spirit should end, duel]; null means it depends on the leave-the-field line (the report).
const cases={
 'no Machine: the Spirit returns':['hand',{mine:[SPIRIT],steps:[[1,summon]],turns:1}],
 'the Machine keeps the Spirit past its End Phase':['field',{mine:[MACHINE,SPIRIT],steps:[[1,activate(MACHINE)],[1,summon],[1,true]],turns:1}],
 'destroyed before the End Phase of the summon':['hand',{mine:[MACHINE,SPIRIT,MST],steps:[[1,activate(MACHINE)],[1,summon],[1,activate(MST)],[1,MACHINE]],turns:1}],
 'maintenance declined in the End Phase of the summon':['hand',{mine:[MACHINE,SPIRIT],steps:[[1,activate(MACHINE)],[1,summon],[1,false]],turns:1}],
 'destroyed in the End Phase before maintenance':['hand',{mine:[MACHINE,SPIRIT,MST],steps:[[1,activate(MACHINE)],[1,summon],[1,activate(MST),512],[1,MACHINE]],turns:1}],
 'destroyed in the End Phase after maintenance':['hand',{mine:[MACHINE,SPIRIT],theirs:['Dust Tornado'],steps:[[1,activate(MACHINE)],[1,true],[2,set('Dust Tornado')],[3,summon],[3,true],[3,/Dust Tornado/,512],[3,MACHINE]],turns:3}],
 'negated by Imperial Order on the summon turn':['hand',{mine:['Imperial Order',MACHINE],theirs:[SPIRIT],steps:[[1,set('Imperial Order')],[1,activate(MACHINE)],[1,true],[2,summon],[2,/Imperial Order/]],turns:2}],
 'flipped on a later turn, maintenance declined':['hand',{mine:[MACHINE,SPIRIT],steps:[[1,activate(MACHINE)],[1,set(SPIRIT)],[1,true],[3,/Change position · Susa/],[3,false]],turns:3}],
 'Mirror of Yata destroyed on the summon turn':['hand',{mine:['Mirror of Yata',SPIRIT,MST],steps:[[1,summon],[1,activate('Mirror of Yata')],[1,SPIRIT],[1,activate(MST)],[1,'Mirror of Yata']],turns:1}],
 'Good Spirits holds every End Phase':['field',{mine:[SPIRIT],passives:goodSpirits,steps:[[1,summon]],turns:3}],
 'destroyed on a later turn':[null,{mine:[MACHINE,SPIRIT],theirs:[MST],steps:[[1,activate(MACHINE)],[1,summon],[1,true],[2,activate(MST)],[2,MACHINE]],turns:2}],
 'maintenance declined on a later turn':[null,{mine:[MACHINE,SPIRIT],steps:[[1,activate(MACHINE)],[1,summon],[1,true],[3,false]],turns:3}],
 "the opponent's Spirit, maintenance declined on a later turn":[null,{mine:[MACHINE],theirs:[SPIRIT],steps:[[1,activate(MACHINE)],[1,true],[2,summon],[3,false]],turns:3}],
};
try{for(const [version,script] of [['bundled',scripts[key]],['official',official]]){
 engine.scripts[key]=script;
 for(const [name,[expected,duel]] of Object.entries(cases)){
  const label=`${version}: ${name}`;
  assert.equal(play(label,duel),expected??(bounces(script)?'hand':'field'),label);
 }
}}finally{engine.destroy()}
console.log(`PASS Spirit return: ${Object.keys(cases).length} cases under both scripts; a Spirit returns whenever the Machine is gone or negated by its End Phase; bundled text and script agree on what happens later`);
