// When the CPU should and should not use Enemy Controller (2026-11-01 replay review of v0.2.14 data).
// Each case names the replay it came from where there is one.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,I,B,L} from './web/duel.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const EC=id('Enemy Controller');
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=1,extra)=>card(name,L.SZONE,controller,sequence,position,extra);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// A CPU (seat 1) duel whose zones are given as {[player]:{[location]:cards}}.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:5,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const set=(sequence=4)=>back('Enemy Controller',1,sequence,10,{description:BigInt(EC)<<20n});
const idle=(activates,o={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],monster_sets:[],spell_sets:[],activates,pos_changes:[],to_bp:true,to_ep:true,...o});

// The opponent's Battle Step: `attacker` has been declared on `target` (null for a direct attack).
function stops(mine,theirs,attacker,target,state={}){
 const controller=set(),e=duel({1:{[L.MZONE]:mine,[L.SZONE]:[controller]},0:{[L.MZONE]:theirs}},{player:0,phase:8,...state});
 e.attackCard={controller:0,location:L.MZONE,sequence:attacker.sequence};e.attackTarget=target?{controller:1,location:L.MZONE,sequence:target.sequence}:null;
 e.attacksThisTurn??=new Map([[`0:${attacker.sequence}`,1]]);
 return e.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[controller]}).index===0;
}
// Stop an attack that costs us something.
{
 const crown=mon('Blue-Winged Crown',0,2,1,{attack:3700}),rocket=mon('Rocket Warrior',1,1,1);
 assert.equal(stops([rocket],[crown],crown,rocket),true,'946acd92fe: a 3700-ATK attacker is worth stopping');
 const gearfried=mon('Gearfried the Iron Knight',0,3,1,{attack:2300}),skull=mon('Summoned Skull',1,1,4);
 assert.equal(stops([skull],[gearfried],gearfried,skull),true,'3b94746bfb: 2300 ATK would destroy a 1200-DEF Summoned Skull');
}
// Direct attacks and set monsters count too: the old rule demanded a face-up monster of ours.
{
 const vorse=mon('Vorse Raider',0,2);
 assert.equal(stops([],[vorse],vorse,null,{lp:[8000,1500]}),true,'a lethal direct attack is stopped on an empty board');
 assert.equal(stops([],[vorse],vorse,null),true,'1900 direct damage is worth a card');
 const tiny=mon('Kuriboh',0,2);
 assert.equal(stops([],[tiny],tiny,null),false,'300 direct damage is not');
 const small=mon('Dark Elf',0,2,1,{attack:800});
 assert.equal(stops([],[small],small,null),false,'800 damage at 8000 LP is not');
 assert.equal(stops([],[small],small,null,{lp:[8000,3000]}),true,'800 damage at 3000 LP is');
 const dragon=mon('Blue-Eyes White Dragon',0,2),wall=mon('Island Turtle',1,1,8);
 assert.equal(stops([wall],[dragon],dragon,wall),true,'a set 2000-DEF monster about to be destroyed is saved');
}
// Do not stop an attack that already fails.
{
 const tiger=mon('Zombie Tiger',0,1,1,{attack:1400}),ox=mon('Battle Ox',0,2,1,{attack:1700,attack_count:1}),turtle=mon('Island Turtle',1,1,4);
 assert.equal(stops([turtle],[tiger,ox],tiger,turtle),false,'93b368e774: 1400 ATK cannot get through a 2000-DEF wall');
 const blue=mon('Blue-Eyes White Dragon',1,1),wing=mon('Gray Wing',0,2);
 assert.equal(stops([blue],[wing],wing,blue),false,'a weaker attacker is about to lose the battle');
 const marshmallon=mon('Marshmallon',1,1,4),raider=mon('Vorse Raider',0,2);
 assert.equal(stops([marshmallon],[raider],raider,marshmallon),false,'Marshmallon cannot be destroyed by battle');
}
// Equal ATK trades two monsters for free: not worth a card.
{
 const a=mon('Battle Ox',0,2),b=mon('Battle Ox',1,1);
 assert.equal(stops([b],[a],a,b),false,'an even trade is left alone');
}
// Keep it for the bigger attack still to come, unless this one is lethal.
{
 const sangan=mon('Sangan',0,1),grizzly=mon('Mother Grizzly',0,2),fish=mon('7 Colored Fish',0,3,1,{attack:1800}),muka=mon('Muka Muka',1,1,1,{attack:900});
 assert.equal(stops([muka],[sangan,grizzly,fish],sangan,muka),false,'968e6a7952: Sangan is not the attack to stop while 1800 ATK has not attacked');
 const ox=mon('Battle Ox',0,1);
 const fish2=mon('7 Colored Fish',0,3,1,{attack:2300}),keeper=mon('Battle Ox',1,1,1,{attack:1200});
 assert.equal(stops([keeper],[ox,fish2],ox,keeper),false,'2300 ATK has not attacked yet: wait for it');
 assert.equal(stops([keeper],[ox,fish2],ox,keeper,{attacksThisTurn:new Map([['0:1',1],['0:3',1]])}),true,'the bigger monster already attacked: stop this one');
 assert.equal(stops([],[ox,mon('Blue-Eyes White Dragon',0,2)],ox,null,{lp:[8000,1000]}),true,'a lethal attack is stopped even with more to come');
}
// Monsters that do not need saving.
{
 const raider=mon('Vorse Raider',0,2),bug=mon('Man-Eater Bug',1,1,8);
 assert.equal(stops([bug],[raider],raider,bug),false,'a set Man-Eater Bug wants to be attacked');
 const tomato=mon('Mystic Tomato',1,1,4);
 assert.equal(stops([tomato],[raider],raider,tomato),false,'Mystic Tomato replaces itself when destroyed');
 const weak=mon('Mokey Mokey',1,1,4);
 assert.equal(stops([weak],[raider],raider,weak),false,'a 300/100 monster in Defense is not worth a card');
}
// Only one stop per attack: a second position change would undo the first.
{
 const crown=mon('Blue-Winged Crown',0,2,1,{attack:3700}),rocket=mon('Rocket Warrior',1,1,1);
 assert.equal(stops([rocket],[crown],crown,rocket,{activeChain:[{player:1,code:EC,targets:[crown]}]}),false,'a second copy would switch the attacker back');
 assert.equal(stops([rocket],[crown],crown,rocket,{activeChain:[{player:1,code:id('Waboku'),targets:[]}]}),false,'Waboku already covers this battle');
 assert.equal(stops([rocket],[crown],crown,rocket,{battleProtected:[false,true]}),false,'the CPU is already protected this turn');
 const parked=mon('Blue-Winged Crown',0,2,4,{attack:3700});
 assert.equal(stops([rocket],[parked],parked,rocket),false,'an attacker already in Defense is stopped');
}

