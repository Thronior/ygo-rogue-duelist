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

// Chinese players ask the GitHub mirror first; others use it only when the API fails (Discord, 2026-11-21).
const calls=[];const routed=(apiOk=true)=>async url=>{calls.push(url);
 if(url==='build.json')return {ok:true,json:async()=>({version:'0.1.40'})};
 if(url.startsWith('https://api.github.com/'))return apiOk?{ok:true,json:async()=>({tag_name:'v0.1.41',assets:[{name:'YGO-Rogue-Android.apk'}]})}:{ok:false};
 assert.match(url,/^https:\/\/gh-proxy\.org\/https:\/\/github\.com\/.*release-manifest\.json\?t=\d+$/);
 return {ok:true,json:async()=>({version:'0.1.42',files:{'YGO-Rogue-Android.apk':{}}})};};
assert.equal((await checkAndroidUpdate(routed(),'zh')).latest,'v0.1.42');assert.match(calls.filter(u=>u!=='build.json')[0],/gh-proxy/);
calls.length=0;assert.equal((await checkAndroidUpdate(routed(),'en')).latest,'v0.1.41');assert(!calls.some(u=>u.includes('gh-proxy')));
assert.equal((await checkAndroidUpdate(routed(false),'en')).latest,'v0.1.42');
let asked;await startupAndroidUpdate({native:{openUpdate(){}},online:true,language:'zh',check:async(_,language)=>{asked=language;return {available:false}},prompt(){}});assert.equal(asked,'zh');
console.log('PASS Chinese checks the mirror first, others fall back to it when the GitHub API fails');
