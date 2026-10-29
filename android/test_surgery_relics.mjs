// Surgery relics: the first replaces the attribute of your monsters in the hand, Deck, GY and on the
// field; each further Surgery relic adds its attribute. The core, the CPU and the deck view must agree.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
import {effectiveAttributes} from './web/feedback-ui.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^\uFEFF/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const VORSE=14898066,KURIBOH=40640057,ATTR={EARTH:1,WATER:2,FIRE:4,WIND:8,LIGHT:16,DARK:32};
const mask=(...names)=>names.reduce((sum,n)=>sum|ATTR[n],0);

// The relic scripts exactly as the game builds them (they also carry the CPU's view of your relics).
const runs={
 none:{artifacts:[]},
 light:{artifacts:['attribute_light']},
 lightFire:{artifacts:['attribute_light','attribute_fire']},
 three:{artifacts:['attribute_fire','attribute_light','attribute_water']},
 mirror:{artifacts:['magic_mirror','attribute_light'],mirror_copy:'attribute_water'},
 misprint:{artifacts:[],duel_modifications:[{location:'DECK',sequence:20,atk:1900,defense:1200,race:0,attribute:4}]},
 misprintLight:{artifacts:['attribute_light'],duel_modifications:[{location:'DECK',sequence:20,atk:1900,defense:1200,race:0,attribute:4}]},
 lightDarkOrb:{artifacts:['attribute_light','dark']},
 lightLightOrb:{artifacts:['attribute_light','light']},
 darkOrb:{artifacts:['dark']},
};
const scripts=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives
runs=json.loads(sys.stdin.read())
print(json.dumps({k:passives.script({'curses':[],**v}) for k,v in runs.items()}))`],{cwd:root,input:JSON.stringify(runs)}).toString());
// Put one card from each Deck into the GY at the start, so the GY can be checked too.
const mill='\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP) e:SetOperation(function(e) e:Reset() Duel.SendtoGrave(Duel.GetDecktopGroup(0,1),REASON_RULE) Duel.SendtoGrave(Duel.GetDecktopGroup(1,1),REASON_RULE) end) Duel.RegisterEffect(e,0) end';

const duel=await new MobileDuel(json('data/cards.json')).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const deck=Array(40).fill(VORSE);
// Start a duel and play player 0's first Main Phase: Normal Summon (or Set) one Vorse Raider.
function play(key,action=I.SELECT_SUMMON,enemyDeck=deck){
 let state=duel.start(deck,enemyDeck,8000,8000,5,3,[],[],scripts[key]+mill),placed=false;
 for(let guard=0;guard<50&&!state.finished;guard++){
  const m=duel.pending;
  if(placed&&m.type===M.SELECT_IDLECMD&&m.player===0)return;
  let response=duel.auto();
  if(m.type===M.SELECT_IDLECMD&&m.player===0){const list=action===I.SELECT_SUMMON?m.summons:m.monster_sets;response={type:R.SELECT_IDLECMD,action,index:0};placed=list.length>0;assert.ok(placed,'a Vorse Raider can be placed')}
  state=duel.respond(response);
 }
 throw Error('did not reach the Main Phase after placing a monster');
}
const attributes=(p,location)=>duel.query(p,location).filter(Boolean).map(c=>c.attribute);
function expectEverywhere(key,expected,{action=I.SELECT_SUMMON,label=key}={}){
 play(key,action);
 for(const [name,location] of [['hand',L.HAND],['Deck',L.DECK],['GY',L.GRAVE],['field',L.MZONE]]){
  const own=attributes(0,location),theirs=attributes(1,location);
  if(location!==L.MZONE)assert.ok(own.length&&theirs.length,`${label}: both players have cards in the ${name}`);
  assert.ok(own.every(a=>a===expected),`${label}: your ${name} monsters are ${expected} (got ${[...new Set(own)]})`);
  assert.ok(theirs.every(a=>a===ATTR.DARK),`${label}: the opponent's ${name} monsters keep DARK`);
 }
 assert.equal(attributes(0,L.MZONE).length,1,`${label}: one monster on the field`);
 duel.destroy();
}

