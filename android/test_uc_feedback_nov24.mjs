// Ultimate Collector feedback (CITYDRIVER, user 2026-11-24), client side: the red timer, the pause bar, the prize
// screen's deck view, card marks in the Collector editor, and live search in the shared search window.
// The server half is multiplayer/cloudflare/uc-feedback.test.mjs; collector.py marks are tools/test_collector_marks_nov24.py.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {clockText,isLow,pauseInfo,awayCharged,pauseBar,pauseBarMarkup,ownDeckMarkup,LOW_TIME,PAUSE_RETRY}=await import('./web/collector-clock.js');
const source=f=>readFileSync(new URL('./web/'+f,import.meta.url),'utf8');

// Timer text and the red threshold: 1:00 is red, 1:01 is not.
assert.equal(clockText(180000),'3:00');assert.equal(clockText(59001),'1:00');assert.equal(clockText(-5),'0:00');
assert.equal(isLow(LOW_TIME),true);assert.equal(isLow(60001),false,'1:01 shown');assert.equal(isLow(59001),true);assert.equal(isLow(0),true);

// Pause states as each seat sees them.
const now=1e6,base={until:null,by:null,from:null,ask:null,left:[2,2],asks:[5,5],retryAt:[0,0],time:180000};
assert.equal(pauseInfo(undefined,now,0),null,'no pause data: older Worker or Draft, no Pause option');
assert.equal(pauseInfo(base,now,0).canAsk,true);
assert.equal(pauseInfo({...base,left:[0,2]},now,0).canAsk,false,'no pauses left');
assert.equal(pauseInfo({...base,asks:[0,5]},now,0).canAsk,false,'no asks left');
const ask={...base,ask:{seat:0,until:now+30000}};
assert.equal(pauseInfo(ask,now,0).asking,true);assert.equal(pauseInfo(ask,now,1).asked,true);assert.equal(pauseInfo(ask,now,1).canAsk,false);
assert.equal(pauseInfo({...base,ask:{seat:0,until:now-1}},now,1).asked,false,'a lapsed ask is gone');
const paused={...base,until:now+90000,by:1,from:now-90000};
assert.deepEqual([pauseInfo(paused,now,1).mine,pauseInfo(paused,now,0).mine,pauseInfo(paused,now,0).paused,pauseInfo(paused,now,0).remaining],[true,false,true,90000]);
assert.equal(pauseInfo({...base,retryAt:[now+PAUSE_RETRY-1000,0]},now,0).declined,true,'the asker hears of a decline');
assert.equal(pauseInfo({...base,retryAt:[now+PAUSE_RETRY-1000,0]},now,0).canAsk,false,'and waits before asking again');
assert.equal(pauseInfo({...base,retryAt:[now+20000,0]},now,0).declined,false,'the notice is brief');

// The bar: buttons only where they mean something; its key changes only when they do.
assert.deepEqual(pauseBar(pauseInfo(ask,now,1)).buttons.map(b=>b[1]),['pause-accept','pause-decline']);
assert.deepEqual(pauseBar(pauseInfo(ask,now,0)).buttons,[]);
assert.deepEqual(pauseBar(pauseInfo(paused,now,1)).buttons.map(b=>b[1]),['pause-resume'],'only the asker resumes');
assert.equal(pauseBar(pauseInfo(paused,now,0)).clock,'1:30');
assert.equal(pauseBar(pauseInfo(paused,now,0)).key,pauseBar(pauseInfo(paused,now+5000,0)).key);
assert.equal(pauseBar(pauseInfo(base,now,0)),null);
assert.match(pauseBarMarkup(pauseBar(pauseInfo(ask,now,1))),/data-collector="pause-accept"/);

// Allowance shown for an away opponent leaves out the pause, as the hub does.
assert.equal(awayCharged(now,now-10000,null),10000);
assert.equal(awayCharged(now,now-10000,{from:now-8000,until:now-2000}),4000);
assert.equal(awayCharged(now,now-10000,{from:now-20000,until:now+5000}),0);

