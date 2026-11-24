// Linux report 2026-11-24: WebKitGTK without GStreamer's plugins rejects every decodeAudioData with "Decoding failed",
// and boot step 6 (preloadSoundEffects) used to throw it, so the game never started. Now the preload reports the
// failures and resolves, an undecodable file is not downloaded again on every play, and the boot report names the
// Linux app and the step that failed.
import assert from 'node:assert/strict';

let fetches=0;
globalThis.location={href:'https://game.example/'};globalThis.document={hidden:false,addEventListener(){}};
globalThis.fetch=async()=>{fetches++;return {ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(8)}};
class FakeContext{
 constructor(){this.state='running';this.destination={}}
 node(){return {connect(){},disconnect(){},gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}},threshold:{value:0},knee:{value:0},ratio:{value:1},attack:{value:0},release:{value:0}}}
 createDynamicsCompressor(){return this.node()}createGain(){return this.node()}
 createBufferSource(){return {...this.node(),start(){},stop(){},playbackRate:{value:1}}}
 resume(){return Promise.resolve()}suspend(){return Promise.resolve()}
 decodeAudioData(){const e=new Error('Decoding failed');e.name='EncodingError';return Promise.reject(e)}
}
globalThis.AudioContext=FakeContext;

const {preloadSoundEffects,bufferedEffects}=await import('./web/audio-balance.js');
const result=await preloadSoundEffects(['assets/sfx/a.wav','assets/sfx/b.mp3','assets/sfx/c.wav']);
assert.deepEqual([result.undecodable,result.failed],[3,0],'every file is reported, none throws');
assert.match(result.first,/Decoding failed/);
assert.equal(fetches,3);

// Playing one of them later does not download and decode it again.
const sounds=bufferedEffects({a:'assets/sfx/a.wav'},()=>1);
sounds.play('a');await new Promise(r=>setTimeout(r,10));
assert.equal(fetches,3,'an undecodable sound is remembered');

// A download failure is not remembered: it may work next time.
let fail=true;globalThis.fetch=async()=>{fetches++;if(fail)throw new TypeError('Load failed');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
const offline=await preloadSoundEffects(['assets/sfx/d.wav']);
assert.deepEqual([offline.undecodable,offline.failed],[0,1]);
fail=false;const again=await preloadSoundEffects(['assets/sfx/d.wav']);
assert.equal(again.undecodable,1,'retried after a network failure (then failed to decode)');

// The boot report names the desktop app and the failed step.
const {details}=await import('./web/boot-diagnostics.js');
const nav={userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/60.5 Safari/605.1.15 YGORogueDuelistLinux/1',language:'en-US'};
const linux=details({version:'0.2.44',error:new Error('x'),nav,native:true,desktop:'linux',stage:'sounds'});
assert.match(linux,/Linux app/);assert.match(linux,/Failed at: preparing sound effects/);assert.doesNotMatch(linux,/Android app/);
assert.match(details({version:'0.2.44',error:'x',nav,native:true,desktop:'windows'}),/Windows app/);
assert.match(details({version:'0.2.44',error:'x',nav,native:true}),/Android app/);
// Every UA says Mozilla, AppleWebKit and "like Gecko"; the Linux app is named by its own token, not read as Safari.
assert.match(linux,/Browser: WebKitGTK \(Linux app\)/);
assert.match(details({version:'0.2.44',error:'x',nav:{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'}}),/Browser: Chrome 131/);
assert.match(details({version:'0.2.44',error:'x',nav:{userAgent:'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0'}}),/Browser: Firefox 133/);
assert.match(details({version:'0.2.44',error:'x',nav:{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'}}),/Browser: Safari 18.1/);
console.log('PASS sound decode failures: boot continues, undecodable sounds are remembered, boot report names the app and step');
