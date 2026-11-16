// Tag's version handshake (Discord, 2026-11-16): a v0.2.35 player who still had a solo run with Random Pack cards was told
// "These tag versions or card collections are incompatible" by every partner, even after a hard reload. The solo run's
// randomized cards (random-cards.js) join content.cards after every backend command, and the hello's content hash
// covered them. This test rebuilds that state with the real random-cards.js and checks that two players on the same
// version connect, and that a real mismatch now says which side is out of date.
import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
globalThis.document??={hidden:false,addEventListener(){}};globalThis.location??={href:'http://localhost/'};
globalThis.window??={addEventListener(){}};
globalThis.Audio??=class{constructor(src){this.src=src}addEventListener(){}play(){return Promise.resolve()}pause(){}load(){}};
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
const {TagSession,mismatchMessage}=await import('./web/tag-session.js');
const {setupRandomCards,syncRandomCards}=await import('./web/random-cards.js');
const {replayVersion}=await import('./web/replay-version.js');
const root=fileURLToPath(new URL('../',import.meta.url));
const load=()=>JSON.parse(fs.readFileSync(root+'android/web/content.json','utf8').replace(/^﻿/,''));
let checks=0;const check=(value,why)=>{assert(value,why);checks++};

// Cormax: same build, but a paused solo run holds three Random Pack cards. Partner: a clean profile.
const cormax=load(),partner=load();
setupRandomCards({content:cormax,cardsById:new Map(),cardImages:new Map()});
const donor=cormax.cards.find(c=>c.id<100000000);
const randomized=[191000000,191000001,191000002].map((id,i)=>({card:{...donor,id,name:'Randomized '+i,randomized:{art_from:donor.id}},script:''}));
await syncRandomCards('run-1:3',async()=>({key:'run-1:3',cards:randomized}));
check(cormax.cards.filter(c=>c.id>=191000000).length===3,'the solo run\'s randomized cards are in the loaded content, as on Cormax\'s client');
// What v0.2.35 hashed: the whole content, randomized cards included. This is the reported mismatch.
const oldHash=c=>crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex');
check(oldHash(cormax)!==oldHash(partner),'reproduces v0.2.35: the old hash differs between two players on the same version');

const backend=async action=>{if(action==='tag-restore')return null;if(['tag-create','tag-pause'].includes(action))return;if(action==='tag-view')return {phase:'lobby',revision:1};throw Error(action)};
const session=(content,seat)=>{const s=new TagSession({endpoint:'http://localhost:8765',character:seat,profile:{},content,backend});s.code='ABCDE';s.seat=seat;s.peer.peerSid='x';s.peer.started=true;s.peer.send=()=>{};s.peer.request=async()=>{};return s};
const host=session(cormax,0),guest=session(partner,1);
check(await host.contentHash===await guest.contentHash,'randomized cards stay out of the Tag content hash');
const hostHello=await host.greeting(),guestHello=await guest.greeting();
check(hostHello.build===replayVersion,'the hello carries the game version');
await host.receive(guestHello);check(host.connected,'Cormax hosting connects');
await guest.receive(hostHello);check(guest.connected,'his partner connects');
// Both roles: Cormax as the guest too.
const g2=session(cormax,1),h2=session(partner,0);await g2.receive(await h2.greeting());await h2.receive(await g2.greeting());
check(g2.connected&&h2.connected,'Cormax joining as the guest connects');

// A genuine mismatch names the side that is out of date.
const older=session(partner,0);
await assert.rejects(older.receive({...guestHello,contentHash:'old',build:undefined}),e=>/Your partner's game is out of date\. They need to update to v/.test(e.message));checks++;
await assert.rejects(older.receive({...guestHello,contentHash:'old',build:'0.0.1'}),e=>e.message.includes("partner's game is out of date (v0.0.1)"));checks++;
await assert.rejects(older.receive({...guestHello,contentHash:'new',build:'999.0.0'}),e=>e.message.startsWith('Your game is out of date (v'+replayVersion+')'));checks++;
await assert.rejects(older.receive({...guestHello,contentHash:'other'}),e=>/You both have v.*card data does not match/.test(e.message));checks++;
await assert.rejects(older.receive({...guestHello,version:4}),/out of date|does not match/);checks++;
check(!older.connected,'a refused partner never connects');
check(mismatchMessage('0.2.9','0.2.10').includes('partner'),'versions compare by number, not as text');
check(mismatchMessage('0.2.10','0.2.9').startsWith('Your game'),'a newer partner means this game is out of date');
// The messages are translated in every language (tools/i18n/add_nov16_tag_mismatch_terms.py).
globalThis.document.documentElement??={};globalThis.document.body??=null;globalThis.MutationObserver??=class{observe(){}disconnect(){}};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(root+'android/web/'+url,'utf8'))});
const i18n=await import('./web/i18n.js');
for(const code of ['de','es','fr','it','ja','ko','pt','zh']){
 await i18n.setLanguage(code,{remember:false});
 for(const text of [mismatchMessage(undefined,'0.2.36'),mismatchMessage('0.2.35','0.2.36'),mismatchMessage('0.2.37','0.2.36'),mismatchMessage('0.2.36','0.2.36')]){
  const local=i18n.t(text);check(local!==text&&local.includes('0.2.36'),`${code} translates "${text.slice(0,40)}…" and keeps the version`);
 }
}
console.log(`PASS Tag version handshake: randomized solo cards no longer break it, mismatches name the outdated side, ${checks} checks`);
process.exit(0);
