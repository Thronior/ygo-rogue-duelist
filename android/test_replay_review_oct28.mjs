// CPU misplays confirmed in the 2026-10-28 replay review (1,216 solo replays, v0.2.3-0.2.5 builds).
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,B,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';import {planBattle} from './web/battle-planner.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=1,extra)=>card(name,L.SZONE,controller,sequence,position,extra);
const hand=(name,controller,sequence)=>card(name,L.HAND,controller,sequence,10);
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
const idle=(o={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],monster_sets:[],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true,...o});
const activated=(e,m,name)=>{const r=e.auto(m);return r.action===I.SELECT_ACTIVATE&&e.name(m.activates[r.index].code)===name;};

// 1. "Cannot be destroyed by battle" is no protection from Fissure (0440a8887b: two Fissures held for five turns).
{
 const fissure=hand('Fissure',1,0),ox=mon('Battle Ox',1,2),marsh=mon('Marshmallon',0,2,1);
 const e=duel({1:{[L.HAND]:[fissure],[L.MZONE]:[ox]},0:{[L.MZONE]:[marsh]}},{lp:[1500,8000]});
 assert.ok(activated(e,idle({activates:[fissure]}),'Fissure'),'Fissure clears Marshmallon for a lethal Battle Ox');
}

// 2. Swords of Revealing Light is cast in our Main Phase 2 against a board, before we are in danger.
{
 const swords=hand('Swords of Revealing Light',1,0),ox=mon('Battle Ox',1,2),elf=mon('Mystical Elf',0,1,4);
 const e=duel({1:{[L.HAND]:[swords],[L.MZONE]:[ox]},0:{[L.MZONE]:[elf]}},{phase:256});
 assert.ok(activated(e,idle({activates:[swords],to_bp:false}),'Swords of Revealing Light'),'Swords in Main Phase 2');
 const empty=duel({1:{[L.HAND]:[hand('Swords of Revealing Light',1,0)],[L.MZONE]:[mon('Battle Ox',1,2)]},0:{}},{phase:256});
 assert.ok(!activated(empty,idle({activates:[empty.query(1,L.HAND)[0]],to_bp:false}),'Swords of Revealing Light'),'no Swords against an empty board while ahead');
}

// 3. Fairy Box's own coin-toss prompt is answered yes while its activation is on the chain (8fe95ce338).
{
 const box=back('Fairy Box',1,1,1),skull=mon('Summoned Skull',0,1);
 const e=duel({1:{[L.SZONE]:[box],[L.MZONE]:[mon('Battle Ox',1,2)]},0:{[L.MZONE]:[skull]}},{player:0,phase:16,activeChain:[{code:box.code,player:1}]});
 e.attackCard={controller:0,location:L.MZONE,sequence:1};e.attackTarget={controller:1,location:L.MZONE,sequence:2};
 assert.equal(e.auto({type:M.SELECT_EFFECTYN,player:1,code:box.code,controller:1,location:L.SZONE,sequence:1,position:1}).yes,true,'call the coin');
}

// 4. The pre-errata Ring of Destruction can win: no limit on the target's ATK, but we must survive it (80083507bf).
{
 const ring=back('Ring of Destruction',1,1,10),arsenal=mon('Summoned Skull',0,1);
 let smart=smartContext(duel({1:{[L.SZONE]:[ring]},0:{[L.MZONE]:[arsenal]}},{player:0,lp:[2000,3500]}),1,L,{type:M.SELECT_CHAIN,player:1,selects:[ring]});
 assert.ok(smart.activation(ring,true)>=0,'2500 ATK target against 2000 LP wins, the CPU keeps 1000');
 smart=smartContext(duel({1:{[L.SZONE]:[ring]},0:{[L.MZONE]:[arsenal]}},{player:0,lp:[2000,2500]}),1,L,{type:M.SELECT_CHAIN,player:1,selects:[ring]});
 assert.ok(smart.activation(ring,true)<0,'never a Ring that ends the CPU too');
}

