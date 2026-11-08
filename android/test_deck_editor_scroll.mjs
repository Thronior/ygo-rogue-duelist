// Picking cards must never throw the deck editors back to the top (fixed for the CPU editor in v0.1.97).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},documentElement:{hasAttribute:()=>true}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const source=name=>readFileSync(new URL(`./web/${name}`,import.meta.url),'utf8');
const body=(src,name)=>{const start=src.indexOf(`function ${name}(`);assert(start>=0,`${name} missing`);let depth=0;for(let i=src.indexOf('{',start);i<src.length;i++){if(src[i]==='{')depth++;if(src[i]==='}'&&!--depth)return src.slice(start,i+1)}};

// Solo: a tap only toggles classes on the cards already shown, so neither scroll nor order changes.
const mobile=source('mobile.js');
for(const name of ['tapDraft','flushDraftTap','updateDraft']){
 const fn=body(mobile,name);
 assert.doesNotMatch(fn,/renderDraft\(|innerHTML|scrollTop/,`${name} must not redraw the deck editor`);
}
assert.match(body(mobile,'tapDraft'),/updateDraft\(/);assert.match(body(mobile,'flushDraftTap'),/updateDraft/);

// Tag: every tap redraws the tab, so render() must carry the list's scroll position into the new markup.
const {TagUI}=await import('./web/tag-ui.js');
const render=TagUI.prototype.render;TagUI.prototype.render=()=>{};
// The deck tab is one grid, or on wide screens two panes (Deck and Collection) that each keep their own position.
let list={scrollTop:640},panes=[];
const host={querySelector:selector=>selector.includes('draft-card-scroll')&&!panes.length?list:null,querySelectorAll:()=>panes};
const root={style:{setProperty(){}},addEventListener(){},querySelector:selector=>selector==='.tag-deck-scroll'?host:null};
const ui=new TagUI({root,content:{},profile:{unlocked:[0]},image:id=>`${id}.jpg`});
TagUI.prototype.render=render;
ui.updateRoomBadge=()=>{};ui.renderContent=()=>{list={scrollTop:0};panes=panes.map(()=>({scrollTop:0}))};
ui.render();
assert.equal(list.scrollTop,640,'Tag deck tab keeps its scroll position after a tap');
panes=[{scrollTop:300},{scrollTop:900}];ui.render();
assert.deepEqual(panes.map(p=>p.scrollTop),[300,900],'both split panes keep their scroll position after a tap');
// Tag's trade grid scrolls in .tag-deck-scroll itself; a tap reset it to the top (Mugen101, Discord 2026-11-08).
{let trade={scrollTop:900};const tradeRoot={style:{setProperty(){}},addEventListener(){},querySelector:selector=>selector==='.tag-trade .tag-deck-scroll'?trade:null};
 const t=Object.create(TagUI.prototype);Object.assign(t,{root:tradeRoot,updateRoomBadge(){},checkDeckSplit(){},renderContent(){trade={scrollTop:0}}});
 t.render();assert.equal(trade.scrollTop,900,'Tag trade grid keeps its scroll position after a tap');}
// Solo's split view redraws its two panes on a tap, so it must restore both.
assert.match(body(mobile,'updateSplitPanes'),/saveDeckScroll\(area\)[\s\S]*restoreDeckScroll\(area,scrolls\)/,'solo split panes keep their scroll');

// CPU deck editor (Watch CPU Duel): render() saves and restores all three scrolling panes.
const cpu=source('cpu-deck-editor.js'),cpuRender=cpu.slice(cpu.indexOf(' render(){'),cpu.indexOf(' render(){')+6000);
assert.match(cpuRender,/for\(const selector of \['\.cde-library','\.cde-pool','\.cde-deck'\]\)/,'CPU editor records each pane');
assert.match(cpuRender,/el\.scrollTop=top/,'CPU editor restores each pane');
console.log('PASS deck editors keep their scroll position when cards are picked (solo, Tag, Tag trade, CPU editor)');
