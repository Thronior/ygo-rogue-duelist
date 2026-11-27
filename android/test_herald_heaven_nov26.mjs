// Herald of Heaven (Serenity's Zera's Sanctuary loadout, user 2026-11-26), in real-core duels: while "The Sanctuary in the
// Sky" is face-up, Tribute 1 Fairy monster to Special Summon 1 Level 7 or higher Fairy from the hand or Deck, ignoring its
// Summoning conditions (Archlord Zerato), once per Duel. Run: node android/test_herald_heaven_nov26.mjs
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
ok(Object.values(meta.artifacts).some(a=>a[0]==='Herald of Heaven'),'Herald of Heaven is a relic');

const WABOKU=id('Waboku'),SANCTUARY=id('The Sanctuary in the Sky'),ZERATO=id('Archlord Zerato'),ZERA=id('Warrior of Zera');
const ANGEL=id('Shining Angel'),WINGWEAVER=id('Wingweaver'),ELF=id('Mystical Elf');
// Cards put in place before the first turn, taken from the Deck: [code, 'hand'|'field'|'fzone', player].
const setup=moves=>`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() ${moves.map(([code,where,p=0])=>`do local c=Duel.GetMatchingGroup(Card.IsCode,${p},LOCATION_DECK,0,nil,${code}):GetFirst() if c then ${where==='fzone'?`Duel.MoveToField(c,${p},${p},LOCATION_FZONE,POS_FACEUP,true)`:where==='field'?`Duel.MoveToField(c,${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`:`Duel.SendtoHand(c,${p},REASON_RULE)`} end end`).join(' ')} end) Duel.RegisterEffect(e,0) end`;

async function duel({script='',deck,enemy,turns=1,drive}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const deckOf=(cards,filler=WABOKU)=>[...cards,...fill(filler).slice(cards.length)];
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
// Special Summons the first offered card of `want` each time the idle menu offers one; picks the Tribute from `tribute`.
function driver(want,tribute,seen){return (e,m)=>{
 if(m.player!==0)return null;
 if(m.type===M.SELECT_IDLECMD){for(const c of m.special_summons||[])seen.add(c.code);const at=(m.special_summons||[]).findIndex(c=>want.includes(c.code));return at<0?toEnd:{type:R.SELECT_IDLECMD,action:I.SELECT_SPECIAL_SUMMON,index:at}}
 if(m.type===M.SELECT_BATTLECMD)return noBattle;
 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type))return {type:m.type===M.SELECT_YESNO?R.SELECT_YESNO:R.SELECT_EFFECTYN,yes:true};
 if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
 if(m.type===M.SELECT_CARD){const at=m.selects.findIndex(c=>tribute.includes(c.code));if(at>=0)return {type:R.SELECT_CARD,indicies:[at]}}
 return null}}
async function herald({artifacts=['herald_of_heaven'],place,tribute=[ANGEL],deck=[ZERATO,ZERATO,WINGWEAVER]}){
 const seen=new Set();
 const e=await duel({script:runScript(artifacts)+'\n'+setup(place),deck:deckOf([...place.map(([c])=>c),...deck]),enemy:fill(WABOKU),turns:3,drive:driver([ZERATO,WINGWEAVER],tribute,seen)});
 const out={zerato:count(e,0,L.MZONE,ZERATO)+count(e,0,L.MZONE,WINGWEAVER),tributed:count(e,0,L.GRAVE,ANGEL),offered:seen.has(ZERATO)};e.destroy();return out;
}
const fairies=[[SANCTUARY,'fzone'],[ANGEL,'field'],[ANGEL,'field']];
const once=await herald({place:fairies});console.log('Herald of Heaven',once);
same(once,{zerato:1,tributed:1,offered:true},'1 Fairy is Tributed for Archlord Zerato from the Deck, once per Duel over 3 turns');
same(await herald({place:[[ANGEL,'field'],[ANGEL,'field']]}),{zerato:0,tributed:0,offered:false},'not without The Sanctuary in the Sky');
same((await herald({place:[[SANCTUARY,'fzone'],[ZERA,'field'],[ELF,'field']],tribute:[ZERA,ELF]})).offered,false,'a non-Fairy cannot be Tributed');
same(await herald({artifacts:[],place:fairies}),{zerato:0,tributed:0,offered:false},'without the relic nothing is summoned');
console.log(`Herald of Heaven: ${checks} checks passed`);
