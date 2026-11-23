// Fusion hints (user, 2026-11-22): a piece of a discovered fusion names the fused relic with "You own N of M"; an
// undiscovered fusion shows as a silhouette named "???" with the same count (user, 2026-11-23), and relicCard carries the hint
// everywhere it is used.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
globalThis.document??={addEventListener(){}};globalThis.localStorage??={getItem(){return null},setItem(){}};
const {fusionHint,setFusionState,relicCard}=await import('./web/relic-inspect.js');
const fused=Object.keys(content.fusionMaterials).find(k=>content.fusionMaterials[k].pieces.length===2);
const [piece,other]=content.fusionMaterials[fused].pieces,name=content.artifacts[fused][0];
setFusionState(()=>({found:[],owned:[piece]}));
{const h=fusionHint(content,piece);assert(h.includes('fusion-hint fusion-unknown')&&h.includes('<b data-no-i18n>???</b><em>You own 1 of 2</em>')&&!h.includes(name.replace(/&/g,'&amp;').replace(/'/g,'&#39;')),h)}
setFusionState(()=>({found:[fused],owned:[piece]}));
assert(fusionHint(content,piece).includes(`Fusion Material for</small><b>${name.replace(/&/g,'&amp;').replace(/'/g,'&#39;')}</b><em>You own 1 of 2</em>`),fusionHint(content,piece));
assert.match(relicCard(content,other),/fusion-hint/,'relicCard shows it');
assert.equal(fusionHint(content,fused),'','the fused relic itself has no hint');
setFusionState(()=>({found:[fused],owned:[fused]}));
assert.match(fusionHint(content,piece),/Fused this run/);
setFusionState(()=>({found:[fused],owned:null}));
assert.doesNotMatch(fusionHint(content,piece),/<em>/,'outside a run: no count');
console.log('PASS fusion hints on piece relics: discovered by name, undiscovered as a ??? silhouette');
