// The official servers serve official releases only (user, 2026-11-24); self-hosted copies without a key serve anyone.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {officialBuild,rateLimited} from './official-build.mjs';

const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const KEY=publicKey.export({format:'jwk'}).x;
const sign=(id,key=privateKey)=>crypto.sign(null,Buffer.from(id),key).toString('base64url');
const at=(params='',path='/v2/create',headers={})=>new Request('https://worker.example'+path+(params?'?'+params:''),{method:'POST',headers});
const signed=(id,sig=sign(id))=>new URLSearchParams({b:id,s:sig}).toString();
const env={BUILD_PUBLIC_KEY:KEY};

test('a signed official build is let in; a fork, a bad signature and no ID are refused',async()=>{
 assert.equal(await officialBuild(at(signed('0.2.44+abcdef0123456789')),env),'official');
 const {privateKey:other}=crypto.generateKeyPairSync('ed25519');
 assert.equal(await officialBuild(at(signed('0.2.44+fork',sign('0.2.44+fork',other))),env),false,'signed with another key');
 assert.equal(await officialBuild(at(signed('0.2.44+changed',sign('0.2.44+abcdef0123456789'))),env),false,'signature of another build');
 assert.equal(await officialBuild(at('b=0.2.44%2Bx&s='),env),false,'unsigned fork build');
 assert.equal(await officialBuild(at(),env),false,'no build ID at all');
});

test('without a key (a self-hosted copy) every build is let in',async()=>{
 assert.equal(await officialBuild(at(),{}),'official');
 assert.equal(await officialBuild(at('b=fork&s='),{BUILD_PUBLIC_KEY:''}),'official');
});

test('older releases without an ID get in only before UNSIGNED_UNTIL; a bad signature never does',async()=>{
 const now=Date.parse('2026-11-30T00:00:00Z');
 assert.equal(await officialBuild(at(),{...env,UNSIGNED_UNTIL:'2026-12-07T00:00:00Z'},now),'unsigned');
 assert.equal(await officialBuild(at(),{...env,UNSIGNED_UNTIL:'2026-11-29T00:00:00Z'},now),false);
 assert.equal(await officialBuild(at('b=x&s=y'),{...env,UNSIGNED_UNTIL:'2026-12-07T00:00:00Z'},now),false);
});

test('a revoked build is refused even with a valid signature',async()=>{
 const id='0.2.44+leaked0000000000';
 assert.equal(await officialBuild(at(signed(id)),{...env,REVOKED_BUILDS:'0.2.40+a, '+id}),false);
});

test('one address is cut off past the per-minute limit, others are not',()=>{
 const now=Date.parse('2026-11-30T00:00:10Z'),a=at('','/x',{'CF-Connecting-IP':'203.0.113.9'}),b=at('','/x',{'CF-Connecting-IP':'203.0.113.10'});
 for(let i=0;i<5;i++)assert.equal(rateLimited(a,5,now),false);
 assert.equal(rateLimited(a,5,now),true,'sixth request in the minute');
 assert.equal(rateLimited(b,5,now),false,'another address');
 assert.equal(rateLimited(a,5,now+60000),false,'the next minute');
});

test('each Worker refuses an unofficial build before touching storage, and lets the official one through',async()=>{
 const id='0.2.44+abcdef0123456789',ok=signed(id);
 const rooms=(await import('../cloudflare/worker.mjs')).default;
 const roomsEnv={...env,ADMIN_TOKEN:'t0ken',ROOMS:{idFromName:()=>1,get:()=>({fetch:async()=>new Response('{}')})}};
 let r=await rooms.fetch(at('','/status'),roomsEnv,{});assert.equal(r.status,426);assert.equal((await r.json()).unofficial,true);
 r=await rooms.fetch(at(ok,'/status'),roomsEnv,{});assert.equal(r.status,200);
 r=await rooms.fetch(new Request('https://worker.example/health'),roomsEnv,{});assert.equal(r.status,200,'health is open');

 let touched=0;
 const stats=(await import('../global-stats/worker.mjs')).default;
 const statsEnv={...env,STATS:{idFromName:()=>1,get:()=>({fetch:async()=>{touched++;return new Response('{}')}})}};
 r=await stats.fetch(at('','/v2/stats'),statsEnv,{});assert.equal(r.status,426);assert.equal(touched,0,'refused before the stats object');
 r=await stats.fetch(at(ok,'/v2/stats'),statsEnv,{});assert.equal(r.status,200);assert.equal(touched,1);

 const replays=(await import('../replays/worker.mjs')).default;
 r=await replays.fetch(at('','/v1/replays'),{...env,REPLAY_ADMIN_TOKEN:'adm'},{});assert.equal(r.status,426);
 r=await replays.fetch(new Request('https://worker.example/v1/replays/export?after=x',{headers:{Authorization:'Bearer adm'}}),{...env,REPLAY_ADMIN_TOKEN:'adm'},{});
 assert.equal(r.status,400,'the maintainer export passes the build check with its token (then fails on its bad cursor)');
});