// Our own turn: offers the card in an idle prompt.
function ownTurn(mine,theirs,options={}){
 const controller=options.hand?card('Enemy Controller',L.HAND,1,0,1,{description:BigInt(EC)<<20n}):set();
 const e=duel({1:{[L.MZONE]:mine,[L.SZONE]:options.hand?[]:[controller],[L.HAND]:options.hand?[controller]:[]},0:{[L.MZONE]:theirs,[L.SZONE]:options.theirBack||[]}},options.state);
 const r=e.auto(idle([controller],options.idle)),used=r.action===I.SELECT_ACTIVATE&&r.index===0;
 if(used)e.effect={code:EC,player:1};
 return {e,used};
}
const positionTarget=(e,selects)=>{e.selectionHint=528;return selects[e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,selects}).indicies[0]]};
const stealTarget=(e,selects)=>{e.selectionHint=520;return selects[e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,selects}).indicies[0]]};
// 1 for the position change, 2 for the Tribute mode.
const mode=e=>[1,2][e.auto({type:M.SELECT_OPTION,player:1,options:[(BigInt(EC)<<20n)|1n,(BigInt(EC)<<20n)|2n]}).index];
// Do not switch a monster we can already destroy, or with nothing to attack with.
{
 assert.equal(ownTurn([mon('Dark Magician',1,1)],[mon('Mirage Dragon',0,2)]).used,false,'d426fa983a: Dark Magician already beats Mirage Dragon, and switching it cancels the damage');
 assert.equal(ownTurn([mon('Kaiser Sea Horse',1,1)],[mon('Warrior of Zera',0,2),mon('Marshmallon',0,3,4)]).used,false,'4f131ba5aa: same with 1700 ATK into 1600 ATK');
 assert.equal(ownTurn([mon('Horus the Black Flame Dragon LV4',1,1,4),mon('Lord of D.',1,2,8)],[mon('Witch of the Black Forest',0,2)]).used,false,'4fef4b94db: nothing of ours can attack');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[mon('Blue-Eyes White Dragon',0,2)]).used,false,'1700 ATK beats neither 3000 ATK nor 2500 DEF');
 assert.equal(ownTurn([mon('Kuriboh',1,1)],[mon('Marshmallon',0,2,4)]).used,false,'nothing is gained against Marshmallon');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[mon('Celtic Guardian',0,2,4,{attack:1000,defense:1400})]).used,false,'an extra 700 damage on a monster we already destroy is not worth the card');
}
// Timing: only when an attack can follow.
{
 const board=()=>[[mon('Gray Wing',1,1)],[mon('Zolga',0,2)]];
 assert.equal(ownTurn(...board(),{state:{phase:256},idle:{to_bp:false}}).used,false,'no attacks are left in Main Phase 2');
 assert.equal(ownTurn(...board(),{state:{turn:1},idle:{to_bp:false}}).used,false,'no Battle Phase on the first turn');
 assert.equal(ownTurn(...board(),{state:{battleProtected:[true,false]}}).used,false,'no attacks under Swords of Revealing Light');
 assert.equal(ownTurn(...board(),{state:{phase:2}}).used,false,'not in the Standby Phase, before the Normal Summon');
}
// Open a battle we could not win, or real damage.
{
 const gray=mon('Gray Wing',1,1),zolga=mon('Zolga',0,2);
 let {e,used}=ownTurn([gray],[zolga]);
 assert.equal(used,true,'10c7473821: Gray Wing destroys Zolga once it is in Defense');
 assert.equal(mode(e),1,'that is the position change');
 const hayabusa=mon('Hayabusa Knight',0,2,4);
 ({e,used}=ownTurn([mon('Exarion Universe',1,1,1,{attack:3400})],[hayabusa]));
 assert.equal(used,true,'6e4089b145: Hayabusa Knight in Attack takes 2400 damage instead of none');
 assert.equal(positionTarget(e,[hayabusa]).code,hayabusa.code);
 assert.equal(ownTurn([mon('Zombie Tiger',1,1),mon('Gray Wing',1,2)],[mon('Desrook Archfiend',0,2,4)]).used,true,'6315b214eb: a wall comes down and the second attacker goes direct');
 const big=mon('Blue-Eyes White Dragon',0,1),blade=mon('Dark Blade',0,2);
 ({e,used}=ownTurn([mon('Battle Ox',1,1,1,{attack:1800})],[big,blade]));
 assert.equal(used,true,'3c2684350b: 1800 ATK destroys Dark Blade in Defense');
 assert.equal(positionTarget(e,[big,blade]).code,blade.code,'the target is the monster that opens the attack, not the strongest');
 assert.equal(ownTurn([mon('Gray Wing',1,1)],[zolga],{hand:true}).used,true,'from the hand too');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[hayabusa],{state:{lp:[600,8000]}}).used,true,'700 damage is lethal');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[mon('Mystical Elf',0,2,4)]).used,true,'1700 ATK destroys Mystical Elf in Attack, not in Defense');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[mon('Mystical Elf',0,2,4)],{theirBack:[back('Level Limit - Area B',0,1,1)]}).used,false,'Level Limit - Area B holds it in Defense');
}
// Targeting Spirit Reaper destroys it: the card is removal here, which 63673630f2 and cac6ac214a used by accident.
{
 const reaper=mon('Spirit Reaper',0,2,4);
 let {e,used}=ownTurn([mon('Battle Ox',1,1)],[reaper]);
 assert.equal(used,true,'it clears the way for a direct attack');
 assert.equal(mode(e),1,'the position mode: control would destroy it too, at the cost of a Tribute');
 assert.equal(positionTarget(e,[mon('Summoned Skull',0,1),reaper]).code,reaper.code,'it is the target');
 assert.equal(ownTurn([],[reaper]).used,true,'it is removal even with nothing to attack with');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[mon('Spirit Reaper',0,2,4,{is_disabled:true})]).used,false,'a negated Spirit Reaper stays');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[mon('Reaper on the Nightmare',0,2,4)]).used,true,'Reaper on the Nightmare works the same way');
 const attacker=mon('Spirit Reaper',0,2);
 assert.equal(stops([],[attacker],attacker,null),true,'its direct attack would discard from our hand; this stops it and destroys it');
 assert.equal(stops([],[attacker,mon('Blue-Eyes White Dragon',0,3)],attacker,null),false,'unless a bigger attack is still to come');
}
// Conditional immunity does not stop the card saving a monster.
{
 const knight=mon('Command Knight',0,3,1,{attack:1600}),rocket=mon('Rocket Warrior',1,1);
 assert.equal(stops([rocket],[knight],knight,rocket),true,'3ffb14f069: Rocket Warrior is only safe on its own turn');
 const raider=mon('Battle Ox',0,3,1,{attack:1800}),guard=mon('Obnoxious Celtic Guard',1,1,4);
 assert.equal(stops([guard],[raider],raider,guard),true,'1800 ATK can destroy Obnoxious Celtic Guard');
 const big=mon('Vorse Raider',0,3,1,{attack:2000});
 assert.equal(stops([guard],[big],big,guard),false,'2000 ATK cannot');
}
// The Normal Summon still to come.
{
 const zolga=mon('Zolga',0,2),summons=[card('Gemini Elf',L.HAND,1,1)];
 assert.equal(ownTurn([mon('Gray Wing',1,1)],[zolga],{idle:{summons}}).used,false,'Gemini Elf already beats Zolga: summon it instead');
 assert.equal(ownTurn([],[zolga],{idle:{summons:[card('Gray Wing',L.HAND,1,1)]}}).used,false,'a monster still in hand may only be set: do not count on it');
 const controller=set(),e=duel({1:{[L.MZONE]:[mon('Gray Wing',1,1)],[L.SZONE]:[controller]},0:{[L.MZONE]:[zolga]}});
 assert.equal(e.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[controller]}).index,null,'Main Phase chain windows wait for the idle prompt');
}
// The Tribute mode: a win on the spot, or a swing far bigger than the Tribute.
{
 const dragon=mon('Blue-Eyes White Dragon',0,2),kuriboh=mon('Kuriboh',1,1);
 let {e,used}=ownTurn([kuriboh],[dragon],{state:{lp:[2500,8000]}});
 assert.equal(used,true,'taking the only blocker and attacking wins');
 assert.equal(mode(e),2,'that needs the Tribute mode');
 assert.equal(stealTarget(e,[dragon]).code,dragon.code);
 const horn=mon('Tri-Horned Dragon',0,3),shinato=mon('Shinato, King of a Higher Plane',1,2);
 ({e,used}=ownTurn([kuriboh,shinato],[dragon,horn]));
 assert.equal(used,true,'stealing Blue-Eyes White Dragon clears the field for two attacks');
 assert.equal(mode(e),2);
 assert.equal(stealTarget(e,[horn,dragon]).code,dragon.code,'steal the strongest');
 assert.equal(e.auto({type:M.SELECT_UNSELECT_CARD,player:1,select_cards:[shinato,kuriboh],unselect_cards:[],can_finish:false,can_cancel:false}).index,1,'Tribute Kuriboh, not Shinato');
 assert.equal(ownTurn([mon('Battle Ox',1,1)],[dragon]).used,false,'do not Tribute our only monster without a win');
 assert.equal(ownTurn([mon('Muka Muka',1,1,1,{attack:2100}),mon('Man-Eater Bug',1,2,8)],[mon('Mad Dog of Darkness',0,2),mon('Marauding Captain',0,3)]).used,false,'76c0a4afc0: a plain attack already destroys Mad Dog; a set Man-Eater Bug is not spent for extra damage');
 assert.equal(ownTurn([mon('Battle Ox',1,1),mon('Vorse Raider',1,2)],[mon('Dark Blade',0,3,1,{attack:2100,defense:2100}),mon('Blue-Eyes White Dragon',0,4,4)]).used,false,'a stolen attacker that cannot get past the wall is not worth a Tribute');
}

