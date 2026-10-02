const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..')+'/';
const source=fs.readFileSync(root+'android/web/vendor/package/dist/index.js','utf8');
const start=source.indexOf('createDuel(E){'),end=source.indexOf(',duelNewCard',start);
const O=new Map(),D=Symbol('duel');let restored=0,destroyed=0,fail=false;
const c={stackSave:()=>0,stackAlloc:()=>1,stackRestore:()=>restored++,getValue:()=>123,_ocgapiCreateDuel:()=>fail?1:0,_ocgapiDestroyDuel:()=>destroyed++};
const core=new Function('O','D','c','Y','a','let r=0;return {'+source.slice(start,end)+'}')(O,D,c,()=>{},()=>{});
for(let i=0;i<500;i++){const h=core.createDuel({cardReader:()=>{},scriptReader:()=>{},errorHandler:()=>{}});assert.equal(O.size,1);core.destroyDuel(h);core.destroyDuel(h);assert.equal(O.size,0)}
fail=true;assert.equal(core.createDuel({}),null);assert.equal(O.size,0);assert.equal(restored,501);assert.equal(destroyed,500);
const events={},elementEvents={};let documentScans=0,targetScans=0;
const sandbox={navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},document:{documentElement:{classList:{toggle:()=>{}}},getAnimations:()=>{documentScans++;return[]},addEventListener:(n,f)=>events[n]=f},Element:class{animate(){return {playbackRate:1}}}};
vm.runInNewContext(fs.readFileSync(root+'android/web/animation-speed.js','utf8'),sandbox);
for(let i=0;i<500;i++)events.animationstart({target:{getAnimations:()=>{targetScans++;return[]}}});
assert.equal(documentScans,0);assert.equal(targetScans,500);assert.equal(new sandbox.Element().animate().playbackRate,1/1.2);
console.log('PASS 500 duel create/destroy cycles: zero retained callbacks; failure restores stack; animation events avoid document-wide scans');
let mediaCount=0,sourceCount=0,connections=0,plays=0;
class AudioMock{constructor(){mediaCount++;this.paused=true;this.ended=false;this.src='';this.events={}}addEventListener(n,f){(this.events[n]??=[]).push(f)}emit(n){for(const f of this.events[n]||[])f();this['on'+n]?.()}pause(){this.paused=true;this.emit('pause')}play(){plays++;this.paused=false;this.emit('play');return Promise.resolve()}load(){}removeAttribute(){this.src=''}}
class ContextMock{constructor(){this.state='running'}createDynamicsCompressor(){return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}}}createGain(){return {gain:{},connect(){},disconnect(){}}}createMediaElementSource(){sourceCount++;return {connect(){connections++},disconnect(){connections--}}}resume(){return Promise.resolve()}suspend(){return Promise.resolve()}}
const audioEnv={Audio:AudioMock,AudioContext:ContextMock,URL,location:{href:'https://example.test/'},document:{hidden:false,addEventListener(){}},state:{settings:{sound:70}},Math,clearTimeout(){},setTimeout(){return 1}};
const audioContext=vm.createContext(audioEnv);
vm.runInContext('const audioGains={};'+fs.readFileSync(root+'android/web/audio-balance.js','utf8').replace(/import[^\n]+\n/,'').replaceAll('export function','function'),audioContext);
const mobile=fs.readFileSync(root+'android/web/mobile.js','utf8');
vm.runInContext('let sfx=new Audio();'+mobile.slice(mobile.indexOf('let sfxStopTimer;'),mobile.indexOf('let musicContext='))+mobile.slice(mobile.indexOf('const packVoices='),mobile.indexOf('let audioSuspended=')),audioContext);
vm.runInContext("for(let i=0;i<500;i++){duelSound('attack');packSound('card-reveal')}sfx.pause();stopPackSounds();",audioContext);
assert.equal(mediaCount,5);assert.equal(sourceCount,5);assert.equal(connections,0);
console.log('PASS 1,000 sound requests use only five SFX media/source nodes and disconnect all stopped voices');
const beforeNodes=mediaCount,beforeSources=sourceCount;
vm.runInContext(mobile.slice(mobile.indexOf('const coinMilestones='),mobile.indexOf('function duelAnimationState')),audioContext);
vm.runInContext('for(let duel=0;duel<100;duel++){for(let reward=0;reward<20;reward++)playCoinPickup();stopCoinSounds()}',audioContext);
assert.equal(mediaCount-beforeNodes,3);assert.equal(sourceCount-beforeSources,3);assert.equal(connections,0);
console.log('PASS 2,000 coin rewards across 100 duels use three reusable audio sources; zero live connections after cleanup');

const audiblePlays=plays;
vm.runInContext("state.settings.sound=0;for(let i=0;i<100;i++){duelSound('attack');packSound('card-reveal');playCoinPickup()}state.settings.sound=70;document.hidden=true;for(let i=0;i<100;i++){duelSound('attack');packSound('card-reveal');playCoinPickup()}",audioContext);
assert.equal(plays,audiblePlays);
console.log('PASS muted/background audio requests do not start playback');
