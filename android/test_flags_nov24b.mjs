// Behaviour flags of 2026-11-24 (review 3, build 0.2.43). Engine duels always run; the flagged replays are checked
// too when the review folder is present.
// 17613ea1: Breaker the Magical Warrior was Normal Summoned against a Set card (its summon rule), then kept its Spell
//           Counter: the removal threshold for Breaker was 1400 and an unknown Set card is worth 900. It stood in
//           Attack Position under a 2600 ATK monster for nothing. The CPU did read the relic-boosted ATK (2600).
// a2d1c6e3: not a bug. That duel had the "No Specials Allowed" curse (EFFECT_CANNOT_SPECIAL_SUMMON for both players);
//           without it, Valkyrion is offered and its Tribute picker lists Alpha/Beta/Gamma in the hand and on the field.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const allCards=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=allCards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};
const duel=await new MobileDuel(allCards).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=(body,deck=['Kuriboh','Kuriboh'],extra='')=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add(deck[p],p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'+extra};
// The player ends turn 1 at once; the CPU then plays turn 2 with today's policy. Returns what it did.
function cpuTurn(body){
 duel.start([],[],8000,8000,0,7,[],[],field(body),0);duel.core.startDuel(duel.h);duel.advance();
 const did=[];const seen=duel.onMessage.bind(duel);
 duel.onMessage=m=>{if(m.type===M.CHAINING||m.type===M.SUMMONING)did.push([m.type,duel.name(m.code)]);if(m.type===M.MOVE&&m.from?.location===L.SZONE&&m.to?.location===L.GRAVE)did.push(['back-destroyed',duel.name(m.card??m.code),m.from.controller]);return seen(m)};
 try{for(let i=0;i<120&&duel.pending&&duel.turn<3;i++){const m=duel.pending;
  if(m.player===0){duel.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:duel.auto());continue}
  duel.respond(duel.auto(m))}}finally{duel.onMessage=seen}
 return did;
}

// 17613ea1: Breaker summoned for their Set card uses its counter on it, even when it cannot win a battle afterwards
// (Summoned Skull 2500 beats Breaker at 1900 or 1600, like the flagged 2600 ATK Alligator's Sword).
{
 const did=cpuTurn(add('Breaker the Magical Warrior',1,'HAND','FACEDOWN')+add('Summoned Skull',0,'MZONE','FACEUP_ATTACK',2)+add('Skull Dice',0,'SZONE','FACEDOWN',1));
 ok(did.some(x=>x[0]===M.SUMMONING&&x[1]==='Breaker the Magical Warrior'),'Breaker is Normal Summoned for the Set card');
 ok(did.some(x=>x[0]===M.CHAINING&&x[1]==='Breaker the Magical Warrior'),'17613ea1: Breaker removes its Spell Counter');
 ok(did.some(x=>x[0]==='back-destroyed'&&x[1]==='Skull Dice'&&x[2]===0),'the Set card is destroyed');
}

// a2d1c6e3: Valkyrion's Tribute picker takes hand and field pieces; the curse "No Specials Allowed" blocks it.
{
 const pieces=add('Valkyrion the Magna Warrior',0,'HAND','FACEDOWN')+add('Beta The Magnet Warrior',0,'HAND','FACEDOWN')+add('Alpha The Magnet Warrior',0,'MZONE','FACEUP_ATTACK',2)+add('Gamma the Magnet Warrior',0,'MZONE','FACEUP_ATTACK',3);
 const offer=curse=>{duel.start([],[],8000,8000,0,7,[],[],field(pieces,undefined,curse?'do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,1) Duel.RegisterEffect(e,0) end\n':''),0);duel.core.startDuel(duel.h);duel.advance();return duel.pending.special_summons.findIndex(c=>duel.name(c.code)==='Valkyrion the Magna Warrior')};
 const i=offer(false);ok(i>=0,'Valkyrion is offered with Beta in the hand and Alpha/Gamma on the field');
 duel.respond({type:1,action:I.SELECT_SPECIAL_SUMMON,index:i});
 const m=duel.pending,list=[...(m.selects||m.select_cards||m.cards||[])];
 ok(list.some(c=>c.location===L.HAND&&duel.name(c.code)==='Beta The Magnet Warrior')&&list.some(c=>c.location===L.MZONE),'its Tribute picker lists hand and field pieces');
 ok(offer(true)<0,'a2d1c6e3: under "No Specials Allowed" it is not offered at all (the flagged duel had that curse)');
}

// The flagged replays, when the review folder is present.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-24-review-3/replays/';
 if(fs.existsSync(dir)){
  const files=fs.readdirSync(dir);
  const at=async(prefix,step,check)=>{const file=files.find(x=>x.startsWith(prefix));if(!file)return;
   const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
   const e=await new MobileDuel(allCards).init([data,scripts]);
   try{e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i].response??rec.responses[i]);check(e,e.pending,rec)}finally{e.destroy()}};
  await at('17613ea1',46,(e,m)=>{const r=e.auto(m);ok(r.action===I.SELECT_ACTIVATE&&e.name(m.activates[r.index].code)==='Breaker the Magical Warrior','17613ea1 step 46: Breaker uses its counter on the Set Skull Dice');
   ok(e.query(0,L.MZONE).some(c=>c&&c.attack===2600),'the CPU sees the relic-boosted 2600 ATK Alligator\'s Sword')});
  await at('a2d1c6e3',47,(e,m,rec)=>{ok(/SetCode\(EFFECT_CANNOT_SPECIAL_SUMMON\) e:SetProperty\(EFFECT_FLAG_PLAYER_TARGET\) e:SetTargetRange\(1,1\)/.test(rec.start[8]),'a2d1c6e3: the duel ran under "No Specials Allowed"');
   ok(!m.special_summons.length&&m.summons.length,'so nothing could be Special Summoned at step 47')});
 }
}
duel.destroy();
console.log(`PASS flags Nov 24 review 3 (${checks} checks): Breaker uses its counter, Valkyrion hand Tributes and the No Specials curse`);
