import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MobileDuel,L,M,I,R} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
import {chainWindowAllowed,liveCardFacts} from './web/duel-presentation.js';
import {cardTypeLabel} from './web/card-inspection.js';
import {effectiveAttributes,deckStats} from './web/feedback-ui.js';
import {formatPackChance} from './web/pack-inspection.js';

const read=n=>JSON.parse(fs.readFileSync(new URL(`./web/${n}.json`,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data');
const mobileSource=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8'),mobileCss=fs.readFileSync(new URL('./web/mobile.css',import.meta.url),'utf8');
const id=n=>{const c=meta.cards.find(x=>x.name===n);assert(c,n);return c.id;};
const make=()=>{
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1,turn:4,phase:4,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
 const zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
 const card=(n,side=1,loc=L.MZONE,pos=1,sequence=0,attack=null,defense=null,extra={})=>({code:id(n),controller:side,location:loc,sequence,position:pos,attack:attack??data[id(n)].attack,defense:defense??data[id(n)].defense,...extra});
 const put=(side,loc,...cards)=>zones[`${side}:${loc}`]=cards;
 return {e,card,put};
};

// All independent protection layers are considered together, and the AI does
// not treat an immune lowest-ATK monster as a valid Fissure target.
{
 const {e,card,put}=make(),fissure=card('Fissure',1,L.HAND,0),shielded=card('Sangan',0,L.MZONE,1,0,1000,600),beater=card('Blue-Eyes White Dragon',0,L.MZONE,1,1),pole=card('Pole Position',0,L.SZONE,1,4);
 e.cards.get(shielded.code).desc+=' Unaffected by Spell effects. Cannot be targeted by card effects. Cannot be destroyed by card effects.';
 put(1,L.HAND,fissure);put(0,L.MZONE,shielded,beater);put(0,L.SZONE,pole);e.effect={code:fissure.code,player:1};
 const policy=smartContext(e,1,L,{});
 assert(policy.targetScore('Fissure',shielded,{})<0,'combined immunity, targeting, destruction, and field protection block removal');
 assert.equal(policy.activation(fissure),-1,'do not spend Fissure when its required lowest-ATK target is protected');
}

// Future stats include both Sword and Shield and applicable defense relics.
{
 const {e,card,put}=make(),battleOx=card('Battle Ox',1,L.HAND,0);
 put(1,L.HAND,battleOx);e.aiModifiers.activeRelics[1]=['sword_and_shield'];
 e.aiModifiers.statRelics[1]=[{effect:'def',filter:'Warrior',amount:300}];
 const policy=smartContext(e,1,L,{to_bp:false});
 assert.equal(policy.projectedAttack(battleOx),1000,'projected ATK uses Sword and Shield before summoning');
 assert.equal(policy.projectedDefense(battleOx),2000,'projected DEF includes the swapped ATK and future relic bonus');
 assert.equal(policy.preferSet(battleOx),true,'choose a set when the projected swapped stats favor defense');
}

// Riryoku pairs the strongest friendly monster with the strongest opponent,
// then halves the opponent. With two friendly targets, it instead halves the
// weaker body so the stronger one gets the increase.
{
 const {e,card,put}=make(),source=card('Riryoku',1,L.HAND,0),small=card('Battle Ox',1,L.MZONE,1,0,1700,1000),large=card('Blue-Eyes White Dragon',1,L.MZONE,1,1,3000,2500),foe=card('Dark Magician',0,L.MZONE,1,0,3200,2100);
 put(1,L.HAND,source);put(1,L.MZONE,small,large);put(0,L.MZONE,foe);e.effect={code:source.code,player:1};
 let policy=smartContext(e,1,L,{});
 assert(policy.activation(source)>0,'activate Riryoku when it can strengthen our attacker and weaken theirs');
 const first={min:2,cands:[small,large,foe]};
 assert(policy.targetScore('Riryoku',large,first)>policy.targetScore('Riryoku',foe,first),'choose the strongest friendly recipient first');
 assert(policy.targetScore('Riryoku',foe,first)>policy.targetScore('Riryoku',small,first),'pair it with the opponent target');
 const second={min:1,cands:[large,foe]};
 assert(policy.targetScore('Riryoku',foe,second)>policy.targetScore('Riryoku',large,second),'halve the opponent on the follow-up prompt');
 put(0,L.MZONE);e.phase=256;policy=smartContext(e,1,L,{});
 assert.equal(policy.activation(source),-1,'do not spend Riryoku on friendly bodies without a useful combat line');
 e.phase=4;assert.equal(policy.activation(source),-1,'do not spend Riryoku on an open board where ATK is only redistributed');
 const ownOnly={min:1,cands:[small,large]};
 assert(policy.targetScore('Riryoku',large,{min:2,cands:[small,large]})>policy.targetScore('Riryoku',small,{min:2,cands:[small,large]}),'choose the strongest friendly recipient');
 assert(policy.targetScore('Riryoku',small,ownOnly)>policy.targetScore('Riryoku',large,ownOnly),'halve the weaker friendly monster');
}

// Account for Flash Assailant's hand-dependent ATK/DEF and attack restriction,
// and avoid Drillago's direct attack when its specific board condition fails.
{
 const {e,card,put}=make(),flash=card('Flash Assailant',1,L.HAND,0,0),other=['Sangan','Battle Ox','Axe Raider','Muka Muka','Dark Magician'].map((n,i)=>card(n,1,L.HAND,0,i+1));
 put(1,L.HAND,flash,...other.slice(0,3));
 let policy=smartContext(e,1,L,{});
 assert.equal(policy.projectedAttack(flash),800,'subtract 400 ATK for each card remaining after summoning Flash Assailant');
 assert.equal(policy.projectedDefense(flash),800,'forecast Flash Assailant DEF after the summon reduces hand size');
 put(1,L.HAND,flash,...other);
 policy=smartContext(e,1,L,{});
 assert.equal(policy.projectedAttack(flash),0,'clamp Flash Assailant ATK at zero with five cards remaining in hand');
 assert.equal(policy.attackAllowed(flash,true),false,'do not plan an attack with Flash Assailant at five or more cards in hand');

 const drillago=card('Drillago',1,L.MZONE,1,0,1600,1100),weak=card('Petit Dragon',0,L.MZONE,1,0,600,300);
 put(1,L.MZONE,drillago);put(0,L.MZONE,weak);
 policy=smartContext(e,1,L,{});
 assert.equal(policy.attackAllowed(drillago,true),false,'a low-ATK opposing monster blocks Drillago direct attack');
 put(0,L.MZONE,card('Blue-Eyes White Dragon',0,L.MZONE,1,0,3000,2500));
 assert.equal(smartContext(e,1,L,{}).attackAllowed(drillago,true),true,'face-up 1600+ monsters satisfy Drillago when opposing back row is empty');
 put(0,L.SZONE,card('Waboku',0,L.SZONE,1,0));
 assert.equal(smartContext(e,1,L,{}).attackAllowed(drillago,true),false,'opposing back row blocks Drillago direct attack');
}

// Frontline Base's Union summon must be treated as a useful play, while
// control effects must not target active Spirit Reaper.
{
 const {e,card,put}=make(),base=card('Frontline Base',1,L.HAND,0),union=card('Z-Metal Tank',1,L.HAND,0,1),normal=card('X-Head Cannon',1,L.HAND,0,2);
 put(1,L.HAND,base,union,normal);
 let policy=smartContext(e,1,L,{});
 assert(policy.activation(base)>0,'activate Frontline Base when a legal Union monster can be summoned');
 assert(policy.targetScore('Frontline Base',union,{cands:[union,normal]})>policy.targetScore('Frontline Base',normal,{cands:[union,normal]}),'select a legal Union monster rather than a non-Union monster');
 const idle=e.auto({type:M.SELECT_IDLECMD,player:1,to_bp:true,activates:[base],special_summons:[],summons:[],monster_sets:[],spell_sets:[],pos_changes:[],attacks:[]});
 assert.equal(idle.action,I.SELECT_ACTIVATE,'choose Frontline Base instead of skipping to the Battle Phase');
 const change=card('Change of Heart',1,L.HAND,0,3),reaper=card('Spirit Reaper',0,L.MZONE,1,0,300,200);
 put(1,L.HAND,base,union,normal,change);put(0,L.MZONE,reaper);
 policy=smartContext(e,1,L,{});
 assert.equal(policy.activation(change),-1,'do not waste a control-change effect on Spirit Reaper, which destroys itself when targeted');
 assert(policy.targetScore('Change of Heart',reaper,{cands:[reaper]})<0,'never rank active Spirit Reaper as a useful control-change target');
}

// Traps are not activated when Jinzo or Royal Decree guarantees negation;
// Fairy Box evaluates its real zero-ATK coin result, and Spell Shield stays live.
{
 const {e,card,put}=make(),mirror=card('Mirror Force',1,L.SZONE,1,0),jinzo=card('Jinzo',1,L.MZONE,1,0),attacker=card('Blue-Eyes White Dragon',0,L.MZONE,1,0,3000,2500);
 put(1,L.SZONE,mirror);put(1,L.MZONE,jinzo);put(0,L.MZONE,attacker);e.player=0;e.attackCard=attacker;e.effect={code:attacker.code,player:0};
 assert.equal(smartContext(e,1,L,{chains:[mirror]}).activation(mirror,true),-1,'do not activate Mirror Force while Jinzo negates traps');

 const {e:e2,card:c2,put:p2}=make(),box=c2('Fairy Box',1,L.SZONE,1,0),foe=c2('Blue-Eyes White Dragon',0,L.MZONE,1,0,3000,2500),guard=c2('Battle Ox',1,L.MZONE,1,0,1700,1000);
 p2(0,L.MZONE,foe);p2(1,L.MZONE,guard);p2(1,L.SZONE,box);e2.player=0;e2.attackCard=foe;e2.attackTarget=guard;e2.effect={code:foe.code,player:0};e2.activeChain=[{code:foe.code,player:0,targets:[guard],inactive:false}];
 assert(smartContext(e2,1,L,{chains:[box]}).activation(box,true)>0,'use Fairy Box when heads would save the defending monster');
 e2.lp[1]=500;assert.equal(smartContext(e2,1,L,{chains:[box]}).activation(box,true),-1,'respect Fairy Box 500 LP maintenance-cost threshold');

 const {e:e3,card:c3,put:p3}=make(),shield=c3('Spell Shield Type-8',1,L.SZONE,1,0),spell=c3('Fissure',0,L.HAND,0,0),target=c3('Blue-Eyes White Dragon',1,L.MZONE,1,0);
 p3(1,L.SZONE,shield);p3(1,L.MZONE,target);e3.activeChain=[{code:spell.code,player:0,targets:[target],inactive:false}];e3.effect={code:spell.code,player:0};
 assert(smartContext(e3,1,L,{chains:[shield]}).activation(shield,true)>0,'counter a spell targeting a friendly monster without discarding a Spell');
}

// Kunai with Chain should select the combined defense/equip mode against an
// opponent's attack, but use only its equip mode during our own attack.
{
 const {e,card,put}=make(),kunai=card('Kunai with Chain',1,L.SZONE,1,0),guard=card('Battle Ox',1,L.MZONE,1,0),foe=card('Blue-Eyes White Dragon',0,L.MZONE,1,0);
 put(1,L.SZONE,kunai);put(1,L.MZONE,guard);put(0,L.MZONE,foe);
 e.attackCard=foe;e.effect={code:kunai.code,player:1};
 let policy=smartContext(e,1,L,{chains:[kunai]});
 assert.equal(policy.resourceOption([1,2,3]),2,'choose Kunai’s defense-plus-equip mode during an opponent attack');
 e.attackCard=guard;e.effect={code:kunai.code,player:1};
 policy=smartContext(e,1,L,{chains:[kunai]});
 assert.equal(policy.resourceOption([1,2,3]),1,'choose Kunai’s ATK-boosting equip mode during our attack');
}

// Source hooks preserve the single Dragon's Gunfire activation and correct
// Pandemonium event groups in the browser's generated script bundle.
{
 const scripts=read('scripts'),gunfire=fs.readFileSync(new URL('../runtime/script/official/c55991637.lua',import.meta.url),'utf8'),pandemonium=fs.readFileSync(new URL('../runtime/script/official/c94585852.lua',import.meta.url),'utf8');
 assert.equal((gunfire.match(/SetType\(EFFECT_TYPE_ACTIVATE\)/g)||[]).length,1,'Dragon’s Gunfire exposes exactly one activation effect');
 assert(gunfire.includes('Duel.SelectEffect'),'Dragon’s Gunfire follows activation with an effect selection');
 assert.equal(scripts['c55991637.lua'],gunfire,'Dragon’s Gunfire source is synchronized into scripts.json');
 assert(pandemonium.includes('Duel.RaiseEvent(g2,EVENT_CUSTOM+id,re,r,rp,1,lv2)'),'Pandemonium raises the event group belonging to the previous controller');
 assert.equal(scripts['c94585852.lua'],pandemonium,'Pandemonium source is synchronized into scripts.json');
}

// A useful Cyber Jar flips before other summons, while low-ATK opening plays
// remain allowed when the projected attack ends the duel immediately.
{
 const {e,card,put}=make(),jar=card('Cyber Jar',1,L.MZONE,8,0),enemy=card('Blue-Eyes White Dragon',0,L.MZONE,1,0),summon=card('Battle Ox',1,L.HAND,0);
 put(1,L.MZONE,jar);put(0,L.MZONE,enemy);put(1,L.HAND,summon);put(1,L.DECK,...Array.from({length:20},()=>card('Sangan',1,L.DECK,0)));
 const result=e.auto({type:M.SELECT_IDLECMD,player:1,to_bp:true,activates:[],special_summons:[],pos_changes:[jar],summons:[summon],monster_sets:[],spell_sets:[],attacks:[]});
 assert.equal(result.action,I.SELECT_POS_CHANGE,'flip useful Cyber Jar before committing another summon');
}
{
 const {e,card,put}=make(),small=card('Petit Dragon',1,L.HAND,0,0,600,300);
 put(1,L.HAND,small);e.lp[0]=500;
 const result=e.auto({type:M.SELECT_IDLECMD,player:1,to_bp:true,activates:[],special_summons:[],pos_changes:[],summons:[small],monster_sets:[],spell_sets:[],attacks:[]});
 assert.equal(result.action,I.SELECT_SUMMON,'allow a lower-ATK first summon when its forecast makes the direct attack lethal');
}

// Rare subtypes and non-zero tiny pack odds remain readable.
{
 const shallow=meta.cards.find(x=>x.name==='The Shallow Grave'),shield=meta.cards.find(x=>x.name==='Spell Shield Type-8');
 assert.equal(cardTypeLabel(shallow),'Normal Spell');
 assert.equal(cardTypeLabel(shield),'Counter Trap');
 assert.equal(formatPackChance(0.001),'<1%');
 assert.equal(formatPackChance(0),'0%');
 assert.equal(formatPackChance(0.014),'1%');
}

// The deck card-details view must not match the global dialog `:has(.inspect)`
// sizing rules, which made its reward modal collapse while inspecting cards.
{
 assert(mobileSource.includes('class="deck-inspect"><img src="${image(c.id)}">'),'reward deck details use an isolated layout class');
 assert(mobileCss.includes('.deck-preview-overlay>.deck-inspect{display:grid;'),'reward deck details have explicit bounded layout styles');
}

// Surgery relics: the first replaces the printed attribute, each further relic adds one.
{
 const monster={attribute:'WATER',data:{type:1}};
 const run={challenge_level:2,artifacts:['attribute_light','attribute_dark'],card_mods:{}};
 assert.deepEqual(effectiveAttributes(monster,run,0),['LIGHT','DARK']);
 const info={test:{effect:'atk',amount:200,filter:'DARK'}};
 assert.equal(deckStats({...monster,atk:1000,defense:800}, {...run,artifacts:[...run.artifacts,'test']},0,info)[0],1200,'attribute-filtered relics see all added attributes');
 const base={...monster,race:'Aqua',atk:1000,defense:800,data:{...monster.data,race:8,attribute:2}};
 assert.equal(liveCardFacts(base,{attribute:34,race:8},[{race:'Aqua',data:{race:8}}]).attribute,'WATER / DARK');
}

// Chain Sometimes exceptions apply only when the engine has supplied that
// card as a legal response.
{
 const exceptions=['Pinch Hopper','Hannibal Necromancer','Dark Scorpion - Cliff','Hydrogeddon','Kunai with Chain','Fairy Box','Spell Shield Type-8','Michizure'];
 for(const name of exceptions){
  const prompt={type:M.SELECT_CHAIN,player:0,selects:[{code:1}]};
  assert.equal(chainWindowAllowed(prompt,'sometimes',[],{card:()=>({name,data:{type:4},desc:''})}),true,`${name} gets its legal Sometimes prompt`);
  assert.equal(chainWindowAllowed(prompt,'never',[],{card:()=>({name,data:{type:4},desc:''})}),false,`${name} still obeys Never`);
 }
 assert.equal(chainWindowAllowed({type:M.SELECT_CHAIN,player:0,selects:[{code:1}]},'sometimes',[],{card:()=>({name:'Trap Hole',data:{type:4},desc:''})}),false,'ordinary traps do not become Always prompts');
}

console.log('PASS review-fix regressions: layered protections, projected stats, Cyber Jar sequencing, lethal summons, Kunai modes, deck-preview sizing, card labels, odds, stacked attributes, and Chain Sometimes exceptions');
