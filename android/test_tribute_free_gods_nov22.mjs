// Tribute Free with the 3-Tribute Gods (Discord 2026-11-22: "still require three tributes instead of two"). The relic
// takes 1 Tribute off every Level 7 or higher monster: the Gods' own 3-Tribute procedure gets a 2-Tribute twin, normal
// Level 7+ monsters still need only 1, and without the relic a God still needs 3. Titan's Covenant does the same.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relic=a=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))",JSON.stringify({curses:[],artifacts:a,challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const W=id('Waboku'),OX=id('Battle Ox');let checks=0;
// Puts `monsters` Battle Ox on your field and `card` in your hand, then tries to Normal Summon it.
async function trySummon(card,monsters,artifacts){
 const G=id(card);
 const setup=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() for i=1,${monsters} do Duel.MoveToField(Duel.CreateToken(0,${OX}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end Duel.SendtoHand(Duel.CreateToken(0,${G}),0,REASON_RULE) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(Array(40).fill(W),Array(40).fill(W),8000,8000,5,7,[],[],(artifacts.length?relic(artifacts)+'\n':'')+setup),offered=null,tributes=null;
 for(let i=0;i<200&&!s.finished&&e.turn<=1;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){if(offered!==null)break;const at=m.summons.findIndex(c=>c.code===G);offered=at>=0;if(!offered)break;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:at});continue}
  if(m.player===0&&m.type===M.SELECT_OPTION){s=e.respond({type:R.SELECT_OPTION,index:m.options.length-1});continue}
  if(m.player===0&&m.type===M.SELECT_TRIBUTE){tributes=m.min;s=e.respond({type:R.SELECT_TRIBUTE,indicies:m.selects.map((_,k)=>k).slice(0,m.min)});continue}
  s=e.respond(e.auto())}
 const out={offered,tributes,summoned:e.query(0,L.MZONE).some(c=>c&&c.code===G),left:e.query(0,L.MZONE).filter(c=>c&&c.code===OX).length};e.destroy();return out;
}
for(const relicKey of ['tribute_free','titans_covenant'])for(const god of ['Obelisk the Tormentor','Slifer the Sky Dragon','The Winged Dragon of Ra','The Wicked Eraser','The Wicked Dreadroot']){
 const r=await trySummon(god,2,[relicKey]);assert(r.offered&&r.summoned&&r.left===0,`${relicKey}: ${god} with 2 monsters: ${JSON.stringify(r)}`);checks++}
const one=await trySummon('Obelisk the Tormentor',1,['tribute_free']);assert(!one.offered,`a God still needs 2 with the relic: ${JSON.stringify(one)}`);checks++;
const none=await trySummon('Obelisk the Tormentor',2,[]);assert(!none.offered,`without the relic a God needs 3: ${JSON.stringify(none)}`);checks++;
const three=await trySummon('Obelisk the Tormentor',3,[]);assert(three.summoned,`without the relic 3 Tributes still work: ${JSON.stringify(three)}`);checks++;
const dragon=await trySummon('Blue-Eyes White Dragon',1,['tribute_free']);assert(dragon.summoned&&dragon.left===0,`Level 8 needs 1: ${JSON.stringify(dragon)}`);checks++;
console.log(`PASS Tribute Free takes 1 Tribute off the Egyptian and Wicked Gods (${checks} checks)`);
