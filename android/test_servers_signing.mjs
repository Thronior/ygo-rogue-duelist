// Every request to this build's servers carries its signed build ID (servers.js, 2026-11-24); other hosts are untouched,
// and all three addresses come from multiplayer-config.json.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const seen=[],sockets=[];
globalThis.fetch=async(input)=>{seen.push(typeof input==='string'?input:input.url);return new Response('{}')};
globalThis.WebSocket=class{constructor(url,protocols){sockets.push([url,protocols])}};
globalThis.WebSocket.OPEN=1;
const {servers,signedURL}=await import('./web/servers.js');
const {officialBuild}=await import('./web/official-build.js');
const config=JSON.parse(fs.readFileSync(new URL('./web/multiplayer-config.json',import.meta.url),'utf8'));
assert.deepEqual(servers,{rooms:config.signalingUrl,replays:config.replaysUrl,stats:config.statsUrl},'addresses come from multiplayer-config.json');

const params=url=>Object.fromEntries(new URL(url).searchParams);
await fetch(servers.rooms+'/v2/create');
await fetch(new URL(servers.stats+'/v2/stats'));
await fetch(new Request(servers.replays+'/v1/replays/batch',{method:'POST',body:'x'}));
await fetch('https://api.github.com/repos/x/y/releases/latest');
await fetch(servers.rooms+'/v2/poll?after=3');
for(const url of [seen[0],seen[1],seen[2]])assert.deepEqual(params(url),{b:officialBuild.id,s:officialBuild.sig},url);
assert.equal(seen[3],'https://api.github.com/repos/x/y/releases/latest','other hosts are untouched');
assert.deepEqual(params(seen[4]),{after:'3',b:officialBuild.id,s:officialBuild.sig},'existing parameters are kept');

new WebSocket(servers.rooms.replace(/^http/,'ws')+'/v3/hub',['shadowrun','room.ABCDE']);
assert.deepEqual(params(sockets[0][0]),{b:officialBuild.id,s:officialBuild.sig},'the room hub socket is signed too');
assert.deepEqual(sockets[0][1],['shadowrun','room.ABCDE'],'socket protocols are kept');
assert.equal(signedURL(servers.rooms+'/x?b=already&s=set'),servers.rooms+'/x?b=already&s=set','a signed URL is not signed twice');
assert.equal(signedURL('http://'+new URL(servers.rooms).host+'/x'),null,'plain http is never signed');

// The page's security policy lists exactly these servers (written by tools/build_android.py).
const html=fs.readFileSync(new URL('./web/index.html',import.meta.url),'utf8');
for(const url of Object.values(servers))assert.ok(html.includes(new URL(url).origin),'CSP allows '+url);
assert.ok(html.includes('wss://'+new URL(servers.rooms).host),'CSP allows the room hub socket');
console.log('PASS signed build ID on every server request (fetch, Request, URL, WebSocket), other hosts untouched, addresses from multiplayer-config.json');
