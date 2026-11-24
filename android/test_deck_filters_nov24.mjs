// Deck building filters (user, 2026-11-24).
// 1. Nori: the split deck editor shows the Extra Deck in its own pane right below the Deck (solo, and the shared editor
//    Tag, Draft Duels and Ultimate Collector use). Single-grid layouts are unchanged.
// 2. CITYDRIVER: packs filter by card draw and Equip Spells, and a pack's Type tags and Type filter count that Type's
//    monsters plus its support cards (Limiter Removal for Machine). Collection › Packs gets a "Cards" filter with the
//    count of matching cards on each pack, and opening a pack from it shows those cards.
// Usage: runtime/ai/node.exe android/test_deck_filters_nov24.mjs
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
globalThis.localStorage??={getItem:()=>null,setItem(){},removeItem(){}};
const here=path.dirname(fileURLToPath(import.meta.url)),web=path.join(here,'web'),root=path.join(here,'..');
const content=JSON.parse(fs.readFileSync(path.join(web,'content.json'),'utf8').replace(/^﻿/,''));
const {splitDeckMarkup,splitCounts,isExtraDeckCard,saveDeckScroll,restoreDeckScroll}=await import('./web/card-search.js');
const {deckOrder,deckCardsArea}=await import('./web/deck-editor-view.js');
const {supportedTypes,typeCard,drawCard,equipSpell,packSummaryParts,packTermMatcher,packFilterOptions,packFilterCount,parsePackFilter,PACK_THEMES}=await import('./web/pack-summary.js');
const byId=new Map(content.cards.map(c=>[c.id,c])),byName=n=>{const c=content.cards.find(c=>c.name===n);assert(c,n);return c};
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};

// --- 1. Extra Deck pane in the split view ---
const pane=(html,kind)=>{const m=new RegExp(`<section class="deck-split-pane ${kind}"><h3>[^<]*<span>(\\d+)</span></h3>([\\s\\S]*?)</section>`).exec(html);return m?{count:+m[1],ids:[...m[2].matchAll(/data-i="(\d+)"/g)].map(x=>+x[1]),body:m[2]}:null};
const pool=['Blue-Eyes White Dragon','Dark Magician','Polymerization','Blue-Eyes Ultimate Dragon','Flame Swordsman','Kuriboh'].map(n=>byName(n).id);
const extra=i=>isExtraDeckCard(byId.get(pool[i])),tile=i=>`<b data-i="${i}"></b>`;
ok(extra(3)&&extra(4)&&!extra(0)&&!extra(2),'Fusion Monsters are Extra Deck cards; Polymerization is not');
{const html=splitDeckMarkup([0,2,3],[1,4,5],tile,false,null,null,extra);
 ok(html.includes('<div class="deck-split-side">'),'Deck and Extra Deck share the left column');
 eq(pane(html,'deck-pane').ids,[0,2],'the Deck pane holds only Main Deck cards');
 eq(pane(html,'deck-extra-pane').ids,[3],'the Extra Deck pane holds the deck\'s Fusion Monsters');
 eq(pane(html,'collection-pane').ids,[1,4,5],'the Collection pane is unchanged (its Extra Deck cards stay in it)');
 ok(html.indexOf('deck-pane')<html.indexOf('deck-extra-pane')&&html.indexOf('deck-extra-pane')<html.indexOf('collection-pane'),'Extra Deck right below the Deck');}
// No Fusion in the deck yet, but one in the collection: the pane shows, empty, with a hint.
{const html=splitDeckMarkup([0],[3],tile,false,null,null,extra);ok(pane(html,'deck-extra-pane')?.count===0&&/Fusion Monster in your collection/.test(pane(html,'deck-extra-pane').body),'empty Extra Deck pane with a hint');}
// Nothing from the Extra Deck in view (no Fusions, or the Spell tab): the old two panes.
{const html=splitDeckMarkup([0,2],[1,5],tile,false,null,null,extra);ok(!html.includes('deck-extra-pane')&&!html.includes('deck-split-side'),'no Extra Deck pane without Extra Deck cards');}
// Without isExtra (any older caller) the markup is exactly the old one.
eq(splitDeckMarkup([0,3],[1],tile,false),'<section class="deck-split-pane deck-pane"><h3>Deck <span>2</span></h3><div class="deck-split-scroll"><div class="cardgrid"><b data-i="0"></b><b data-i="3"></b></div></div></section><section class="deck-split-pane collection-pane"><h3>Collection <span>1</span></h3><div class="deck-split-scroll"><div class="cardgrid"><b data-i="1"></b></div></div></section>','old markup without isExtra');
// Stacks fold copies: the headings count real cards.
eq(splitCounts([0,2,3,3,3],[1,1],extra),{'deck-pane':2,'deck-extra-pane':3,'collection-pane':2},'pane counts');
{const html=splitDeckMarkup([0,3],[1],tile,false,null,splitCounts([0,0,3,3],[1,1],extra),extra);eq([pane(html,'deck-pane').count,pane(html,'deck-extra-pane').count,pane(html,'collection-pane').count],[2,2,2],'folded panes show real counts')}

