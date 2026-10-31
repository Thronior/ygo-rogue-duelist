// Settings → Effects and the Voice Lines / Menu Sounds channels: each option really stops its effect, and existing
// players keep their sound balance (voice and menu start at their Sound Effects level).
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),text=p=>fs.readFileSync(root+p,'utf8');
const classes=new Set();
globalThis.document={documentElement:{classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),contains:c=>classes.has(c)}},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]};
const {VISUAL_EFFECTS,effectOn,applyEffectOptions}=await import('./web/effect-options.js');
for(const [key] of VISUAL_EFFECTS)assert.equal(effectOn(key),true,key+' is on by default');
applyEffectOptions(['flames','shake']);assert.equal(effectOn('flames'),false);assert.equal(effectOn('lp'),true);assert.ok(classes.has('no-fx-flames'));
applyEffectOptions([]);assert.ok(!classes.has('no-fx-flames'));applyEffectOptions(undefined);assert.equal(effectOn('flames'),true);
// Every option is used by the code that draws it, so no toggle does nothing.
const code=['juice.js','duel-motion.js','mobile.css'].map(f=>text('android/web/'+f)).join('\n');
for(const [key] of VISUAL_EFFECTS)assert.ok(code.includes(`effectOn('${key}')`)||code.includes('.no-fx-'+key),key+' is wired up');
// Every voice goes through the Voice Lines level, not Sound Effects.
const mobile=text('android/web/mobile.js');
assert.match(mobile,/setEmoteVolumeReader\(\(\)=>state\?\.settings\?\.voice/);assert.match(mobile,/spoken\?state\?\.settings\?\.voice:state\?\.settings\?\.sound/);assert.match(text('android/web/juice.js'),/gain:loop\?\.55:voice\?1\.4:1,voice\}/);
// Saved settings: new channels follow the old Sound Effects value, then stand alone; junk is dropped.
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const out=execFileSync(python,['-B','-c',`
import sys,json,tempfile;from pathlib import Path;sys.path.insert(0,'.')
import storage;storage.ROOT=Path(tempfile.mkdtemp())
f=lambda v:(storage.write(storage.ROOT/'settings.json',v),storage.settings())[1]
print(json.dumps([f({'sound':55}),f({'sound':55,'voice':10,'menu':0,'effectsOff':['flames',3]}),f({'effectsOff':'flames','voice':900,'textSize':900,'reduceMotion':1})]))`],{cwd:root}).toString();
const [old,chosen,junk]=JSON.parse(out);
assert.deepEqual([old.voice,old.menu,old.effectsOff],[55,55,[]],'an existing save keeps its balance');
assert.deepEqual([chosen.sound,chosen.voice,chosen.menu,chosen.effectsOff],[55,10,0,['flames']]);
assert.deepEqual([junk.voice,junk.effectsOff],[100,[]]);
assert.deepEqual([old.textSize,old.reduceMotion],[100,false],'Display options start off');assert.deepEqual([junk.textSize,junk.reduceMotion],[150,true]);
// Vibration only reaches the native bridge while its option is on, and the row needs that bridge.
let pulses=0;globalThis.ShadowNative={vibrate:()=>pulses++};
globalThis.addEventListener=()=>{};
const {buzz}=await import('./web/juice.js');buzz(25);assert.equal(pulses,1);applyEffectOptions(['vibration']);buzz(25);assert.equal(pulses,1);applyEffectOptions([]);delete globalThis.ShadowNative;buzz(25);assert.match(mobile,/key!=='vibration'\|\|window\.ShadowNative\?\.vibrate/);
// The duel log marks turns and sides, and shows only cards already named in the text.
const {duelLogMarkup}=await import('./web/duel-log-ui.js');
const log=duelLogMarkup(['Turn 3 · Your turn','You summon Dark Magician.','Opponent takes 300 LP.'],[{id:46986414,name:'Dark Magician'}],id=>`card-${id}.jpg`);
assert.match(log,/<h4 class="log-turn">Turn 3 · Your turn<\/h4>/);assert.match(log,/class="log-action log-you"/);assert.match(log,/src="card-46986414\.jpg"/);assert.match(log,/class="log-event log-opponent"/);
console.log(`PASS ${VISUAL_EFFECTS.length} visual options, voice and menu channels, saved settings`);