// Your deck on the prize screen: one tile per card with its copies, Monsters before Spells before Traps.
const cards={1:{name:'Pot of Greed',data:{type:2}},2:{name:'Kuriboh',data:{type:17}},3:{name:'Mirror Force',data:{type:4}},4:{name:'Axe Raider',data:{type:17}}};
const html=ownDeckMarkup({main:[1,2,2,3,4],side:[3],extra:[]},id=>cards[id],id=>`img/${id}.jpg`);
const main=html.split('<h3>')[1];
assert.deepEqual([...main.matchAll(/data-id="(\d+)"/g)].map(m=>m[1]),['4','2','1','3']);
assert.match(main,/Main Deck <span>5<\/span>/);assert.match(main,/×2/);assert.match(html,/Side Deck <span>1<\/span>/);assert.doesNotMatch(html,/Fusion Deck/);
assert.match(html,/data-collector="inspect"/,'a tap opens the card');

// Wiring: the timer gets .low, the pause bar is drawn each second, Options offers the pause, marks reach the editor.
const ui=source('collector-ui.js'),mobile=source('mobile.js'),css=source('mobile.css');
assert.match(ui,/isLow\(ms\)\?' low':''/);assert.match(ui,/this\.drawPause\(\)/);assert.match(ui,/'clockAt','pause'\]/);
assert.match(mobile,/tagUI\.pauseButton\?\.\(\)/);assert.match(css,/\.duel-portrait-timer\.low\{/);
assert.match(ui,/markTile\(tile\(k\),run,ids\[k\]\)/);assert.match(ui,/backend\('collector-mark'/);assert.match(ui,/this\.isDraft&&this\.deckStatus==='Marked'/);
assert.match(ui,/'Turn timer expired'/,'the timeout notice reads the duel record');

// Live search: the cards follow the window as you type, once per pause in typing; closing keeps what is shown.
class Target{constructor(){this.on={}}addEventListener(t,f){(this.on[t]??=[]).push(f)}fire(t,e={}){for(const f of this.on[t]||[])f(e)}}
const field=v=>Object.assign(new Target(),{value:v});
let dialog;
globalThis.document={createElement(){const d=dialog=new Target(),form=new Target();form.elements={q:field(''),race:field(''),attribute:field(''),level:field(''),match:field('any')};form.reset=()=>{};
 const output={textContent:''};Object.assign(d,{querySelector:s=>s==='form'?form:s==='output'?output:null,querySelectorAll:()=>[],showModal(){},remove(){},close(v){d.returnValue=v??'';d.fire('close')},form,output});Object.defineProperty(d,'innerHTML',{set(h){form.elements.q.value=(h.match(/name="q"[^>]*value="([^"]*)"/)||[])[1]||''}});return d},body:{append(){}}};
globalThis.FormData=class{constructor(form){return Object.entries(form.elements).filter(([k])=>k!=='match').map(([k,v])=>[k,v.value]).concat([['match',form.elements.match.value]])}};
const {openSearch,searches,LIVE_SEARCH_MS}=await import('./web/card-search.js');
const pool=[{id:1,name:'Dark Magician',desc:'',race:'Spellcaster',attribute:'DARK',level:7,data:{type:17}},{id:2,name:'Kuriboh',desc:'',race:'Fiend',attribute:'DARK',level:1,data:{type:17}}];
let applied=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
openSearch('uc-test',pool,()=>applied++);
await wait(LIVE_SEARCH_MS+50);assert.equal(applied,0,'opening draws nothing');
for(const text of ['d','da','dar','dark']){dialog.form.elements.q.value=text;dialog.form.fire('input',{});await wait(20)}
assert.equal(applied,0,'not on every letter');assert.match(dialog.output.textContent,/1 cards/,'the count follows each letter');
await wait(LIVE_SEARCH_MS+50);assert.equal(applied,1,'once after typing stops');assert.equal(searches['uc-test'].q,'dark');
dialog.form.elements.q.value='darker';dialog.form.fire('input',{isComposing:true});await wait(LIVE_SEARCH_MS+50);assert.equal(applied,1,'not while an IME composes');
dialog.close('cancel');assert.equal(applied,2,'closing with × keeps the latest text');assert.equal(searches['uc-test'].q,'darker');
openSearch('uc-test',pool,()=>applied++);dialog.form.elements.q.value='darker';dialog.close('apply');assert.equal(applied,2,'an unchanged search draws nothing');
console.log('PASS UC feedback: red timer, pause bar, prize deck view, Collector marks, live search');
