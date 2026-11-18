// Final Countdown's turns left (CITYDRIVER, Discord 2026-11-18): the duel remembers each resolved copy and its turn, the
// win reason 0x11 plays the card finale, and the Character settings helpers keep saved marks per character.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B}=await import('./web/duel.js');
const {isCardWin}=await import('./web/exodia-finale.js');
const cs=await import('./web/character-settings.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};

const COUNTDOWN=id('Final Countdown'),WABOKU=id('Waboku');
const deck=[COUNTDOWN,...Array(39).fill(WABOKU)];
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
// Puts Final Countdown in the opening hand.
const toHand=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP) e:SetOperation(function(e) e:Reset() local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${COUNTDOWN}) if c then Duel.SendtoHand(c,0,REASON_RULE) end end) Duel.RegisterEffect(e,0) end`;
let s=e.start(deck,Array(40).fill(WABOKU),8000,8000,5,11,[],[],toHand),activated=false,seen=null;
for(let i=0;i<4000&&!s.finished&&e.turn<=4;i++){
 const m=e.pending;if(!m)break;let answer=null;
 if(m.player===0&&m.type===M.SELECT_IDLECMD){
  const at=(m.activates||[]).findIndex(c=>c.code===COUNTDOWN);
  if(!activated&&at>=0){activated=true;answer={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:at}}
  else{if(activated&&e.turn===3&&!seen)seen={turn:e.turn,list:JSON.parse(JSON.stringify(e.finalCountdowns))};answer={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
 }else if(m.player===0&&m.type===M.SELECT_BATTLECMD)answer={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
 s=e.respond(answer||e.auto());
}
assert.deepEqual(e.errors||[],[]);
ok(activated,'Final Countdown was activated');
ok(e.finalCountdowns.length===1&&e.finalCountdowns[0].player===0&&e.finalCountdowns[0].turn===1,`remembered on turn 1 (${JSON.stringify(e.finalCountdowns)})`);
ok(seen&&20-(seen.turn-seen.list[0].turn)===18,'turn 3 shows 18 turns left');
e.destroy();
ok(isCardWin({reason:0x11})&&isCardWin({reason:0x10})&&isCardWin({reason:0x15})&&!isCardWin({reason:1}),'Final Countdown wins play the card finale');

// Character settings helpers.
const settings={};
cs.setSavedMark(settings,4,COUNTDOWN,1);cs.setSavedMark(settings,4,WABOKU,-1);
ok(cs.savedMark(settings,4,COUNTDOWN)===1&&cs.savedMark(settings,4,WABOKU)===-1&&cs.savedMark(settings,5,COUNTDOWN)===0,'marks are per character');
cs.setSavedMark(settings,4,WABOKU,0);ok(!('4' in settings.characterSettings)===false&&cs.savedMark(settings,4,WABOKU)===0,'a cleared mark is removed');
cs.setKeepRunMarks(settings,9,true);ok(cs.characterSettings(settings,9).keepRunMarks,'switch saved');
cs.setKeepRunMarks(settings,9,false);ok(!('9' in settings.characterSettings),'an empty character row is dropped');
cs.clearSavedMarks(settings,4);ok(!('4' in settings.characterSettings),'Clear removes the marks');
const cards=meta.cards.slice(0,200);cs.setSavedMark(settings,1,cards[3].id,1);
ok(cs.editorCards(cards,settings,1,{filter:'yes'}).length===1,'★ filter');
ok(cs.editorCards(cards,settings,1,{query:cards[7].name.slice(0,6)}).some(c=>c.id===cards[7].id),'search by name');
const grid=cs.editorGrid(cards,settings,1,99,x=>`${x}.jpg`);ok(grid.page===grid.pages-1&&grid.pages===Math.ceil(200/cs.PAGE),'page is clamped');
ok(cs.characterPane(settings,1,'Yugi').includes('data-char-keep-marks="1"'),'pane has the switch');
// The editor's card source (user, 2026-11-18): the character's starting packs come first, then every other pack by name.
const yugi=meta.characters[0],src=cs.packSources(yugi,meta.packs);
ok(src.start.length&&src.start[0].id===yugi.starting_packs[0]&&!src.rest.some(p=>src.start.includes(p)),'starting packs first, not repeated');
ok(src.start.length+src.rest.length===meta.packs.length,'every pack is offered once');
ok(src.rest.every((p,i)=>!i||src.rest[i-1].name.localeCompare(p.name)<=0),'other packs by name');
const byId=new Map(meta.cards.map(c=>[c.id,c])),inPack=cs.packCards(src.start[0],byId);
ok(inPack.length>0&&inPack.every(c=>src.start[0].common.includes(c.id)||src.start[0].rare.includes(c.id)),'a pack shows its own cards');
ok(cs.editorMarkup(0,{source:src.start[0].id},src).includes(`<optgroup label="Starting packs"><option value="${src.start[0].id}" selected`),'the chosen pack stays selected');
console.log(`PASS Final Countdown turns left and character settings: ${checks} checks`);