// 5. Heavy Storm is not cast over our own Snatch Steal, and comes before casting it (80e39a132c, 1a549fde2a).
{
 const storm=hand('Heavy Storm',1,0),steal=back('Snatch Steal',1,1,1),stolen=mon('Summoned Skull',1,2,1,{equip_cards:[{controller:1,location:L.SZONE,sequence:1}]});
 const sets=[back('Mirror Force',0,0,10),back('Trap Hole',0,1,10)];
 let smart=smartContext(duel({1:{[L.HAND]:[storm],[L.SZONE]:[steal],[L.MZONE]:[stolen]},0:{[L.SZONE]:sets}}),1,L,idle({activates:[storm]}));
 assert.ok(smart.activation(storm,false)<80,'two unknown sets are not worth giving back Summoned Skull');
 const steal2=hand('Snatch Steal',1,1),storm2=hand('Heavy Storm',1,0),skull=mon('Summoned Skull',0,1);
 const e=duel({1:{[L.HAND]:[storm2,steal2],[L.MZONE]:[mon('Battle Ox',1,2)]},0:{[L.MZONE]:[skull],[L.SZONE]:[back('Mirror Force',0,0,10),back('Trap Hole',0,1,10),back('Waboku',0,2,10)]}});
 const m=idle({activates:[steal2,storm2]}),r=e.auto(m);
 assert.equal(r.action,I.SELECT_ACTIVATE);assert.equal(e.name(m.activates[r.index].code),'Heavy Storm','Storm first, then Snatch Steal');
}

// 6. Ceasefire's lethal count includes our own set Effect Monsters (985f47eb83).
{
 const cease=back('Ceasefire',1,1,10),own=mon('Man-Eater Bug',1,2,8),theirs=mon('Blade Knight',0,1);
 const smart=smartContext(duel({1:{[L.SZONE]:[cease],[L.MZONE]:[own]},0:{[L.MZONE]:[theirs]}},{lp:[1000,8000]}),1,L,idle({activates:[cease]}));
 assert.ok(smart.activation(cease,false)>=80,'two Effect Monsters after the flip deal 1000');
}

// 7. No God is summoned by tributing another God (6a9dd7a8df, fc5da6cfa2).
{
 const obelisk=hand('Obelisk the Tormentor',1,0),slifer=mon('Slifer the Sky Dragon',1,0),a=mon('Battle Ox',1,1),b=mon('Mystical Elf',1,2,4);
 const e=duel({1:{[L.HAND]:[obelisk],[L.MZONE]:[slifer,a,b]},0:{}},{lp:[8000,8000]});
 const r=e.auto(idle({summons:[obelisk]}));
 assert.ok(!(r.action===I.SELECT_SUMMON&&r.index===0),'Obelisk would cost Slifer');
}

// 8. Lethal through defenders: summon the extra attacker instead of setting it (b8b9eb08d6).
{
 const kuriboh=hand('Kuriboh',1,0),eyes=mon('Blue-Eyes White Dragon',1,2),soldier=mon('Giant Soldier of Stone',0,1,4);
 const e=duel({1:{[L.HAND]:[kuriboh],[L.MZONE]:[eyes]},0:{[L.MZONE]:[soldier]}},{lp:[300,8000]});
 const r=e.auto(idle({summons:[kuriboh],monster_sets:[kuriboh]}));
 assert.deepEqual([r.action,r.index],[I.SELECT_SUMMON,0],'Blue-Eyes takes the wall, Kuriboh attacks directly');
}
// ...or switch a Defense Position monster to Attack.
{
 const eyes=mon('Blue-Eyes White Dragon',1,2),ox=mon('Battle Ox',1,3,4),soldier=mon('Giant Soldier of Stone',0,1,4);
 const e=duel({1:{[L.MZONE]:[eyes,ox]},0:{[L.MZONE]:[soldier]}},{lp:[1500,8000]});
 const r=e.auto(idle({pos_changes:[ox]}));
 assert.deepEqual([r.action,r.index],[I.SELECT_POS_CHANGE,0],'Battle Ox switches to Attack for 1700 direct');
}
// ...and never switch a needed attacker to Defense (44f2f2c7f5).
{
 const eyes=mon('Blue-Eyes White Dragon',1,2),ox=mon('Battle Ox',1,3),skull=mon('Summoned Skull',0,1);
 const e=duel({1:{[L.MZONE]:[eyes,ox]},0:{[L.MZONE]:[skull]}},{lp:[1700,8000]});
 assert.notEqual(e.auto(idle({pos_changes:[ox]})).action,I.SELECT_POS_CHANGE,'Blue-Eyes beats Skull, Battle Ox finishes');
}