// The real core: the option prompt, the Tribute and the follow-up attack.
const engine=await new MobileDuel(meta.cards).init([data,JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url)))]);
const place=(side,name,position='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(${side},${id(name)}),${side},${side},LOCATION_MZONE,${position},true)`;
const hand=(side,name)=>`Duel.SendtoHand(Duel.CreateToken(${side},${id(name)}),${side},REASON_RULE)`;
// Unsummonable Blue-Eyes decks keep the field to the monsters placed here, at the start of turn `from`. Plays until turn `last` ends.
function play(setup,lp,last,from=1){
 const lua=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) if Duel.GetTurnCount()<${from} then return end e:Reset()
 ${setup.join('\n')}
 end) Duel.RegisterEffect(e,0)`;
 const deck=Array(40).fill(id('Blue-Eyes White Dragon'));
 engine.start(deck,deck,lp[0],lp[1],5,123,[],[],lua);
 const log={uses:[],options:[]};
 for(let n=0;n<800&&!engine.finished&&engine.pending&&engine.turn<=last;n++){
  const m=engine.pending,r=engine.auto(),list=m.type===M.SELECT_IDLECMD&&r.action===I.SELECT_ACTIVATE?m.activates:m.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_CHAIN?m.chains:m.type===M.SELECT_CHAIN?m.selects:null;
  if(list?.[r.index]?.code===EC)log.uses.push({seat:m.player,turn:engine.turn,phase:engine.phase});
  if(m.type===M.SELECT_OPTION&&engine.effect?.code===EC)log.options.push(Number(BigInt(m.options[r.index])&0xfffffn));
  engine.respond(r);
 }
 assert.deepEqual(engine.errors,[]);
 return log;
}
try{
 let log=play([place(1,'Gray Wing'),place(0,'Zolga'),hand(1,'Enemy Controller')],[8000,8000],2);
 assert.deepEqual(log.uses,[{seat:1,turn:2,phase:4}],'Main Phase 1 of the CPU turn');
 assert.deepEqual(log.options,[1]);
 assert.equal(engine.query(0,L.MZONE).filter(Boolean).length,0,'Gray Wing destroys the switched Zolga');
 engine.destroy();
 log=play([place(1,'Kuriboh'),place(0,'Blue-Eyes White Dragon'),hand(1,'Enemy Controller')],[2500,8000],2);
 assert.deepEqual(log.options,[2],'the Tribute mode');
 assert.equal(engine.query(1,L.GRAVE).filter(c=>c&&engine.name(c.code)==='Kuriboh').length,1,'Kuriboh pays');
 assert.equal(engine.finished?.player,1,'the stolen Blue-Eyes White Dragon attacks directly for the win');
 engine.destroy();
 log=play([place(1,'Shinato, King of a Higher Plane'),place(1,'Kuriboh'),place(0,'Blue-Eyes White Dragon'),place(0,'Tri-Horned Dragon'),hand(1,'Enemy Controller')],[8000,8000],2,2);
 assert.deepEqual(log.options,[2],'the Tribute mode');
 assert.ok(!engine.query(1,L.MZONE).some(c=>c&&engine.name(c.code)==='Kuriboh')&&engine.query(1,L.GRAVE).some(c=>c&&engine.name(c.code)==='Kuriboh'),'Kuriboh pays the Tribute');
 assert.ok(engine.query(1,L.MZONE).some(c=>c&&engine.name(c.code)==='Shinato, King of a Higher Plane'),'Shinato stays');
 assert.equal(engine.lp[0],8000-150-3300,'Blue-Eyes White Dragon destroys Tri-Horned Dragon and Shinato attacks directly');
 engine.destroy();
 log=play([place(1,'Battle Ox'),place(0,'Spirit Reaper','POS_FACEUP_DEFENSE'),hand(1,'Enemy Controller')],[8000,8000],2,2);
 assert.deepEqual(log.options,[1],'the position mode');
 assert.equal(engine.query(0,L.MZONE).filter(Boolean).length,0,'targeting destroys Spirit Reaper');
 assert.equal(engine.lp[0],8000-1700,'and Battle Ox attacks directly');
 engine.destroy();
 log=play([place(1,'Battle Ox'),place(0,'Blue-Eyes White Dragon'),hand(1,'Enemy Controller')],[8000,8000],3);
 assert.deepEqual(log.uses.map(x=>[x.seat,x.turn,x.phase]),[[1,3,8]],'set on the CPU turn, used on the attack');
 assert.deepEqual(log.options,[1]);
 assert.equal(engine.query(1,L.MZONE).filter(Boolean).length,1,'Battle Ox survives');
 assert.equal(engine.query(0,L.MZONE).find(Boolean)?.position,4,'Blue-Eyes White Dragon ends up in Defense');
 engine.destroy();
}finally{engine.destroy()}
console.log('PASS Enemy Controller: stops attacks that cost something, holds for bigger attacks, opens attacks on its own turn, Tribute mode for wins and big swings');