expectEverywhere('none',mask('DARK'));
expectEverywhere('light',mask('LIGHT'));
// A face-down monster keeps its printed attribute (core rule) and changes as soon as it is face-up.
// The opponent plays weak Kuriboh (also DARK) so the set monster survives until it can be flipped.
{
 play('light',I.SELECT_MONSTER_SET,Array(40).fill(KURIBOH));
 assert.deepEqual(attributes(0,L.MZONE),[ATTR.DARK],'face-down Vorse Raider is still DARK');
 assert.ok(attributes(0,L.HAND).every(a=>a===ATTR.LIGHT),'hand is LIGHT while the set monster is face-down');
 let state=null,flipped=false;
 for(let guard=0;guard<400&&!flipped;guard++){
  const m=duel.pending;if(!m)break;let response=duel.auto();
  if(m.type===M.SELECT_IDLECMD&&m.player===0&&duel.turn>=3&&m.pos_changes.length){response={type:R.SELECT_IDLECMD,action:I.SELECT_POS_CHANGE,index:0};flipped=true}
  state=duel.respond(response);
 }
 assert.ok(flipped,'the set monster was Flip Summoned');
 const flippedCard=duel.query(0,L.MZONE).find(c=>c&&(c.position&5));
 assert.equal(flippedCard?.attribute,ATTR.LIGHT,'after flipping face-up it is LIGHT');
 duel.destroy();
}
expectEverywhere('lightFire',mask('LIGHT','FIRE'));
expectEverywhere('three',mask('FIRE','LIGHT','WATER'));
expectEverywhere('mirror',mask('LIGHT','WATER'),{label:'Magic Mirror copying Water Surgery'});

// A misprinted card's attribute is replaced too.
for(const [key,fire] of [['misprint',1],['misprintLight',0]]){
 play(key);
 const own=[L.HAND,L.DECK,L.GRAVE,L.MZONE].flatMap(location=>attributes(0,location));
 assert.equal(own.filter(a=>a===ATTR.FIRE).length,fire,`${key}: misprinted FIRE copies`);
 if(!fire)assert.ok(own.every(a=>a===ATTR.LIGHT),`${key}: Light Surgery replaces the misprinted attribute`);
 duel.destroy();
}

// Attribute-based relics follow the new attribute on the field.
for(const [key,bonus] of [['lightDarkOrb',0],['lightLightOrb',200],['darkOrb',200]]){
 play(key);
 assert.equal(duel.query(0,L.MZONE).find(Boolean).attack,1900+bonus,`${key}: core ATK with the Orb relic`);
 duel.destroy();
}

// The CPU forecasts a monster in hand with the attribute the core gives it. Hoshiningen on the field
// gives LIGHT monsters +500 ATK and DARK monsters -400, so the forecast shows which attribute it used.
for(const key of ['none','light','lightFire','three']){
 const hoshiningen=67629977,mixed=[...Array(38).fill(VORSE),VORSE,hoshiningen];
 let state=duel.start(mixed,deck,8000,8000,5,3,[],[],scripts[key]);
 for(let guard=0;guard<20;guard++){
  const m=duel.pending;
  if(m.type===M.SELECT_IDLECMD&&m.player===0&&duel.query(0,L.MZONE).some(Boolean))break;
  let response=duel.auto();
  if(m.type===M.SELECT_IDLECMD&&m.player===0){const index=m.summons.findIndex(c=>c.code===hoshiningen);assert.ok(index>=0,'Hoshiningen can be summoned');response={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index}}
  state=duel.respond(response);
 }
 const hand=duel.query(0,L.HAND).find(c=>c&&c.code===VORSE),core=hand.attribute;
 const expected=1900+(core&ATTR.LIGHT?500:0)+(core&ATTR.DARK?-400:0);
 assert.equal(smartContext(duel,0,L).projectedAttack(hand),expected,`${key}: CPU forecast matches the core attribute ${core}`);
 duel.destroy();
}

// The deck editor and card details show the same attributes.
const water={attribute:'WATER',data:{type:1}};
assert.deepEqual(effectiveAttributes(water,{artifacts:[]},0),['WATER']);
assert.deepEqual(effectiveAttributes(water,{artifacts:['attribute_light']},0),['LIGHT']);
assert.deepEqual(effectiveAttributes(water,{artifacts:['attribute_light','attribute_dark']},0),['LIGHT','DARK']);
assert.deepEqual(effectiveAttributes(water,{artifacts:['magic_mirror','attribute_light'],mirror_copy:'attribute_water'},0),['WATER','LIGHT']);
assert.deepEqual(effectiveAttributes({attribute:'LIGHT',data:{type:2}},{artifacts:['attribute_dark']},0),[],'spells have no attribute');

console.log('PASS Surgery relics: first replaces, each further one adds; hand, Deck, GY and field; core, CPU and deck view agree');
