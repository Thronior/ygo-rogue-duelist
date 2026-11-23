// Toon Kingdom (fused relic, user's pick 2026-11-23: Toon World + Toon Premiere): Toon World starts face-up from the
// Deck, cannot be destroyed by card effects, Toon monsters gain 500 ATK and can attack the turn they are Summoned.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,L,R,I}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relic=a=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))",JSON.stringify({curses:[],artifacts:a,challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const TW=id('Toon World'),ELF=id('Toon Gemini Elf'),W=id('Waboku'),MST=id('Mystical Space Typhoon');let checks=0;
async function turnThree(artifacts){
 // Turn 3: a Toon Gemini Elf reaches the hand; it is Normal Summoned and the Battle Phase starts.
 const setup=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetCondition(function() return Duel.GetTurnCount()==3 end) e:SetOperation(function(e) e:Reset() Duel.SendtoHand(Duel.CreateToken(0,${ELF}),0,REASON_RULE) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start([TW,...Array(39).fill(W)],Array(40).fill(W),8000,8000,5,13,[],[],relic(artifacts)+'\n'+setup),summoned=false,attack=null,atk=null,world=null;
 for(let i=0;i<600&&!s.finished&&e.turn<=3;i++){const m=e.pending;if(!m)break;
  if(e.turn===3&&m.player===0&&m.type===M.SELECT_IDLECMD){
   if(!summoned){const at=m.summons.findIndex(c=>c.code===ELF);if(at>=0){summoned=true;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:at});continue}}
   else if(m.to_bp){s=e.respond({type:R.SELECT_IDLECMD,action:I.TO_BP??6,index:null});continue}}
  if(e.turn===3&&m.player===0&&m.type===M.SELECT_BATTLECMD&&attack===null){
   const elf=e.query(0,L.MZONE).find(c=>c&&c.code===ELF);atk=elf?.attack;attack=m.attacks.some(c=>c.sequence===elf?.sequence);
   world=e.query(0,L.SZONE).some(c=>c&&c.code===TW&&(c.position&5));break}
  s=e.respond(e.auto())}
 e.destroy();return {summoned,attack,atk,world};
}
const kingdom=await turnThree(['toon_kingdom']);
assert(kingdom.summoned&&kingdom.world,`set-up: ${JSON.stringify(kingdom)}`);
assert.equal(kingdom.attack,true,'a Toon can attack the turn it is Summoned');assert.equal(kingdom.atk,2400,'Toon monsters gain 500 ATK');checks+=2;
const premiere=await turnThree(['toon_premiere']);
assert.equal(premiere.attack,false,`without Toon Kingdom it still cannot: ${JSON.stringify(premiere)}`);assert.equal(premiere.atk,1900);checks+=2;
// Toon World cannot be destroyed by card effects.
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
const kill=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetOperation(function(e) e:Reset() Duel.Destroy(Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,0,nil,${TW}),REASON_EFFECT) end) Duel.RegisterEffect(e,0) end`;
let s=e.start([TW,...Array(39).fill(W)],Array(40).fill(W),8000,8000,5,17,[],[],relic(['toon_kingdom'])+'\n'+kill);
for(let i=0;i<50&&!s.finished;i++){const m=e.pending;if(!m||m.player===0&&m.type===M.SELECT_IDLECMD)break;s=e.respond(e.auto())}
assert(e.query(0,L.SZONE).some(c=>c&&c.code===TW&&(c.position&5)),'Toon World survives a destroying effect');checks++;e.destroy();
console.log(`PASS Toon Kingdom: Toon World from the Deck, protected, Toons +500 ATK and attack the turn they are Summoned (${checks} checks)`);