// The shared editor (Tag, Draft Duels, Ultimate Collector): deckOrder hands deckCardsArea the pool's card types.
{const ed={deckFilter:'All',deckSort:'Default',deckStatus:'Any',deckSplit:18},selected=[0,2,3];
 const order=deckOrder(ed,{pool,selected,lookup:id=>byId.get(id),run:{pool,artifacts:[],curses:[]},info:content.artifactInfo,searchKey:'test-nov24'});
 const html=deckCardsArea(ed,order,selected,tile);
 eq(pane(html,'deck-extra-pane').ids,[3],'shared editor: Extra Deck pane');eq(pane(html,'deck-pane').ids.sort(),[0,2],'shared editor: Deck pane');
 ed.deckSplit=0;const single=deckCardsArea(ed,order,selected,tile);ok(!single.includes('deck-extra-pane')&&!single.includes('deck-split'),'single grid unchanged');}
// Solo (mobile.js) passes the same test and counts.
{const mobile=fs.readFileSync(path.join(web,'mobile.js'),'utf8'),fn=mobile.slice(mobile.indexOf('function splitDeckPanes('),mobile.indexOf('function checkDraftSplit('));
 ok(/isExtra=i=>isExtraDeckCard\(card\(r\.pool\[i\]\)\)/.test(fn)&&/draftPage\(r\),null,isExtra\)/.test(fn)&&/draftPage\(r\),splitCounts\(deckSide,rest,isExtra\),isExtra\)/.test(fn),'solo split passes isExtra (plain and stacked)');}
// Scroll positions follow their pane when the Extra Deck pane comes or goes.
{const el=(kind,top)=>({scrollTop:top,closest:()=>kind?{classList:['deck-split-pane',kind]}:null});
 let panes=[el('deck-pane',10),el('collection-pane',700)];const host={querySelectorAll:()=>panes,querySelector:()=>null};
 const saved=saveDeckScroll(host);panes=[el('deck-pane',0),el('deck-extra-pane',0),el('collection-pane',0)];restoreDeckScroll(host,saved);
 eq(panes.map(p=>p.scrollTop),[10,0,700],'each pane keeps its own position');}

// --- 2. Type support ---
const types=desc=>[...supportedTypes({desc})].sort();
eq([...supportedTypes(byName('Limiter Removal'))],['Machine'],'Limiter Removal supports Machine');
eq(types('All Warrior or Spellcaster monsters gain 500 ATK.'),['Spellcaster','Warrior'],'"X or Y monsters"');
eq(types('Target 1 Dragon, Spellcaster, or Fiend monster you control.'),['Dragon','Fiend','Spellcaster'],'lists of Types');
eq(types('Equip only to a Winged Beast-Type monster.'),['Winged Beast'],'Winged Beast is not Beast');
eq(types('Beast-Warrior monsters you control gain 300 ATK.'),['Beast-Warrior'],'Beast-Warrior is not Beast or Warrior');
eq(types('Zombie Normal Monsters gain 300 ATK.'),['Zombie'],'"<Type> Normal Monsters"');
eq(types('Add 1 "Blue-Eyes White Dragon" from your Deck to your hand.'),[],'a Type inside a quoted card name does not count');
eq(types('This dragon breathes fire.'),[],'a plain word is not support');
ok(typeCard(byName('Limiter Removal'),'Machine')&&typeCard(byName('Blue-Eyes White Dragon'),'Dragon')&&!typeCard(byName('Blue-Eyes White Dragon'),'Machine'),'typeCard: monsters and support');
ok(packTermMatcher(content,'race','Machine')(byName('Limiter Removal')),'the pack window\'s Machine link shows Limiter Removal');
// Bandit Keith's pack: Machine counts monsters plus support, and the summary tags Machine.
{const p=content.packs.find(p=>p.id==='DRAFT-BANDIT-KEITH');ok(p,'Bandit Keith pack');
 const cards=[...new Set([...p.common,...p.rare])].map(id=>byId.get(id)).filter(Boolean),machines=cards.filter(c=>c.data.type&1&&c.race==='Machine').length;
 ok(packFilterCount(content,p.id,'race:Machine')>machines,'Machine filter counts support cards too');
 ok(packSummaryParts(content,p.id).types.includes('Machine'),'Bandit Keith\'s pack is tagged Machine');}
