// Mugen101 (Discord 2026-11-08): solo handlers answered controls on Tag screens. Changing the Tag deck's sort or
// deck-status menu drew the solo deck editor over the room (taps did nothing; its Next button led to the solo opponent
// screen and "Unavailable opponent"), and the mystery portrait opened the solo reveal for opponent NaN.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
Object.assign(globalThis,{window:globalThis,Audio:class{addEventListener(){}},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},createElement:()=>({style:{},setAttribute(){},append(){}})},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {encounterPortrait}=await import('./web/encounter-reveal.js');
const content={characters:[{name:'A',sprite:'a.png'},{name:'B',sprite:'b.png'}]},run={round:1,loop:0,gold:100,artifacts:[],routes:[0,1],revealed_opponents:[]};
const tag=encounterPortrait(content,run,1,{revealAttr:'data-id',tag:true}),solo=encounterPortrait(content,run,1);
assert.match(tag,/data-tag="reveal-opponent" data-id="1"/,'Tag reveal goes to the Tag handler');
assert.doesNotMatch(tag,/data-do=/,'nothing on the Tag portrait reaches the solo handler');
assert.match(solo,/data-do="reveal-opponent" data-opponent="1"/,'solo is unchanged');
const mobile=readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const listener=mobile.slice(mobile.indexOf("document.addEventListener('change',e=>{if(screen!=='draft')return;"),mobile.indexOf('renderDraft()}})',mobile.indexOf("e.target.dataset.draftSort!==undefined")));
assert.match(listener,/draftSort[\s\S]*draftDeck/,'the solo sort and deck-status listener only answers the solo deck editor');
assert.equal((mobile.match(/dataset\.draftSort!==undefined/g)||[]).length,1,'one solo sort listener');
const tagUI=readFileSync(new URL('./web/tag-ui.js',import.meta.url),'utf8');
assert.match(tagUI,/encounterPortrait\(this\.content,r,i,\{revealAttr:'data-id',disabled:waiting,tag:true\}\)/);
console.log('PASS Tag screens keep solo handlers out: sort/deck-status menus and the reveal portrait');
