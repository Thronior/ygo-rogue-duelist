// Sealed Fate (user, 2026-11-23, Destiny Board support asked for on Discord): "Destiny Board" and "Spirit Message" cards you
// control cannot be targeted by card effects. With only a face-up Destiny Board on our side, the opponent's Mystical Space
// Typhoon has no target and cannot be activated; without the relic it can. Destroying without a target is not stopped.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relic=a=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))",JSON.stringify({curses:[],artifacts:a,challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const BOARD=id('Destiny Board'),OX=id('Battle Ox'),MST=id('Mystical Space Typhoon'),STORM=id('Heavy Storm');
// Puts Destiny Board face-up for player 0 at the start, as if it had been activated.
const place=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local tc=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${BOARD}) if tc then Duel.MoveToField(tc,0,0,LOCATION_SZONE,POS_FACEUP,true) end end) Duel.RegisterEffect(e,0) end`;
async function theirTurn(artifacts,removal){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start([BOARD,...Array(39).fill(OX)],Array(40).fill(removal),8000,8000,5,11,[],[],relic(artifacts)+'\n'+place);
 // The opponent never takes a chance to chain the removal (that would destroy the board before the check): it passes, and
 // each offer is counted.
 let offered=false;
 for(let i=0;i<200&&!s.finished;i++){const m=e.pending;if(m?.player===1&&m.type===M.SELECT_IDLECMD)break;if(!m)break;
  if(m.player===1&&m.type===M.SELECT_CHAIN&&!m.forced){offered||=(m.selects||[]).some(x=>x?.code===removal);s=e.respond({type:R.SELECT_CHAIN,index:null});continue}
  s=e.respond(e.auto())}
 const m=e.pending,out={idle:m?.player===1&&m.type===M.SELECT_IDLECMD,can:offered||(m?.activates||[]).some(x=>x.code===removal),board:e.query(0,L.SZONE).some(c=>c&&c.code===BOARD&&(c.position&5))};e.destroy();return out;
}
const sealed=await theirTurn(['sealed_fate'],MST);
ok(sealed.idle&&sealed.board,'the opponent reaches its Main Phase with Destiny Board face-up on our side');
ok(!sealed.can,'Sealed Fate: Mystical Space Typhoon cannot target Destiny Board');
const open=await theirTurn([],MST);
ok(open.idle&&open.can,'without the relic Mystical Space Typhoon can target it');
const storm=await theirTurn(['sealed_fate'],STORM);
ok(storm.idle&&storm.can,'Heavy Storm does not target, so it still works');
console.log(`PASS Sealed Fate keeps Destiny Board from being targeted (${checks} checks)`);
