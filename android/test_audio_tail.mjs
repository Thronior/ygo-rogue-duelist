// Linux report 2026-11-24: "the sounds kind of cut off early". Sound elements play through Web Audio, and the code
// disconnected them the moment "ended" fired; WebKitGTK fires it while the end is still buffered, so the tail was cut.
// The element now stays connected for a moment after it stops.
import assert from 'node:assert/strict';

globalThis.location={href:'https://game.example/'};globalThis.document={hidden:false,addEventListener(){}};
const log=[];
class FakeContext{
 constructor(){this.state='running';this.destination={}}
 node(name){return {name,connect(){log.push('connect '+name)},disconnect(){log.push('disconnect '+name)},gain:{value:1},threshold:{value:0},knee:{value:0},ratio:{value:1},attack:{value:0},release:{value:0}}}
 createDynamicsCompressor(){return this.node('master')}createGain(){return this.node('gain')}
 createMediaElementSource(){return this.node('source')}
 resume(){return Promise.resolve()}suspend(){return Promise.resolve()}
}
globalThis.AudioContext=FakeContext;
const listeners={};
const audio={src:'https://game.example/assets/sfx/flip.wav',currentSrc:'',paused:false,ended:false,volume:1,load(){},pause(){this.paused=true},
 addEventListener(name,fn){(listeners[name]??=[]).push(fn)}};
const fire=name=>(listeners[name]||[]).forEach(fn=>fn());

const {balancedVolume}=await import('./web/audio-balance.js');
balancedVolume(audio,1);
assert.ok(log.includes('connect source'),'a playing element is connected');
log.length=0;
audio.ended=true;audio.paused=true;fire('ended');
assert.ok(!log.includes('disconnect source'),'not disconnected the moment it ends');
await new Promise(r=>setTimeout(r,700));
assert.ok(log.includes('disconnect source'),'disconnected a moment later');

// Played again within the moment: it stays connected.
log.length=0;audio.ended=false;audio.paused=false;fire('play');
audio.paused=true;fire('pause');audio.paused=false;fire('play');
await new Promise(r=>setTimeout(r,700));
assert.ok(!log.includes('disconnect source'),'a sound that started again is not cut');
console.log('PASS audio tail: sound elements stay connected briefly after they stop, so WebKitGTK keeps their end');
