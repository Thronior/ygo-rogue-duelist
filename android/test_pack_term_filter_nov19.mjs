// Pack details summary links (CITYDRIVER on Discord, 2026-11-19): every Type, Attribute, archetype and Support theme the
// summary names is a link on its English id, translated text in every language, and finds that pack's own cards.
// Usage: runtime/ai/node.exe android/test_pack_term_filter_nov19.mjs
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const web=path.join(path.dirname(fileURLToPath(import.meta.url)),'web');
const content=JSON.parse(fs.readFileSync(path.join(web,'content.json'),'utf8'));

// i18n.js without a DOM, as in tools/i18n/add_nov18_pack_summary_terms.mjs.
globalThis.localStorage={getItem:()=>null,setItem(){}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['en'],language:'en'}});
globalThis.MutationObserver=class{observe(){}disconnect(){}};globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.document={documentElement:{lang:''},body:{nodeType:1,closest:()=>null,getAttribute:()=>null,querySelectorAll:()=>[]},title:'',createTreeWalker:()=>({nextNode:()=>null})};
globalThis.fetch=async p=>{const m=/i18n\/([a-z]{2})\.json/.exec(String(p));return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(web,`i18n/${m[1]}.json`),'utf8'))}};
const url=f=>pathToFileURL(path.join(web,f)).href;
const i18n=await import(url('i18n.js'));
const {packSummaryParts,packTermMatcher}=await import(url('pack-summary.js'));
const {packSummary}=await import(url('experience-ui.js'));
const {packSummaryHtml,translateWith}=await import(url('card-links.js'));
const {allCardsPackDescription}=await import(url('pack-inspection.js'));

const byId=new Map(content.cards.map(c=>[c.id,c]));
const links=html=>[...html.matchAll(/data-pack-term="(\w+)" data-value="([^"]*)"[^>]*>([^<]*)</g)].map(([,kind,value,text])=>({kind,value,text}));
const packCards=p=>[...new Set([...(p.common||[]),...(p.rare||[])])].map(id=>byId.get(id)).filter(Boolean);
let checked=0,linked=0;

for(const p of content.packs){
 const parts=packSummaryParts(content,p.id);if(!parts)continue;
 const html=packSummaryHtml(parts,allCardsPackDescription(p)),found=links(html),cards=packCards(p);
 // English text without tags reads as the summary did before (minus the Puzzle packs' shorter form).
 if(!allCardsPackDescription(p))assert.equal(html.replace(/<[^>]+>/g,'').replace(/&#39;/g,"'"),packSummary(content,p.id),p.id);
 const expected=allCardsPackDescription(p)?parts.series.length:parts.types.length+parts.attributes.length+parts.series.length+parts.themes.length;
 assert.equal(found.length,expected,`${p.id}: one link per term`);
 for(const {kind,value} of found){
  const hits=cards.filter(packTermMatcher(content,kind,value));
  assert.ok(hits.length>0,`${p.id}: ${kind} ${value} finds cards in the pack`);
  if(kind==='race')assert.ok(hits.every(c=>c.race===value&&c.data.type&1));
  linked++;
 }
 checked++;
}
assert.ok(checked>50,'most packs have a summary');

// A Type link narrows the list to exactly that pack's monsters of the Type.
const spell=content.packs.find(p=>packSummaryParts(content,p.id)?.types.includes('Spellcaster')&&!allCardsPackDescription(p));
assert.ok(spell,'some pack names Spellcaster');
const all=packCards(spell),casters=all.filter(packTermMatcher(content,'race','Spellcaster'));
assert.equal(casters.length,all.filter(c=>c.data.type&1&&c.race==='Spellcaster').length);
assert.ok(casters.length<all.length,'the filter shrinks the list');

// Archetypes follow the summary's rule plus setcode membership (data/archetypes.json), e.g. Archfiend support.
const archfiend=packTermMatcher(content,'series','Archfiend');
assert.ok(archfiend(content.cards.find(c=>c.name==='Pandemonium')),'Pandemonium counts for Archfiend');
assert.ok(!archfiend(content.cards.find(c=>c.name==='Dark Magician')),'Dark Magician is no Archfiend');
assert.ok(packTermMatcher(content,'theme','Fusion Summoning')(content.cards.find(c=>c.name==='Polymerization')),'Polymerization under Fusion Summoning');

// Dartz's draft pack names Attributes instead of Types.
const dartz=packSummaryParts(content,'DRAFT-DARTZ');
if(dartz){const found=links(packSummaryHtml(dartz));assert.deepEqual(found.filter(x=>x.kind==='attribute').map(x=>x.value),['LIGHT','DARK'])}

// Every language: shown text translated, data-value stays the English id the matcher reads.
for(const lang of ['de','es','fr','it','ja','ko','pt','zh']){
 await i18n.setLanguage(lang,{remember:false});i18n.attachContent(content);
 const html=packSummaryHtml(packSummaryParts(content,spell.id)),found=links(html);
 const caster=found.find(x=>x.kind==='race'&&x.value==='Spellcaster');
 assert.ok(caster,`${lang}: Spellcaster link`);assert.notEqual(caster.text,'Spellcaster',`${lang}: Type shown translated`);
 assert.ok(!/Main monster types|Support:/.test(html),`${lang}: labels translated`);
 assert.ok(html.includes(String(packSummaryParts(content,spell.id).count)),`${lang}: card count kept`);
 const chip=translateWith('Showing only {0}','<b>X</b>');
 assert.ok(chip.includes('<b>X</b>')&&!chip.includes('Showing only'),`${lang}: chip translated (${chip})`);
 if(dartz)assert.equal(links(packSummaryHtml(dartz)).filter(x=>x.kind==='attribute').length,2,`${lang}: Dartz Attribute links`);
}
console.log(`PASS ${checked} pack summaries, ${linked} term links each find their pack's cards; filter narrows; 8 languages link on English ids`);
