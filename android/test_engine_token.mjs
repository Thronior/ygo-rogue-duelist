// Player report (2026-11-02): "where's my token", with Fiendish Engine Ω out for 7 End Phases (replay f457d5d5adfb). Packaging
// keeps only the cards it finds a number for, and the script names its token with the constant TOKEN_ENGINE, so the token's
// engine data was dropped from v0.2.18: the mandatory trigger still fired, then Duel.CreateToken raised a Lua error on the
// unknown card and nothing was summoned. The development server loads the complete data, so this only shows on packaged data,
// which every duel here uses.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M,R,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';import {automaticChainResponse} from './web/duel-presentation.js';
const root=fileURLToPath(new URL('../',import.meta.url)),python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const pruned=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'tools')
from package_assets import pruned_engine_files
scripts,data,keep=pruned_engine_files('android/web')
print(json.dumps({'scripts':scripts,'data':data}))`],{cwd:root,maxBuffer:256*1024*1024}).toString());
const meta=read('content'),cards=[...meta.cards,...meta.tokenCards],id=n=>meta.cards.find(c=>c.name===n).id;
const ENGINE=id('Fiendish Engine Ω'),TOKEN=82556059,FILLER=id('Blue-Eyes White Dragon');
const coinToss=fs.readFileSync(new URL('../passives.py',import.meta.url),'utf8').match(/'(-- Coin toss: opponent starts.*?)'\)/)[1].replaceAll('\\n','\n');
let engine=await new MobileDuel(cards).init([pruned.data,pruned.scripts]);
const put=(code,location,position)=>`Duel.MoveToField(Duel.CreateToken(0,${code}),0,0,${location},${position},true)`;
const monster=code=>put(code,'LOCATION_MZONE','POS_FACEUP_ATTACK');
const setup=(cards,first='')=>`${first}\nlocal e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${cards.join(' ')} end) Duel.RegisterEffect(e,0)`;
const onField=code=>engine.query(0,L.MZONE).filter(c=>c?.code===code);
// Plays like the client: it answers what automaticChainResponse answers, and `pick` chooses in a window it leaves to the player.
function play(label,{cards=[monster(ENGINE)],first,turns,idle=null,pick=null,errors=[]}){
 engine.start(Array(40).fill(FILLER),Array(40).fill(FILLER),8000,8000,2,123,[],[],setup(cards,first),2);
 const tokens={},seen={forced:0,widest:0};let used=false;
 for(let n=0;n<600&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  tokens[engine.turn]??=onField(TOKEN).length;
  const m=engine.pending,choices=engine.choices(m);let response;
  if(m.type===M.SELECT_CHAIN&&m.selects.some(c=>c.code===ENGINE)){
   assert.equal(m.forced,true,`${label}: the trigger is mandatory`);seen.forced++;seen.widest=Math.max(seen.widest,m.selects.length);
   response=automaticChainResponse(m,true,M,R)||(pick&&choices.find(c=>pick.test(c.label))?.response);
   assert.ok(response,`${label}: nothing answers the trigger`);assert.ok(Number.isInteger(response.index),`${label}: the trigger is never passed`);
  }
  else if(m.type===M.SELECT_IDLECMD&&idle&&!used&&(used=true))response=choices.find(c=>idle.test(c.label)).response;
  else if(m.type===M.SELECT_IDLECMD)response=(choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/.test(c.label))).response;
  else if(m.type===M.SELECT_BATTLECMD)response=choices.find(c=>/End turn/.test(c.label)).response;
  else response=DuelEngine.prototype.auto.call(engine,m);
  engine.respond(response);
 }
 const raised=engine.errors.filter(x=>x.trim());if(!errors.length)assert.deepEqual(raised,[],label);
 for(const text of errors)assert.ok(raised.some(x=>x.includes(text)),`${label}: ${text}`);
 const result={tokens,seen,engines:onField(ENGINE).length,monsters:engine.query(0,L.MZONE).filter(Boolean),token:onField(TOKEN)[0]};
 engine.destroy();return result;
}
try{
 // tokens[turn] is the count at that turn's first prompt, so a token from turn 1's End Phase shows on turn 2.
 const each=play('your End Phases',{turns:5});
 assert.deepEqual([2,3,4,5].map(t=>each.tokens[t]),[1,1,2,2],'one token at each of your End Phases and none at the opponent\'s');
 assert.ok(each.seen.forced>=2,'the mandatory trigger came up at each of your End Phases');
 const {position,attack,defense}=each.token;assert.deepEqual({position,attack,defense},{position:1,attack:200,defense:200},'face-up Attack Position, 200/200');
 const tails=play('the opponent starts',{first:coinToss,turns:5});
 assert.deepEqual([2,3,4,5].map(t=>tails.tokens[t]),[0,0,1,1],'turn 1 is skipped when the opponent starts, later End Phases are not');
 const set=play('a set Trap beside the trigger',{cards:[monster(ENGINE),put(id('Waboku'),'LOCATION_SZONE','POS_FACEDOWN')],turns:5});
 assert.equal(set.seen.widest,2,'the forced window also listed the set Trap');assert.deepEqual([4,5].map(t=>set.tokens[t]),[2,2],'the mandatory trigger is picked over the optional Trap');
 // The two End Phase triggers resolve one at a time in the order the player picks, so destroying the Engine first loses its token.
 for(const [pick,token] of [[/Special Summon/,1],[/Destroy/,0]]){const used=play(`Gain ATK used, ${pick.source} first`,{turns:2,idle:/Gain ATK/,pick});assert.deepEqual([used.engines,used.tokens[2]],[0,token],`${pick.source} first`)}
 const full=play('no free zone',{cards:[ENGINE,FILLER,FILLER,FILLER,FILLER].map(monster),turns:3});
 assert.deepEqual([full.tokens[2],full.monsters.length],[0,5],'a full board summons nothing and the duel carries on');
 // Packaging: a card a kept script names through a constant stays in the packaged data, and the client has a name and art for every token.
 const named=Object.fromEntries([...pruned.scripts['card_counter_constants.lua'].matchAll(/^\s*((?:CARD|TOKEN)_\w+)\s*=\s*(\d+)/gm)].map(m=>[m[1],m[2]])),all=read('engine-data');
 const dropped=Object.entries(pruned.scripts).filter(([name])=>/^c\d+\.lua$/.test(name)).flatMap(([name,text])=>[...new Set(text.match(/\b(?:CARD|TOKEN)_\w+/g))].filter(n=>all[named[n]]&&!pruned.data[named[n]]).map(n=>`${name} ${n}`));
 assert.deepEqual(dropped,[],'nothing a kept script names is packaged away');
 const catalogued=JSON.parse(fs.readFileSync(new URL('../data/tokens.json',import.meta.url),'utf8').replace(/^\ufeff/,'')),summoners=new Set(catalogued.map(t=>t.summoner));
 assert.deepEqual(meta.cards.filter(c=>pruned.scripts[`c${c.id}.lua`]?.includes('Duel.CreateToken')&&!summoners.has(c.id)).map(c=>c.name),[],'every card that creates a token is catalogued');
 assert.equal(engine.name(TOKEN),'Engine Token');
 assert.deepEqual(meta.tokenCards.filter(c=>!fs.existsSync(new URL(`./web/assets/cards/${c.id}.jpg`,import.meta.url))).map(c=>c.name),[],'every catalogued token has art');
 // The report: without the token's engine data the trigger still fires, CreateToken errors, and no token ever arrives.
 engine.destroy();const {[TOKEN]:_,...shipped}=pruned.data;engine=await new MobileDuel(cards).init([shipped,pruned.scripts]);
 const reported=play('v0.2.18 packaged data',{turns:5,errors:['c82556059.initial_effect']});
 assert.ok(reported.seen.forced>=2,'the trigger fired');assert.deepEqual([2,3,4,5].map(t=>reported.tokens[t]),[0,0,0,0],'and nothing was summoned');
}finally{engine.destroy()}
console.log('PASS Engine Token on packaged data: one per End Phase of yours, mandatory and never passed by the client, with or without a coin-toss skip, a set Trap, Gain ATK or a full board; constants keep their cards through packaging; every token has a name and art');