// Summary Type tags: the 3 Types with the most monsters + support cards, each card once per Type.
for(const p of content.packs){const parts=packSummaryParts(content,p.id);if(!parts||p.id==='DRAFT-DARTZ')continue;const counts={};
 for(const id of new Set([...(p.common||[]),...(p.rare||[])])){const c=byId.get(id);if(!c)continue;const own=c.data.type&1?c.race:null;if(own)counts[own]=(counts[own]||0)+1;for(const r of supportedTypes(c))if(r!==own)counts[r]=(counts[r]||0)+1}
 // Ties may come in either order.
 const n=parts.types.map(r=>counts[r]),rest=Object.keys(counts).filter(r=>!parts.types.includes(r)).map(r=>counts[r]);
 ok(parts.types.length===Math.min(3,Object.keys(counts).length)&&n.every((x,k)=>!k||x<=n[k-1])&&rest.every(x=>x<=Math.min(...n)),`${p.id}: Type tags`)}

// --- Draw and Equip themes ---
ok(drawCard(byName('Pot of Greed'))&&!drawCard(byName('Dark Magician'))&&!drawCard(byName('Polymerization')),'card draw');
ok(equipSpell(byName('Axe of Despair'))&&!equipSpell(byName('Polymerization'))&&!equipSpell(byName('Dark Magician')),'Equip Spells by type bits');
ok(PACK_THEMES.some(t=>t.name==='card draw')&&PACK_THEMES.some(t=>t.name==='Equip Spells'),'new Support themes');
let named=0;
for(const p of content.packs){const parts=packSummaryParts(content,p.id);if(!parts)continue;const cards=[...new Set([...(p.common||[]),...(p.rare||[])])].map(id=>byId.get(id)).filter(Boolean);
 const equips=cards.filter(equipSpell).length,draws=cards.filter(drawCard).length;
 eq(parts.themes.includes('Equip Spells'),equips>0,`${p.id}: Equip Spells tag`);eq(parts.themes.includes('card draw'),draws>0,`${p.id}: card draw tag`);
 eq(packFilterCount(content,p.id,'theme:Equip Spells'),equips,`${p.id}: Equip Spells count`);eq(packFilterCount(content,p.id,'theme:card draw'),draws,`${p.id}: draw count`);
 if(equips)named++}
ok(named>20,'many packs name their Equip Spells');

// --- Collection › Packs "Cards" filter ---
{const o=packFilterOptions(content);ok(o.themes.includes('Equip Spells')&&o.types.includes('Machine')&&!o.types.includes('Cyberse'),'options: themes and the Types in the game');
 eq(parsePackFilter('race:Sea Serpent'),{kind:'race',value:'Sea Serpent'},'filter values');eq(parsePackFilter(''),null,'no filter');
 const t0=performance.now();for(const f of [...o.themes.map(x=>'theme:'+x),...o.types.map(x=>'race:'+x)])for(const p of content.packs)packFilterCount(content,p.id,f);const first=performance.now()-t0;
 const t1=performance.now();for(let k=0;k<20;k++)for(const p of content.packs)packFilterCount(content,p.id,'theme:Equip Spells');const again=performance.now()-t1;
 ok(first<1500&&again<20,`counts are cheap (all filters ${first.toFixed(0)} ms once, then lookups ${again.toFixed(1)} ms)`);}
{const mobile=fs.readFileSync(path.join(web,'mobile.js'),'utf8');
 ok(/packFilterCount\(content,r\.id,collectionPackCards\)/.test(mobile)&&/\.sort\(\(a,b\)=>b\.matches-a\.matches\)/.test(mobile),'Collection › Packs filters and sorts by matching cards');
 ok(/inspectPack\(id,collectionPackCards\)/.test(mobile)&&/const start=parsePackFilter\(filter\)/.test(mobile),'opening a filtered pack shows those cards');
 ok(/if\(key==='pack-cards'\)collectionPackCards=e\.target\.value/.test(mobile),'the select sets the filter');}

// --- 8 languages ---
const TERMS=['card draw','Equip Spells','Support','Removal and control','Matching cards in this pack','Tap a Fusion Monster in your collection to add it.','Draw cards','Any card','Cards','Monster Type','Extra Deck','Ritual Summoning','Fusion Summoning','LP recovery'];
for(const lang of ['de','es','fr','it','ja','ko','pt','zh']){
 const ui=JSON.parse(fs.readFileSync(path.join(root,`data/i18n/ui/${lang}.json`),'utf8').replace(/^﻿/,'')),bundle=JSON.parse(fs.readFileSync(path.join(web,`i18n/${lang}.json`),'utf8').replace(/^﻿/,''));
 const flat=JSON.stringify(bundle);
 for(const term of TERMS){ok(ui[term],`${lang}: ${term}`);ok(flat.includes(JSON.stringify(term)),`${lang} bundle: ${term}`)}
 // The whole-sentence pack summaries (tools/i18n/add_nov18_pack_summary_terms.mjs) cover the new themes.
 ok(Object.keys(ui).some(k=>/Support: .*Equip Spells.*\{0\} different cards/.test(k)),`${lang}: pack summary sentences with Equip Spells`);
}
console.log(`PASS deck filters Nov 24: Extra Deck pane in the split (solo + shared editor), Type support, card draw and Equip Spells, Collection › Packs filter, 8 languages (${checks} checks)`);