// 9. Revival adds the attacker that makes lethal, even when it is weaker than their strongest (08e9dc6a46).
{
 const reborn=hand('Monster Reborn',1,0),eyes=mon('Blue-Eyes White Dragon',1,2),soldier=mon('Giant Soldier of Stone',0,1,4),ox=card('Battle Ox',L.GRAVE,1,0,1);
 const e=duel({1:{[L.HAND]:[reborn],[L.MZONE]:[eyes],[L.GRAVE]:[ox]},0:{[L.MZONE]:[soldier]}},{lp:[1000,8000]});
 assert.ok(activated(e,idle({activates:[reborn]}),'Monster Reborn'),'revive Battle Ox for the direct attack');
}

// 10. Lightning Vortex on a lone blocker opens lethal (1e0bc4ad81).
{
 const vortex=hand('Lightning Vortex',1,0),discard=hand('Kuriboh',1,1),a=mon('Gemini Elf',1,1),b=mon('Gemini Elf',1,2),paladin=mon('Amazoness Paladin',0,1);
 const e=duel({1:{[L.HAND]:[vortex,discard],[L.MZONE]:[a,b]},0:{[L.MZONE]:[paladin]}},{lp:[2900,8000]});
 const smart=smartContext(e,1,L,idle({activates:[vortex]}));
 assert.ok(smart.activation(vortex,false)>=80,'3800 direct after Vortex');
}

// 11. Royal Decree clears set traps before a lethal attack (4835929746).
{
 const decree=back('Royal Decree',1,1,10),a=mon('Battle Ox',1,1),b=mon('Battle Ox',1,2);
 const e=duel({1:{[L.SZONE]:[decree],[L.MZONE]:[a,b]},0:{[L.SZONE]:[back('Mirror Force',0,0,10)]}},{lp:[3000,8000],phase:16});
 const r=e.auto({type:M.SELECT_BATTLECMD,player:1,chains:[decree],attacks:[a,b],to_m2:true,to_ep:true});
 assert.deepEqual([r.action,r.index],[B.SELECT_CHAIN,0],'Royal Decree before the attacks');
}

// 12. Every CPU follows a lethal battle line, not only expert opponents.
{
 const eyes=mon('Blue-Eyes White Dragon',1,1),gemini=mon('Gemini Elf',1,2),wall=mon('Celtic Guardian',0,1,4);
 const e=duel({1:{[L.MZONE]:[eyes,gemini]},0:{[L.MZONE]:[wall]}},{lp:[3000,8000],phase:16});
 const m={type:M.SELECT_BATTLECMD,player:1,chains:[],attacks:[eyes,gemini],to_m2:true,to_ep:true};
 const plan=planBattle(e,1,L,m,smartContext(e,1,L,m));
 assert.ok(plan?.lethal,'Gemini Elf takes the wall, Blue-Eyes attacks directly');
 const r=e.auto(m);assert.equal(r.action,B.SELECT_BATTLE);assert.equal(m.attacks[r.index],gemini,'the weaker attacker clears the wall');
}
console.log('replay review oct28 ok');
