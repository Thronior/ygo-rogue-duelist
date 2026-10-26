import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';
// The audio graph registers page listeners on import; the mapping under test needs none.
globalThis.document??={hidden:false,addEventListener(){}};
const {cueSounds,duelSoundPath,duelSoundProfiles,duelSoundEmphasis}=await import('./web/duel-sfx.js');
const web=fileURLToPath(new URL('./web/',import.meta.url)),startup=JSON.parse(fs.readFileSync(web+'startup-assets.json','utf8')).audio;
// WAV length from the RIFF header: data bytes / byte rate.
function seconds(path){
 const b=fs.readFileSync(web+path);let pos=12,rate=0;
 while(pos<b.length){const id=b.toString('ascii',pos,pos+4),size=b.readUInt32LE(pos+4);if(id==='fmt ')rate=b.readUInt32LE(pos+16);if(id==='data')return size/rate;pos+=8+size+(size&1)}
 throw Error('No data chunk: '+path);
}
const L={DECK:1,HAND:2,MZONE:4,SZONE:8,GRAVE:16,REMOVED:32};
const cues=[
 {kind:'turn'},{kind:'phase',phase:4},{kind:'draw'},{kind:'set'},{kind:'attack'},
 {kind:'summon',method:'normal'},{kind:'summon',method:'special'},{kind:'summon',method:'flip'},{kind:'summon'},
 {kind:'flip-reveal'},{kind:'reveal'},
 {kind:'move',to:{location:L.GRAVE}},{kind:'move',to:{location:L.REMOVED}},
 {kind:'lp',amount:500},{kind:'lp',amount:-500},{kind:'lp',amount:-500,cost:true},{kind:'lp',amount:-1200,directDamage:true},
 {kind:'chain',stage:'activate'},{kind:'chain',stage:'resolve'},{kind:'chain',stage:'negated'},
 {kind:'fusion-summon'},{kind:'signature-summon'},{kind:'lethal-hit'},
 {kind:'effect-action',text:'+1 counter',increase:true},{kind:'effect-action',text:'−1 counter',increase:false},{kind:'effect-action',text:'Equipped'},
 {kind:'effect-action',text:'Deck shuffled'},{kind:'effect-action',text:'Effect target selected'},{kind:'effect-action',text:'Random card selected',random:true},
 {kind:'effect-action',text:'Attack negated',negated:true},{kind:'effect-action',text:'ATK 1000 → 1500',statChange:true},
];
const used=new Set();
for(const cue of cues)for(const removal of [null,'destroy','tribute'])for(const [name,gain,options={}] of cueSounds(cue,cue.kind==='move'?removal:null)){
 used.add(name);
 assert(gain>0&&gain<=.6,`${cue.kind} gain ${gain}`);
 assert(Object.keys(options).every(k=>['duration','delay','rate'].includes(k)),cue.kind);
}
// Every cue sound ships, is decoded at startup, and its trim fits inside the file.
for(const name of used){
 const path=duelSoundPath(name),length=seconds(path),{offset=0,duration=0}=duelSoundProfiles[name]||{};
 assert(startup.includes(path),`${path} is not preloaded at startup`);
 assert(!offset||offset<length-.1,`${name} offset ${offset}s exceeds ${length.toFixed(2)}s`);
 assert(!duration||offset+duration<=length+.05,`${name} plays past its end`);
}
console.log('PASS',used.size,'duel sounds exist, preload at startup and trim within their files');
// The core mapping the animations rely on.
const first=(cue,removal)=>cueSounds(cue,removal)[0]?.[0];
assert.equal(first({kind:'move',to:{location:L.GRAVE}},'destroy'),'destroyed');
assert.equal(first({kind:'summon',method:'special'}),'specialsummon');
assert.equal(first({kind:'summon',method:'normal'}),'summon');
assert.equal(first({kind:'lp',amount:300}),'gainlp');
assert.equal(first({kind:'lp',amount:-300}),'damage');
assert.deepEqual(cueSounds({kind:'lp',amount:-300,directDamage:true}).map(x=>x[0]),['attack','damage']);
assert.equal(first({kind:'chain',stage:'negated'}),'negation');
assert.deepEqual(cueSounds({kind:'effect-action',statChange:true,text:'ATK'}),[],'stat counters already tick');
assert.deepEqual(cueSounds({kind:'announcement',text:'Opponent guessed Monster'}),[]);
// Destroy used to be cut 200 ms after a 160 ms silent lead-in; it must now carry its impact.
assert((duelSoundProfiles.destroyed.offset||0)>=.12&&duelSoundProfiles.destroyed.duration>=.5);
assert.equal(duelSoundEmphasis(.3),1);assert.equal(duelSoundEmphasis(.15),.5);assert.equal(duelSoundEmphasis(.6),1);
console.log('PASS cue sound mapping: destroy, summon kinds, LP gain/loss, direct hits, negation and silent stat ticks');
