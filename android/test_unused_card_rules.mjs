// Cards the CPU never used in the 2026-10-26 #cpu-decks simulations (no rule, so the generic
// fallback declined them). Each rule must say yes in its situation and no outside it.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=1,extra)=>card(name,L.SZONE,controller,sequence,position,extra);
const inHand=(name,controller,sequence=0)=>card(name,L.HAND,controller,sequence,10);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// The CPU is seat 1; zones are {[player]:{[location]:cards}}.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:5,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const value=(e,c,chain=false)=>smartContext(e,1,L).activation(c,chain);
let checks=0;const check=(actual,expected,message)=>{assert.ok(expected(actual),`${message} (got ${actual})`);checks++};
const yes=v=>v>=0,no=v=>v===-1||v===null;

// LV monsters accept their level-up trigger in the Standby/End Phase.
{
 const horus=mon('Horus the Black Flame Dragon LV6',1,0);
 check(value(duel({1:{[L.MZONE]:[horus]}},{phase:512}),horus,true),yes,'Horus LV6 levels up in the End Phase');
 const armed=mon('Armed Dragon LV3',1,0);
 check(value(duel({1:{[L.MZONE]:[armed]}},{phase:2}),armed,true),yes,'Armed Dragon LV3 levels up in the Standby Phase');
}
// Spell negation: the opponent's Spells only; a paid negation is not spent on removal that only hits itself.
{
 const horus=mon('Horus the Black Flame Dragon LV8',1,0),fissure=id('Fissure');
 check(value(duel({1:{[L.MZONE]:[horus]}},{player:0,effect:{code:fissure,player:0},activeChain:[{code:fissure,player:0,link:1}]}),horus,true),v=>v>=100,'Horus LV8 negates the opponent\'s Fissure');
 check(value(duel({1:{[L.MZONE]:[horus]}},{effect:{code:id('Pot of Greed'),player:1},activeChain:[{code:id('Pot of Greed'),player:1,link:1}]}),horus,true),no,'Horus LV8 lets the CPU\'s own Spell resolve');
 const seal=back('Cursed Seal of the Forbidden Spell',1,0,10),mst=id('Mystical Space Typhoon');
 check(value(duel({1:{[L.SZONE]:[seal],[L.HAND]:[inHand('Pot of Greed',1)]}},{player:0,effect:{code:mst,player:0},activeChain:[{code:mst,player:0,link:1,targets:[seal]}]}),seal,true),no,'Cursed Seal is not spent stopping MST when nothing else is protected');
 const hole=id('Dark Hole');
 check(value(duel({1:{[L.SZONE]:[seal],[L.MZONE]:[mon('Summoned Skull',1,0)],[L.HAND]:[inHand('Pot of Greed',1)]}},{player:0,effect:{code:hole,player:0},activeChain:[{code:hole,player:0,link:1}]}),seal,true),v=>v>=100,'Cursed Seal negates Dark Hole');
}
// Divine Wrath stops a valuable monster effect on the field, not a Graveyard trigger.
{
 const wrath=back('Divine Wrath',1,0,10),reaper=mon('Breaker the Magical Warrior',0,0);
 check(value(duel({0:{[L.MZONE]:[reaper]},1:{[L.SZONE]:[wrath],[L.HAND]:[inHand('Battle Ox',1)]}},{player:0,effect:{code:reaper.code,player:0}}),wrath,true),yes,'Divine Wrath negates Breaker on the field');
 check(value(duel({1:{[L.SZONE]:[wrath],[L.HAND]:[inHand('Battle Ox',1)]}},{player:0,effect:{code:id('Sangan'),player:0}}),wrath,true),no,'Divine Wrath ignores a Graveyard trigger');
}
// Draining Shield stops a damaging attack like Negate Attack.
{
 const shield=back('Draining Shield',1,0,10),attacker=mon('Summoned Skull',0,0);
 check(value(duel({0:{[L.MZONE]:[attacker]},1:{[L.SZONE]:[shield]}},{player:0,phase:8,attackCard:attacker,lp:[8000,2000]}),shield,true),yes,'Draining Shield stops a lethal-range attack');
}
// Union monsters equip from the field and stay equipped.
{
 const y=mon('Y-Dragon Head',1,1),x=mon('X-Head Cannon',1,0);
 check(value(duel({1:{[L.MZONE]:[x,y]}}),y),yes,'Y-Dragon Head equips onto X-Head Cannon');
 const equipped=back('Y-Dragon Head',1,0);
 check(value(duel({1:{[L.MZONE]:[x],[L.SZONE]:[equipped]}}),equipped),no,'an equipped Union stays equipped');
}
// Spell Counter effects.
{
 const counters=n=>({counters:[{type:1,count:n}]}),target=mon('Vorse Raider',0,0);
 const blast3=mon('Blast Magician',1,0,1,counters(3)),blast1=mon('Blast Magician',1,0,1,counters(1));
 check(value(duel({0:{[L.MZONE]:[target]},1:{[L.MZONE]:[blast3]}}),blast3),yes,'Blast Magician with 3 counters destroys a 1900 ATK monster');
 check(value(duel({0:{[L.MZONE]:[target]},1:{[L.MZONE]:[blast1]}}),blast1),no,'Blast Magician with 1 counter cannot reach 1900 ATK');
 const stone=back('Pitch-Black Power Stone',1,0,1,counters(3)),breaker=mon('Breaker the Magical Warrior',1,0),enemyBreaker=mon('Breaker the Magical Warrior',0,0);
 const e=duel({0:{[L.MZONE]:[enemyBreaker]},1:{[L.MZONE]:[breaker],[L.SZONE]:[stone]}});
 check(value(e,stone),yes,'Pitch-Black Power Stone moves a counter to a Spell Counter user');
 const smart=smartContext(e,1,L);
 check(smart.targetScore('Pitch-Black Power Stone',breaker,{cands:[breaker,enemyBreaker]})>smart.targetScore('Pitch-Black Power Stone',enemyBreaker,{cands:[breaker,enemyBreaker]}),v=>v===true,'Pitch-Black Power Stone feeds its own Breaker, not the opponent\'s');
 const dimension=inHand('Magical Dimension',1,1);
 check(value(duel({0:{[L.MZONE]:[mon('Summoned Skull',0,0)]},1:{[L.MZONE]:[mon('Apprentice Magician',1,0)],[L.HAND]:[dimension,inHand('Dark Magician',1,0)]}}),dimension),yes,'Magical Dimension upgrades a Spellcaster and destroys a threat');
}
// One-off rules.
{
 const behemoth=card('Twin-Headed Behemoth',L.GRAVE,1,0);
 check(value(duel({1:{[L.GRAVE]:[behemoth]}},{phase:512}),behemoth,true),yes,'Twin-Headed Behemoth revives itself');
 const will=inHand('Last Will',1),small=[...filler(1),card('Giant Rat',L.DECK,1,20,10)];
 check(value(duel({1:{[L.HAND]:[will],[L.DECK]:small}},{fieldToGraveTurn:[0,5]}),will),yes,'Last Will after a monster went to the GY this turn');
 check(value(duel({1:{[L.HAND]:[will],[L.DECK]:small}},{fieldToGraveTurn:[0,4]}),will),no,'Last Will waits until a monster has gone to the GY');
 const friendship=inHand('Yu-Jo Friendship',1);
 check(value(duel({1:{[L.HAND]:[friendship]}},{lp:[8000,3000]}),friendship),yes,'Yu-Jo Friendship when far behind on LP');
 check(value(duel({1:{[L.HAND]:[friendship]}},{lp:[3000,8000]}),friendship),no,'no Yu-Jo Friendship when ahead');
 const cannon=mon('XYZ-Dragon Cannon',1,0);
 check(value(duel({0:{[L.SZONE]:[back('Mirror Force',0,0,10)]},1:{[L.MZONE]:[cannon],[L.HAND]:[inHand('Battle Ox',1)]}}),cannon),yes,'XYZ-Dragon Cannon discards to destroy a card');
 check(value(duel({0:{[L.SZONE]:[back('Mirror Force',0,0,10)]},1:{[L.MZONE]:[cannon],[L.HAND]:[]}}),cannon),no,'XYZ-Dragon Cannon needs a card to discard');
 const general=inHand('Archfiend General',1);
 check(value(duel({1:{[L.HAND]:[general],[L.DECK]:[...filler(1),card('Pandemonium',L.DECK,1,20,10)]}}),general),yes,'Archfiend General fetches Pandemonium');
}
// Cards from existing game decks that were never used either. Stat changes on the opponent's
// turn are held until the Damage Step (damageStepModifiers), so those checks run there.
{
 const skull=mon('Summoned Skull',0,0),attackState={player:0,phase:8,inDamageStep:true,attackCard:skull};
 const shadow=back('Shadow Spell',1,0,10);
 check(value(duel({0:{[L.MZONE]:[skull]},1:{[L.SZONE]:[shadow]}},attackState),shadow,true),yes,'Shadow Spell stops an attacking Summoned Skull');
 const guardian=back('The Reliable Guardian',1,0,10),wall=mon('Giant Soldier of Stone',1,0,4),skull2=mon('Summoned Skull',0,0);
 check(value(duel({0:{[L.MZONE]:[skull2]},1:{[L.MZONE]:[wall],[L.SZONE]:[guardian]}},{player:0,phase:8,inDamageStep:true,attackCard:skull2,attackTarget:wall}),guardian,true),yes,'The Reliable Guardian lifts a 2000 DEF wall over a 2500 ATK attacker');
 const dragon=mon('Blue-Eyes White Dragon',0,0);
 check(value(duel({0:{[L.MZONE]:[dragon]},1:{[L.MZONE]:[wall],[L.SZONE]:[guardian]}},{player:0,phase:8,inDamageStep:true,attackCard:dragon,attackTarget:wall}),guardian,true),no,'The Reliable Guardian is not wasted when +700 DEF still loses');
 const receive=back('Attack and Receive',1,0,10);
 check(value(duel({1:{[L.SZONE]:[receive]}}),receive,true),yes,'Attack and Receive burns back');
 const dedication=inHand('Dedication through Light and Darkness',1);
 check(value(duel({1:{[L.MZONE]:[mon('Dark Magician',1,0)],[L.HAND]:[dedication]}}),dedication),yes,'Dedication upgrades Dark Magician');
 const returning=inHand('The Warrior Returning Alive',1);
 check(value(duel({1:{[L.HAND]:[returning],[L.GRAVE]:[card('Command Knight',L.GRAVE,1,0)]}}),returning),yes,'The Warrior Returning Alive retrieves a Warrior');
 check(value(duel({1:{[L.HAND]:[returning]}}),returning),no,'The Warrior Returning Alive needs a Warrior in the GY');
 const offering=back('Ultimate Offering',1,0);
 check(value(duel({1:{[L.SZONE]:[offering],[L.HAND]:[inHand('Vorse Raider',1)]}}),offering),yes,'Ultimate Offering grants an extra summon');
}
// Union support: Union Attack, Combination Attack, Formation Union and contact fusions.
{
 const unionAttack=inHand('Union Attack',1),x=mon('X-Head Cannon',1,0),y=mon('Y-Dragon Head',1,1),blue=mon('Blue-Eyes White Dragon',0,0);
 // 1800 + 1500 = 3300 beats a 3000 ATK monster neither can beat alone.
 check(value(duel({0:{[L.MZONE]:[blue]},1:{[L.MZONE]:[x,y],[L.HAND]:[unionAttack]}}),unionAttack),yes,'Union Attack combines ATK to beat Blue-Eyes');
 check(value(duel({0:{[L.MZONE]:[blue]},1:{[L.MZONE]:[x],[L.HAND]:[unionAttack]}}),unionAttack),no,'Union Attack needs a second attacker');
 const combination=inHand('Combination Attack',1),attacked=mon('X-Head Cannon',1,0,1,{attack:2800}),attacks=new Map([['1:0',1]]);
 check(value(duel({0:{[L.MZONE]:[mon('Battle Ox',0,0)]},1:{[L.MZONE]:[attacked],[L.HAND]:[combination]}},{phase:8,attacksThisTurn:attacks}),combination,true),yes,'Combination Attack re-arms a monster that can win again');
 check(value(duel({0:{[L.MZONE]:[mon('Battle Ox',0,0)]},1:{[L.MZONE]:[attacked],[L.HAND]:[combination]}},{phase:8}),combination,true),no,'Combination Attack waits until the monster has attacked');
 check(value(duel({0:{[L.MZONE]:[mon('Battle Ox',0,0)]},1:{[L.MZONE]:[attacked],[L.HAND]:[combination]}},{phase:4}),combination),no,'Combination Attack only in the Battle Phase');
 const formation=inHand('Formation Union',1);
 check(value(duel({1:{[L.MZONE]:[x,y],[L.HAND]:[formation]}}),formation),yes,'Formation Union equips when the Union has used its own equip');
 const offered=duel({1:{[L.MZONE]:[x,y],[L.HAND]:[formation]}});
 check(smartContext(offered,1,L,{activates:[y]}).activation(formation,false),no,'Formation Union waits while the Union can equip itself');
 const formationId=BigInt(id('Formation Union'));
 const chooser=duel({1:{[L.MZONE]:[x,y]}},{effect:{code:id('Formation Union'),player:1}});
 check(smartContext(chooser,1,L).resourceOption([(formationId<<20n)+2n,(formationId<<20n)+1n]),v=>v===1,'Formation Union picks its equip mode');
 const z=mon('Z-Metal Tank',1,2),fusion=card('XYZ-Dragon Cannon',L.EXTRA,1,0,10);
 const strongBoard=duel({0:{[L.MZONE]:[mon('Summoned Skull',0,0)]},1:{[L.MZONE]:[x,y,z],[L.EXTRA]:[fusion]}});
 check(smartContext(strongBoard,1,L).summonUtility(fusion),v=>v===true,'XYZ-Dragon Cannon is summoned to beat what its materials cannot');
 check(value(strongBoard,y),no,'Y-Dragon Head stays a monster for the contact fusion');
 const emptyBoard=duel({1:{[L.MZONE]:[x,y,z],[L.EXTRA]:[fusion]}});
 check(smartContext(emptyBoard,1,L).summonUtility(fusion),v=>v===false,'no contact fusion against an empty board: three attackers deal more');
 check(value(emptyBoard,y),yes,'Y-Dragon Head equips when no contact fusion is worth it');
}
// Round 2 crash: with two Kelbeks, each one's "attack something else" look-ahead re-checked the other forever.
{
 const k1=mon('Kelbek',0,0),k2=mon('Kelbek',0,1),attacker=mon('Summoned Skull',1,0);
 const score=smartContext(duel({0:{[L.MZONE]:[k1,k2]},1:{[L.MZONE]:[attacker]}},{phase:8}),1,L).attackScore(attacker,k1);
 check(typeof score,v=>v==='number','attackScore finishes against two Kelbeks');
}
// The Winged Dragon of Ra has 0 ATK unless its summon trigger pays LP. Gods are always summoned, so Ra takes the boost whenever it is safe.
{
 const out=mon('The Winged Dragon of Ra',1,0,1,{attack:0,defense:0}),label=()=>'Increase ATK and DEF';
 const boost=(enemy,state)=>value(duel({0:{[L.MZONE]:enemy},1:{[L.MZONE]:[out]}},{description:label,...state}),out,true);
 check(boost([mon('Summoned Skull',0,0)]),yes,'a summoned 0-ATK Ra takes its LP boost');
 check(boost([mon('Summoned Skull',0,0)],{description:()=>'Activate the Trigger Effect of "The Winged Dragon of Ra" from [Monster Zone]?'}),yes,'Ra takes its boost when the core asks with the generic trigger prompt');
 check(boost([mon('Summoned Skull',0,0)],{phase:256}),yes,'Ra summoned in Main Phase 2 still takes its boost rather than stay a 0-ATK target');
 check(boost([mon('Summoned Skull',0,0)],{lp:[8000,2500]}),no,'Ra keeps its LP when the boost cannot reach 3000 ATK');
 check(boost([mon('Cannon Soldier',0,0)]),no,'Ra keeps its LP while a face-up burn effect could finish the CPU at 100 LP');
}
console.log(`PASS ${checks} checks: level-ups, Spell and effect negation, Draining Shield, Unions, Spell Counters, Magical Dimension, Ra, one-off rules and existing-deck cards`);
