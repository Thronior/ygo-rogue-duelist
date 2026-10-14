import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from '../android/web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url));const read=n=>JSON.parse(fs.readFileSync(new URL('../android/web/'+n+'.json',import.meta.url),'utf8'));const meta=read('content');const card=meta.cards.find(c=>c.name==='Battle Ox');
const gen=spawnSync(root+'python/python.exe',['-B','-c',`import passives;print(passives.script({'character':0,'artifacts':[],'curses':[],'duel_modifications':[{'location':'DECK','sequence':0,'atk':4000,'defense':1000},{'location':'DECK','sequence':1,'atk':${card.atk},'defense':${card.defense}}]}))`],{cwd:root,encoding:'utf8'});assert.equal(gen.status,0,gen.stderr);
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{for(const mode of ['initial','shuffle','remove','return']){
 const setup=mode==='initial'?'':`local target=Duel.GetFieldCard(0,LOCATION_DECK,0) local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_MAIN1) e:SetOperation(function(e) e:Reset() local g=Group.FromCards(target) ${mode==='shuffle'?'Duel.ShuffleHand(0)':`Duel.SendtoGrave(g,REASON_RULE) ${mode==='return'?'Duel.SendtoHand(g,0,REASON_RULE) Duel.ShuffleHand(0)':''}`} end) Duel.RegisterEffect(e,0)`;
 e.start(Array(6).fill(card.id),Array(10).fill(card.id),8000,8000,5,123,[],[],gen.stdout+'\n'+setup);for(let n=0;n<100&&e.pending?.type!==M.SELECT_IDLECMD;n++)e.respond(e.auto());
 assert.equal(e.pending?.type,M.SELECT_IDLECMD);const hand=e.query(0,L.HAND);assert.equal(e.misprintedHands[0].size,mode==='remove'?1:2,mode);assert.equal(e.misprintedHands[1].size,0);for(const index of e.misprintedHands[0]){assert.ok(hand[index]);assert.equal(hand[index].defense,1000);assert([4000,card.atk].includes(hand[index].attack));}if(mode!=='remove')assert(hand.some(c=>c?.attack===4000),'Modified stats follow the exact copy, including after shuffling');assert.deepEqual(e.errors,[]);console.log('PASS misprint '+mode);e.destroy();
}
e.start(Array(10).fill(card.id),Array(10).fill(card.id),8000,8000,5,123);assert.equal(e.misprintedHands[0].size,0);console.log('PASS fresh duel resets markers');}finally{e.destroy()}


