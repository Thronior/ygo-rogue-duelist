// Genetic Override (user, 2026-11-24): Attribute Mutation + Unstable DNA fused. In the real core: your monsters have every
// Type and Attribute, the opponent's become the Type and Attribute picked at the first Draw Phase, and monsters you control
// gain 300 ATK for each monster on the field. Run: node android/test_genetic_override_nov24.mjs
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives
print(passives.script({'curses':[],'artifacts':['genetic_override'],'challenge_level':0,'character':0}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<26});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const mine=p=>e.query(p,L.MZONE).filter(Boolean);
const fill=n=>Array(40).fill(id(n)),asked=[];
e.start(fill('Mystical Elf'),fill('Celtic Guardian'),8000,8000,5,5,[],[],script);let summoned=-1;
for(let i=0;i<3000&&e.pending&&!e.finished&&e.turn<=1;i++){
 const m=e.pending;
 if(m.player===0&&m.type===M.ANNOUNCE_RACE){asked.push(['race',m.relic]);e.respond({type:R.ANNOUNCE_RACE,races:[0x2000n]});continue}
 if(m.player===0&&m.type===M.ANNOUNCE_ATTRIB){asked.push(['attribute',m.relic]);e.respond({type:R.ANNOUNCE_ATTRIB,attributes:[0x4]});continue}
 if(m.type===M.SELECT_IDLECMD&&m.player===0){
  if(summoned!==e.turn&&m.summons.length){summoned=e.turn;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0});continue}
  e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue;
 }
 e.respond(e.auto());
}
assert.deepEqual(e.errors,[],'no script errors');
assert.deepEqual(asked.map(a=>a[0]),['race','attribute'],'one Type, then one Attribute, asked once');
assert.ok(asked.every(a=>a[1]==='genetic_override'),'the prompts name the relic (the last pick is remembered as for Unstable DNA): '+JSON.stringify(asked));
const elf=mine(0).find(c=>c.code===id('Mystical Elf'));assert.ok(elf,'your monster is out');
assert.equal(Number(elf.race)&0x3ffffff,0x3ffffff,'your monster has every Type');assert.equal(elf.attribute&0x3f,0x3f,'and every Attribute');
const count=mine(0).length+mine(1).length;assert.equal(elf.attack,800+300*count,`+300 ATK for each of the ${count} monsters on the field`);
const theirs=[...e.query(1,L.HAND),...e.query(1,L.MZONE)].filter(Boolean);
assert.ok(theirs.length&&theirs.every(c=>Number(c.race)===0x2000&&c.attribute===0x4),"the opponent's monsters become the picked Type and Attribute");
// The recipe and offers (relic_fusions.py).
execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.')
import relic_fusions as f,content
S=['attribute_'+a for a in ('light','dark','fire','water','wind','earth')]
def fuse(a):
 run={'artifacts':list(a),'cursed_artifacts':[],'history_mode':'tag'};return [m['relic'] for m in f.fuse(run)],run
# Everything at once: Unstable DNA, then Attribute Mutation, then Genetic Override, in one go.
made,run=fuse(['dna_rewrite','kindred_bond']+S[:4])
assert made==['unstable_dna','attribute_mutation','genetic_override'] and run['artifacts']==['genetic_override'],(made,run['artifacts'])
assert run['fusion_events'][-1]=={'relic':'genetic_override','pieces':['attribute_mutation','unstable_dna']}
# Only one of the two fused relics: nothing more.
assert fuse(['attribute_mutation'])[0]==[] and fuse(['unstable_dna'])[0]==[]
# Owned: neither piece set is built again, and their pieces are no longer offered.
made,run=fuse(['genetic_override','dna_rewrite','kindred_bond']+S[:3])
assert made==[] and 'unstable_dna' not in run['artifacts'] and 'attribute_mutation' not in run['artifacts'] and not any(s in run['artifacts'] for s in S),run['artifacts']
o={'artifacts':['genetic_override']}
assert all(f.absorbed(o,k) for k in S+['dna_rewrite','kindred_bond']),'pieces of its pieces are not offered'
assert not f.absorbed({'artifacts':['attribute_mutation']},'dna_rewrite'),'before it, DNA Rewrite is still wanted for Unstable DNA'
name,price,text=content.ARTIFACTS['genetic_override']
assert name=='Genetic Override' and price==content.ARTIFACTS['attribute_mutation'][1]+content.ARTIFACTS['unstable_dna'][1]
assert 'Attribute Mutation' not in text and 'Unstable DNA' not in text,'no relic text names its pieces'
assert content.ART_INFO['genetic_override']['art']=='DNA Surgery'
`],{cwd:root,encoding:'utf8',stdio:'inherit'});
assert.equal(meta.artifactInfo.genetic_override.art,74701381,'DNA Surgery art');assert.deepEqual(meta.fusionMaterials.genetic_override,{pieces:['attribute_mutation','unstable_dna'],needed:2},'the app lists both fused relics as its Fusion Material');
console.log('PASS Genetic Override: every Type and Attribute for yours, the pick for the opponent, +300 per monster on the field; fuses from the two fused relics, their pieces not offered again');
