import assert from 'node:assert/strict';
import {newerVersion,checkAndroidUpdate,startupAndroidUpdate} from '../android/web/android-update.js';
assert(newerVersion('v0.1.41','0.1.40'));assert(newerVersion('v0.2.0','0.1.99'));
assert(!newerVersion('v0.1.40','0.1.40'));assert(!newerVersion('v0.1.39','0.1.40'));assert(!newerVersion('invalid','0.1.40'));
const mock=(tag='v0.1.41',assets=[{name:'YGO-Rogue-Android.apk'}])=>async url=>({ok:true,json:async()=>url==='build.json'?{version:'0.1.40'}:{tag_name:tag,assets}});
assert.equal((await checkAndroidUpdate(mock())).available,true);
assert.equal((await checkAndroidUpdate(mock('v0.1.40'))).available,false);
await assert.rejects(()=>checkAndroidUpdate(mock('v0.1.41',[])),/No Android update/);
await assert.rejects(()=>checkAndroidUpdate(async()=>({ok:false})),/Could not/);
await assert.rejects(()=>checkAndroidUpdate(async()=>{throw Error('offline')}),/offline/);
console.log('PASS newer/equal/older/invalid versions, missing APK, HTTP failure and offline handling');

let checks=0,prompts=[];
const options={native:{openUpdate(){}},online:true,check:async()=>{checks++;return {available:true,latest:'v0.1.41'}},prompt:v=>prompts.push(v)};
await startupAndroidUpdate({...options,online:false});await startupAndroidUpdate({...options,native:null});assert.equal(checks,0);
await startupAndroidUpdate(options);assert.deepEqual(prompts,['0.1.41']);
await startupAndroidUpdate({...options,check:async()=>({available:false})});
await startupAndroidUpdate({...options,check:async()=>{throw Error('offline')}});assert.equal(prompts.length,1);
console.log('PASS boot prompt: Android/online only, version displayed, no prompt when current, silent network failure');
